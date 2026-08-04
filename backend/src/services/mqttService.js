import mqtt from 'mqtt';
import { mqttConfig, mqttTopic } from '../config/mqtt.js';
import { getIO } from '../socket/socket.js';
import Device from '../models/Device.js';
import SensorHistory from '../models/SensorHistory.js';
import SystemStats from '../models/SystemStats.js';
import Alarm from '../models/Alarm.js';

const devices = new Map();
const MAX_HISTORY = 100;
let mqttClient = null;

// MQTT Statistics
let stats = {
  totalMessages: 0,
  firstPacketTime: null,
  reconnectAttempts: 0,
  messagesPerSecond: 0,
};

let messagesThisSecond = 0;
setInterval(() => {
  stats.messagesPerSecond = messagesThisSecond;
  messagesThisSecond = 0;
}, 1000);

const getIndianTimestamp = () => {
  return new Date().toLocaleString('sv-SE', { timeZone: 'Asia/Kolkata' }).replace(' ', 'T') + '+05:30';
};

// Background Insert Queue
let insertQueue = [];
let pendingDeviceUpdates = new Map();

export const loadDevicesIntoCache = async () => {
  try {
    const dbDevices = await Device.find({}).lean();
    dbDevices.forEach(d => {
      // Initialize history to empty array in cache, will fetch from DB on demand for API
      d.history = []; 
      devices.set(d.deviceId, d);
    });
    console.log(`✓ Loaded ${dbDevices.length} devices into memory cache`);
    
    const dbStats = await SystemStats.findOne({}).lean();
    if (dbStats) {
      stats.totalMessages = dbStats.totalMessages;
      stats.firstPacketTime = dbStats.createdAt;
    }
  } catch (error) {
    console.error('Failed to load devices into cache:', error);
  }
};

// Batch Processor (Background Sync)
setInterval(async () => {
  // 1. Drain sensor history insert queue
  if (insertQueue.length > 0) {
    const batch = [...insertQueue];
    insertQueue = [];
    try {
      console.log('\n[Database] Saving Sensor History...');
      await SensorHistory.insertMany(batch);
      console.log('[Database] History Saved');
      await SystemStats.updateOne(
        {},
        {
          $inc: { totalMessages: batch.length, todayMessages: batch.length },
          $set: { lastPacketTime: new Date() }
        },
        { upsert: true }
      );
    } catch (error) {
      console.error('[Database] Failed to batch insert sensor history:\n', error.stack || error);
      // Connection recovery: requeue
      insertQueue = [...batch, ...insertQueue];
    }
  }

  // 2. Drain pending device updates
  if (pendingDeviceUpdates.size > 0) {
    const devicesToUpdate = Array.from(pendingDeviceUpdates.values());
    pendingDeviceUpdates.clear();
    try {
      console.log('\n[Database] Saving Device(s)...');
      const bulkOps = devicesToUpdate.map(d => ({
        updateOne: {
          filter: { deviceId: d.deviceId },
          update: { $set: d },
          upsert: true
        }
      }));
      await Device.bulkWrite(bulkOps);
      console.log('[Database] Device(s) Saved');
    } catch (error) {
      console.error('[Database] Failed to batch update devices:\n', error.stack || error);
      // Connection recovery: requeue
      devicesToUpdate.forEach(d => pendingDeviceUpdates.set(d.deviceId, d));
    }
  }
}, 5000);

// Device status check loop
setInterval(async () => {
  const now = Date.now();
  let changed = false;
  
  for (const [deviceId, device] of devices.entries()) {
    let newStatus = 'Offline';
    const age = now - new Date(device.lastSeen).getTime();
    
    if (age < 35000) newStatus = 'Online';
    else if (age < 60000) newStatus = 'Warning';
    
    if (device.status !== newStatus) {
      device.status = newStatus;
      changed = true;
      
      // Save alarm if going Offline or Warning
      if (newStatus !== 'Online') {
        try {
          await Alarm.create({
            deviceId,
            type: newStatus,
            message: `Device is now ${newStatus}`
          });
        } catch(err) {
          console.error('Failed to create alarm', err);
        }
      }
      
      pendingDeviceUpdates.set(deviceId, device);

      try {
        const io = getIO();
        io.emit('deviceStatusChanged', { deviceId, status: newStatus });
        console.log(`[Socket.IO] deviceStatusChanged emitted for ${deviceId} to ${newStatus}`);
      } catch (err) {}
    }
  }

  if (changed) {
    try {
      const io = getIO();
      io.emit('deviceListUpdated', getDeviceList());
      console.log('[Socket.IO] deviceListUpdated emitted');
    } catch (err) {}
  }
}, 2000);

const validateSensors = (sensors) => {
  if (!sensors) return false;
  if (sensors.Humidity !== undefined && (sensors.Humidity < 0 || sensors.Humidity > 100)) return false;
  if (sensors.Temperature !== undefined && (sensors.Temperature < -20 || sensors.Temperature > 80)) return false;
  if (sensors.AQI !== undefined && (sensors.AQI < 0 || sensors.AQI > 500)) return false;
  if (sensors.CO2 !== undefined && (sensors.CO2 < 0 || sensors.CO2 > 10000)) return false;
  if (sensors.VOC !== undefined && sensors.VOC < 0) return false;
  if (sensors.NOX !== undefined && sensors.NOX < 0) return false;
  
  const pm1 = sensors.PM1_0 !== undefined ? sensors.PM1_0 : sensors['PM1.0'];
  const pm25 = sensors.PM2_5 !== undefined ? sensors.PM2_5 : sensors['PM2.5'];
  const pm4 = sensors.PM4_0 !== undefined ? sensors.PM4_0 : sensors['PM4.0'];
  const pm10 = sensors.PM10;
  
  if (pm1 !== undefined && pm1 < 0) return false;
  if (pm25 !== undefined && pm25 < 0) return false;
  if (pm4 !== undefined && pm4 < 0) return false;
  if (pm10 !== undefined && pm10 < 0) return false;

  return true;
};

export const initMqttService = () => {
  const brokerUrl = `${mqttConfig.protocol}://${mqttConfig.host}:${mqttConfig.port}`;
  
  mqttClient = mqtt.connect(brokerUrl, {
    username: mqttConfig.username,
    password: mqttConfig.password,
    clientId: mqttConfig.clientId,
    reconnectPeriod: mqttConfig.reconnectPeriod,
    connectTimeout: mqttConfig.connectTimeout,
    rejectUnauthorized: mqttConfig.rejectUnauthorized
  });

  mqttClient.on('connect', () => {
    console.log('✓ MQTT Connected');
    mqttClient.subscribe(mqttTopic, (err, granted) => {
      if (err) {
        console.error("Subscription error:", err);
        return;
      }
      console.log("Granted:", granted);
    });
  });

  mqttClient.on('reconnect', () => {
    stats.reconnectAttempts++;
    console.log(`[MQTT] Reconnect Success. Attempts: ${stats.reconnectAttempts}`);
  });

  mqttClient.on('close', () => {
    console.log(`[MQTT] Connection Lost`);
  });

  mqttClient.on('offline', () => {});

  mqttClient.on('error', (err) => {
    console.error('MQTT Error:', err);
  });

  mqttClient.on('message', (topic, message, packet) => {
    console.log(`\n========== MQTT MESSAGE ==========`);
    console.log(`Topic: ${topic}`);
    console.log(`Payload: ${message.toString()}`);
    console.log(`Timestamp: ${getIndianTimestamp()}`);
    console.log(`==================================\n`);

    try {
      const payloadString = message.toString();
      console.log(`Raw payload: ${payloadString}`);
      const payload = JSON.parse(payloadString);
      console.log(`Parsed JSON:`, payload);
      
      const deviceId = payload.deviceId || 'Unknown';
      console.log(`Device ID: ${deviceId}`);
      
      if (!validateSensors(payload.sensors)) {
        console.warn(`[MQTT] Warning: Invalid sensor data received from ${payload.deviceId || 'Unknown'}, ignoring packet.`);
        return;
      }
      
      messagesThisSecond++;
      stats.totalMessages++;
      if (!stats.firstPacketTime) {
        stats.firstPacketTime = getIndianTimestamp();
      }
      
      const nowStr = getIndianTimestamp();
      let device = devices.get(deviceId);
      
      let isNewDevice = false;
      if (!device) {
        isNewDevice = true;
        device = {
          deviceId,
          firmwareVersion: payload.firmwareVersion || 'Unknown',
          hardwareVersion: payload.hardwareVersion || 'Unknown',
          latestPayload: null,
          history: [],
          status: 'Online',
          messageCount: 0,
          packetsToday: 0,
          firstSeen: nowStr,
          lastSeen: nowStr,
          avgInterval: 0,
          signalQuality: payload.signalQuality || 100,
          location: payload.location || 'Unknown',
          metadata: payload.metadata || {},
          latestAQI: null,
          latestCO2: null,
          latestTemperature: null,
          latestHumidity: null,
          isActive: true,
          lastTopic: topic
        };
        devices.set(deviceId, device);
      }

      // Update interval
      if (device.messageCount > 0) {
        const interval = new Date(nowStr).getTime() - new Date(device.lastSeen).getTime();
        device.avgInterval = (device.avgInterval * device.messageCount + interval) / (device.messageCount + 1);
      }

      device.messageCount++;
      device.packetsToday++;
      device.lastSeen = nowStr;
      
      const prevStatus = device.status;
      device.status = 'Online';
      
      device.latestPayload = payload;
      device.lastTopic = topic;

      if (payload.sensors) {
        device.latestAQI = payload.sensors.AQI;
        device.latestCO2 = payload.sensors.CO2;
        device.latestTemperature = payload.sensors.Temperature;
        device.latestHumidity = payload.sensors.Humidity;
      }

      if (!device.history) device.history = [];
      device.history.unshift(payload);
      if (device.history.length > MAX_HISTORY) {
        device.history.pop();
      }

      // Queue for background DB update
      pendingDeviceUpdates.set(deviceId, { ...device, history: undefined }); // omit history from device model

      const pm1_0 = payload.sensors.PM1_0 !== undefined ? payload.sensors.PM1_0 : payload.sensors['PM1.0'];
      const pm2_5 = payload.sensors.PM2_5 !== undefined ? payload.sensors.PM2_5 : payload.sensors['PM2.5'];
      const pm4_0 = payload.sensors.PM4_0 !== undefined ? payload.sensors.PM4_0 : payload.sensors['PM4.0'];

      insertQueue.push({
        deviceId,
        timestamp: payload.timestamp ? new Date(payload.timestamp) : new Date(),
        AQI: payload.sensors.AQI,
        CO2: payload.sensors.CO2,
        Temperature: payload.sensors.Temperature,
        Humidity: payload.sensors.Humidity,
        VOC: payload.sensors.VOC,
        NOX: payload.sensors.NOX,
        PM1_0: pm1_0,
        PM2_5: pm2_5,
        PM4_0: pm4_0,
        PM10: payload.sensors.PM10,
        rawPayload: payload,
        topic: topic,
        qos: packet.qos,
        retain: packet.retain,
        receivedAt: new Date()
      });

      // Emit the sensor data to all connected Socket.IO clients instantly
      try {
        const io = getIO();
        io.emit('sensorData', device.latestPayload);
        console.log(`[Socket.IO] sensorData emitted for ${deviceId}`);
        io.emit('mqttStats', getMqttStats());
        if (isNewDevice || prevStatus !== 'Online') {
          if (prevStatus !== 'Online' && !isNewDevice) {
            io.emit('deviceStatusChanged', { deviceId, status: 'Online' });
            console.log(`[Socket.IO] deviceStatusChanged emitted for ${deviceId} to Online`);
          }
          io.emit('deviceListUpdated', getDeviceList());
          console.log('[Socket.IO] deviceListUpdated emitted');
        }
      } catch (ioError) {
        console.error('Socket.IO emit error:', ioError.message);
      }
      
    } catch (parseError) {
      console.error('Failed to parse incoming MQTT message:\n', parseError.stack || parseError);
    }
  });
};

export const getDeviceList = () => {
  const list = Array.from(devices.values()).map(d => ({
    deviceId: d.deviceId,
    status: d.status,
    lastSeen: d.lastSeen,
    firmwareVersion: d.firmwareVersion,
    hardwareVersion: d.hardwareVersion,
    messageCount: d.messageCount,
    latestAQI: d.latestAQI,
    latestCO2: d.latestCO2,
    latestTemperature: d.latestTemperature,
    latestHumidity: d.latestHumidity,
    location: d.location
  }));

  const statusOrder = { 'Online': 0, 'Warning': 1, 'Offline': 2 };
  list.sort((a, b) => {
    if (statusOrder[a.status] !== statusOrder[b.status]) {
      return statusOrder[a.status] - statusOrder[b.status];
    }
    return new Date(b.lastSeen).getTime() - new Date(a.lastSeen).getTime();
  });

  return list;
};

export const getLatestPayload = (deviceId) => {
  if (!deviceId) return null;
  const device = devices.get(deviceId);
  return device ? device.latestPayload : null;
};

export const getHistory = async (deviceId, page = 1, limit = 100) => {
  if (!deviceId) return [];
  const skip = (page - 1) * limit;
  try {
    const history = await SensorHistory.find({ deviceId })
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(limit)
      .lean();
    return history.map(h => h.rawPayload); // Keep frontend expecting raw payloads
  } catch (err) {
    console.error('Error fetching history:', err);
    // Fallback to memory cache
    const device = devices.get(deviceId);
    return device ? device.history.slice(skip, skip + limit) : [];
  }
};

export const getDevicesStats = () => {
  let online = 0, offline = 0;
  devices.forEach(d => {
    if (d.status === 'Offline') offline++;
    else online++; // Online or Warning
  });
  return {
    totalDevices: devices.size,
    onlineDevices: online,
    offlineDevices: offline
  };
};

export const getMqttStats = () => {
  return {
    ...stats,
    status: getMqttStatus(),
    topic: mqttTopic,
    uptime: Math.floor(process.uptime())
  };
};

export const getMqttStatus = () => {
  return mqttClient && mqttClient.connected ? 'connected' : 'disconnected';
};

export const disconnectMqtt = () => {
  if (mqttClient) {
    mqttClient.end(false, () => {
      console.log('✓ MQTT Connection Closed Cleanly');
    });
  }
};
