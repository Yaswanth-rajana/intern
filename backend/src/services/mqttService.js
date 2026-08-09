import mqtt from 'mqtt';
import { mqttConfig, mqttTopic } from '../config/mqtt.js';
import { getIO } from '../socket/socket.js';
import Device from '../models/Device.js';
import Tenant from '../models/Tenant.js';
import SensorHistory from '../models/SensorHistory.js';
import SystemStats from '../models/SystemStats.js';
import Alarm from '../models/Alarm.js';
import Threshold from '../models/Threshold.js';

const devices = new Map();
const MAX_HISTORY = 100;
let mqttClient = null;

// Configurable device offline timeout (in seconds)
const getOfflineTimeoutMs = () => {
  const timeoutSec = parseInt(process.env.DEVICE_OFFLINE_TIMEOUT_SECONDS) || 120;
  return timeoutSec * 1000;
};

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
      d.history = [];
      // Normalize legacy status strings to uppercase enum
      if (d.status === 'Online') d.status = 'ONLINE';
      if (d.status === 'Offline') d.status = 'OFFLINE';
      if (d.status === 'Warning') d.status = 'WARNING';
      if (!d.tenantId) d.status = 'UNASSIGNED';
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

export const registerDeviceInCache = (deviceDoc) => {
  if (!deviceDoc || !deviceDoc.deviceId) return;
  const formatted = {
    ...deviceDoc,
    history: [],
    status: deviceDoc.tenantId ? 'ONLINE' : 'UNASSIGNED',
    lastSeenAt: deviceDoc.lastSeenAt || new Date(),
    lastTelemetryAt: deviceDoc.lastTelemetryAt || null,
  };
  devices.set(deviceDoc.deviceId, formatted);
  
  try {
    const io = getIO();
    getDeviceList().then(list => io.emit('deviceListUpdated', list));
  } catch (e) {}
};

// Batch Processor (Background Sync)
setInterval(async () => {
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
      insertQueue = [...batch, ...insertQueue];
    }
  }

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
      devicesToUpdate.forEach(d => pendingDeviceUpdates.set(d.deviceId, d));
    }
  }
}, 5000);

// Dynamic Device Health & Presence Checker (Directive 3 & 7)
setInterval(async () => {
  const now = Date.now();
  const timeoutMs = getOfflineTimeoutMs();
  
  for (const [deviceId, device] of devices.entries()) {
    // Unassigned devices stay UNASSIGNED
    if (!device.tenantId) {
      if (device.status !== 'UNASSIGNED') {
        device.status = 'UNASSIGNED';
        pendingDeviceUpdates.set(deviceId, device);
      }
      continue;
    }

    const lastSeenTime = device.lastSeenAt ? new Date(device.lastSeenAt).getTime() : new Date(device.lastSeen || 0).getTime();
    const age = now - lastSeenTime;

    let targetStatus = 'ONLINE';
    if (age > timeoutMs) {
      targetStatus = 'OFFLINE';
    } else if (age > timeoutMs * 0.75) {
      targetStatus = 'WARNING';
    }

    if (device.status !== targetStatus) {
      const prevStatus = device.status;
      device.status = targetStatus;
      const tenantId = device.tenantId;

      if (targetStatus === 'OFFLINE') {
        try {
          const alarm = await Alarm.create({
            tenantId,
            deviceId,
            type: 'OFFLINE',
            message: `Device ${deviceId} is now OFFLINE (No telemetry for ${Math.round(age / 1000)}s)`
          });

          try {
            const io = getIO();
            if (tenantId) {
              io.to(`tenant:${tenantId}`).emit('alarm', alarm);
            }
            io.to('superadmin_room').emit('alarm', alarm);
          } catch (err) {}
        } catch (err) {
          console.error('Failed to create offline alarm', err);
        }
      }

      pendingDeviceUpdates.set(deviceId, device);

      try {
        const io = getIO();
        if (tenantId) {
          io.to(`tenant:${tenantId}`).emit('deviceStatusChanged', { deviceId, status: targetStatus });
        }
        io.to('superadmin_room').emit('deviceStatusChanged', { deviceId, status: targetStatus });
        const updatedList = await getDeviceList();
        io.emit('deviceListUpdated', updatedList);
      } catch (err) {}
    }
  }
}, 5000);

const validateSensors = (sensors) => {
  if (!sensors || typeof sensors !== 'object') return false;
  
  for (const [key, val] of Object.entries(sensors)) {
    if (val !== undefined && val !== null && typeof val !== 'number') {
      return false;
    }
  }

  if (sensors.Humidity !== undefined && (sensors.Humidity < 0 || sensors.Humidity > 100)) return false;
  if (sensors.Temperature !== undefined && (sensors.Temperature < -40 || sensors.Temperature > 85)) return false;
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

// Check tenant-specific sensor thresholds and generate tenant-scoped alarms
const checkThresholdAlarms = async (deviceId, tenantId, sensors) => {
  if (!sensors || !tenantId) return;
  try {
    const sensorList = [
      { key: 'AQI', val: sensors.AQI },
      { key: 'CO2', val: sensors.CO2 },
      { key: 'VOC', val: sensors.VOC },
      { key: 'Temperature', val: sensors.Temperature },
      { key: 'Humidity', val: sensors.Humidity },
      { key: 'NOX', val: sensors.NOX },
      { key: 'PM1_0', val: sensors.PM1_0 !== undefined ? sensors.PM1_0 : sensors['PM1.0'] },
      { key: 'PM2_5', val: sensors.PM2_5 !== undefined ? sensors.PM2_5 : sensors['PM2.5'] },
      { key: 'PM4_0', val: sensors.PM4_0 !== undefined ? sensors.PM4_0 : sensors['PM4.0'] },
      { key: 'PM10', val: sensors.PM10 }
    ];

    for (const item of sensorList) {
      if (item.val === undefined || item.val === null) continue;
      const threshold = await Threshold.findOne({ tenantId, sensorKey: item.key });
      if (!threshold) continue;

      let severity = null;
      if (item.val >= threshold.criticalLimit) {
        severity = 'Critical';
      } else if (item.val >= threshold.warningLimit) {
        severity = 'Warning';
      }

      if (severity) {
        const recentAlarm = await Alarm.findOne({
          tenantId,
          deviceId,
          type: severity,
          createdAt: { $gte: new Date(Date.now() - 60000) }
        });

        if (!recentAlarm) {
          const alarm = await Alarm.create({
            tenantId,
            deviceId,
            type: severity,
            message: `${item.key} reached ${severity.toLowerCase()} limit (${item.val} >= limit ${severity === 'Critical' ? threshold.criticalLimit : threshold.warningLimit})`
          });

          try {
            const io = getIO();
            io.to(`tenant:${tenantId}`).emit('alarm', alarm);
            io.to('superadmin_room').emit('alarm', alarm);
          } catch (err) {}
        }
      }
    }
  } catch (err) {
    console.error('Failed to check threshold alarms:', err.message);
  }
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
    mqttClient.subscribe(["iaq/device/#", "iaq/devices/#"], (err, granted) => {
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
    console.error('MQTT Error:', err.message);
  });

  mqttClient.on('message', async (topic, message, packet) => {
    console.log(`\n========== MQTT MESSAGE RECEIVED ==========`);
    console.log(`Topic: ${topic}`);
    console.log(`Payload: ${message.toString()}`);
    console.log(`Timestamp: ${getIndianTimestamp()}`);

    try {
      // 1. Extract deviceId from MQTT topic: iaq/device/<deviceId>
      const topicParts = topic.split('/');
      const topicDeviceId = topicParts[topicParts.length - 1];

      // 2. Parse JSON Payload
      let payload;
      try {
        payload = JSON.parse(message.toString());
      } catch (e) {
        console.warn(`[MQTT Warning] Malformed JSON received on topic ${topic}, ignoring packet.`);
        return;
      }

      // 3. Validate payload.deviceId
      const payloadDeviceId = payload.deviceId || payload.id;
      if (!payloadDeviceId) {
        console.warn(`[MQTT Warning] Payload on ${topic} missing deviceId, ignoring packet.`);
        return;
      }

      // 4. Compare Topic ID === Payload ID (Directive 5)
      if (topicDeviceId !== payloadDeviceId) {
        console.warn(`[MQTT Security Alert] Topic deviceId "${topicDeviceId}" !== Payload deviceId "${payloadDeviceId}". Mismatch rejected.`);
        return;
      }

      const deviceId = topicDeviceId;

      // 5. Look up Device in MongoDB/cache (Directive 5)
      let device = devices.get(deviceId);
      if (!device) {
        const dbDev = await Device.findOne({ deviceId }).lean();
        if (dbDev) {
          device = { ...dbDev, history: [] };
          devices.set(deviceId, device);
        }
      }

      // 6. Unknown device handling (Directive 5): Do NOT auto-create device or tenant
      if (!device) {
        console.warn(`[MQTT Security Warning] Unknown/Unregistered device attempted telemetry: ${deviceId}. Packet rejected.`);
        return;
      }

      // 7. Validate sensor numeric values and physical ranges (Directive 5 & 12)
      if (!validateSensors(payload.sensors)) {
        console.warn(`[MQTT Warning] Invalid sensor values or types received from ${deviceId}, ignoring packet.`);
        return;
      }

      // 8. Get TRUSTED tenantId from MongoDB Device (Directive 6 - Ignore payload.tenantId)
      const trustedTenantId = device.tenantId ? String(device.tenantId) : null;

      messagesThisSecond++;
      stats.totalMessages++;
      if (!stats.firstPacketTime) {
        stats.firstPacketTime = getIndianTimestamp();
      }

      const now = new Date();
      const nowStr = getIndianTimestamp();

      // Update timestamp fields
      device.lastSeen = nowStr;
      device.lastSeenAt = now;
      device.lastTelemetryAt = now;
      device.messageCount = (device.messageCount || 0) + 1;
      device.packetsToday = (device.packetsToday || 0) + 1;

      const prevStatus = device.status;
      if (device.tenantId) {
        device.status = 'ONLINE';
      } else {
        device.status = 'UNASSIGNED';
      }

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

      pendingDeviceUpdates.set(deviceId, { ...device, history: undefined });

      const pm1_0 = payload.sensors.PM1_0 !== undefined ? payload.sensors.PM1_0 : payload.sensors['PM1.0'];
      const pm2_5 = payload.sensors.PM2_5 !== undefined ? payload.sensors.PM2_5 : payload.sensors['PM2.5'];
      const pm4_0 = payload.sensors.PM4_0 !== undefined ? payload.sensors.PM4_0 : payload.sensors['PM4.0'];

      insertQueue.push({
        deviceId,
        tenantId: trustedTenantId,
        timestamp: payload.timestamp ? new Date(payload.timestamp) : now,
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
        receivedAt: now
      });

      // Check tenant-specific threshold alarms
      if (trustedTenantId && payload.sensors) {
        await checkThresholdAlarms(deviceId, trustedTenantId, payload.sensors);
      }

      // Room-isolated socket broadcasts
      try {
        const io = getIO();
        if (trustedTenantId) {
          io.to(`tenant:${trustedTenantId}`).emit('sensorData', device.latestPayload);
        }
        io.to('superadmin_room').emit('sensorData', device.latestPayload);
        io.to('superadmin_room').emit('mqttStats', getMqttStats());

        if (prevStatus !== device.status) {
          if (trustedTenantId) {
            io.to(`tenant:${trustedTenantId}`).emit('deviceStatusChanged', { deviceId, status: device.status });
          }
          io.to('superadmin_room').emit('deviceStatusChanged', { deviceId, status: device.status });
          const updatedList = await getDeviceList();
          io.emit('deviceListUpdated', updatedList);
        }
      } catch (ioError) {
        console.error('Socket.IO emit error:', ioError.message);
      }
      
    } catch (parseError) {
      console.error('Failed to parse incoming MQTT message:\n', parseError.stack || parseError);
    }
  });
};

export const verifyDeviceTenantAccess = async (deviceId, user) => {
  if (!user || !deviceId) return false;
  const device = devices.get(deviceId) || await Device.findOne({ deviceId }).lean();
  if (!device) return false;

  if (user.role === 'SUPER_ADMIN') {
    return true;
  }

  if (!user.tenantId) return false;
  return device.tenantId && String(device.tenantId) === String(user.tenantId);
};

export const getDeviceList = async (user = null, filters = {}) => {
  let allDevices = Array.from(devices.values());

  if (user) {
    if (user.role !== 'SUPER_ADMIN') {
      allDevices = allDevices.filter(d => d.tenantId && String(d.tenantId) === String(user.tenantId));
    } else {
      if (filters.tenantId) {
        allDevices = allDevices.filter(d => d.tenantId && String(d.tenantId) === String(filters.tenantId));
      }
      if (filters.assigned !== undefined) {
        const isAssigned = filters.assigned === 'true' || filters.assigned === true;
        allDevices = allDevices.filter(d => isAssigned ? !!d.tenantId : !d.tenantId);
      }
      if (filters.status) {
        allDevices = allDevices.filter(d => d.status?.toUpperCase() === filters.status.toUpperCase());
      }
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        allDevices = allDevices.filter(d => 
          d.deviceId?.toLowerCase().includes(searchLower) ||
          d.location?.toLowerCase().includes(searchLower) ||
          d.name?.toLowerCase().includes(searchLower)
        );
      }
    }
  }

  const tenantIds = [...new Set(allDevices.map(d => d.tenantId).filter(Boolean))];
  let tenantMap = {};
  if (tenantIds.length > 0) {
    const tenants = await Tenant.find({ _id: { $in: tenantIds } }).lean();
    tenants.forEach(t => {
      tenantMap[t._id.toString()] = { name: t.name, slug: t.slug };
    });
  }

  const list = allDevices.map(d => ({
    deviceId: d.deviceId,
    name: d.name || d.deviceId,
    tenantId: d.tenantId || null,
    tenant: d.tenantId && tenantMap[d.tenantId.toString()] ? tenantMap[d.tenantId.toString()] : null,
    status: d.status || (d.tenantId ? 'ONLINE' : 'UNASSIGNED'),
    lastSeen: d.lastSeen,
    lastSeenAt: d.lastSeenAt,
    lastTelemetryAt: d.lastTelemetryAt,
    registeredAt: d.registeredAt,
    firmwareVersion: d.firmwareVersion,
    hardwareVersion: d.hardwareVersion,
    messageCount: d.messageCount,
    latestAQI: d.latestAQI,
    latestCO2: d.latestCO2,
    latestTemperature: d.latestTemperature,
    latestHumidity: d.latestHumidity,
    location: d.location
  }));

  const statusOrder = { 'ONLINE': 0, 'WARNING': 1, 'OFFLINE': 2, 'UNASSIGNED': 3 };
  list.sort((a, b) => {
    if (statusOrder[a.status] !== statusOrder[b.status]) {
      return statusOrder[a.status] - statusOrder[b.status];
    }
    return new Date(b.lastSeenAt || b.lastSeen || 0).getTime() - new Date(a.lastSeenAt || a.lastSeen || 0).getTime();
  });

  return list;
};

export const getLatestPayload = (deviceId) => {
  if (!deviceId) return null;
  const device = devices.get(deviceId);
  return device ? device.latestPayload : null;
};

const downsample = (data, bucketSizeMs) => {
  if (!data || data.length === 0) return [];
  
  const sorted = [...data].sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  const buckets = {};
  
  sorted.forEach(item => {
    const time = new Date(item.timestamp).getTime();
    const bucketKey = Math.floor(time / bucketSizeMs) * bucketSizeMs;
    if (!buckets[bucketKey]) {
      buckets[bucketKey] = [];
    }
    buckets[bucketKey].push(item);
  });
  
  const result = [];
  const sensorKeys = ['AQI', 'CO2', 'VOC', 'Temperature', 'Humidity', 'PM1_0', 'PM2_5', 'PM4_0', 'PM10', 'NOX'];
  
  Object.entries(buckets).forEach(([bucketKey, items]) => {
    const keyNum = parseInt(bucketKey);
    const avg = {
      timestamp: new Date(keyNum).toISOString(),
      deviceId: items[0].deviceId,
      sensors: {}
    };
    
    sensorKeys.forEach(k => {
      let sum = 0;
      let validCount = 0;
      items.forEach(it => {
        const val = it.sensors?.[k] !== undefined ? it.sensors[k] : it[k];
        if (val !== undefined && val !== null) {
          sum += val;
          validCount++;
        }
      });
      if (validCount > 0) {
        avg.sensors[k] = parseFloat((sum / validCount).toFixed(1));
      }
    });
    result.push(avg);
  });
  return result;
};

export const getHistory = async (deviceId, page = 1, limit = 100, user = null, range = null, start = null, end = null) => {
  if (!deviceId) return { data: [], isMocked: false };
  if (user) {
    const hasAccess = await verifyDeviceTenantAccess(deviceId, user);
    if (!hasAccess) return { data: [], isMocked: false };
  }

  let queryStart = start ? new Date(start) : null;
  let queryEnd = end ? new Date(end) : null;
  
  if (range && range !== 'live') {
    const now = Date.now();
    queryEnd = queryEnd || new Date(now);
    if (range === '1h') queryStart = new Date(now - 1 * 60 * 60 * 1000);
    else if (range === '24h') queryStart = new Date(now - 24 * 60 * 60 * 1000);
    else if (range === '7d') queryStart = new Date(now - 7 * 24 * 60 * 60 * 1000);
    else if (range === '30d') queryStart = new Date(now - 30 * 24 * 60 * 60 * 1000);
  }

  try {
    const dbQuery = { deviceId };
    if (queryStart || queryEnd) {
      dbQuery.timestamp = {};
      if (queryStart) dbQuery.timestamp.$gte = queryStart;
      if (queryEnd) dbQuery.timestamp.$lte = queryEnd;
    }

    let history;
    if (range && range !== 'live') {
      history = await SensorHistory.find(dbQuery)
        .sort({ timestamp: -1 })
        .limit(10000)
        .lean();
    } else {
      const skip = (page - 1) * limit;
      history = await SensorHistory.find(dbQuery)
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(limit)
        .lean();
    }

    let payloads = history.map(h => h.rawPayload || {
      deviceId: h.deviceId,
      timestamp: h.timestamp,
      sensors: {
        AQI: h.AQI,
        CO2: h.CO2,
        VOC: h.VOC,
        Temperature: h.Temperature,
        Humidity: h.Humidity,
        PM1_0: h.PM1_0,
        PM2_5: h.PM2_5,
        PM4_0: h.PM4_0,
        PM10: h.PM10,
        NOX: h.NOX
      }
    });

    console.log(`[History Query] Device: ${deviceId}, Range: ${range}`);
    console.log(`  - Computed Window: ${queryStart ? queryStart.toISOString() : 'N/A'} to ${queryEnd ? queryEnd.toISOString() : 'N/A'}`);
    console.log(`  - Raw Database Records Found: ${payloads.length}`);

    if (range && range !== 'live') {
      let bucketSize = 0;
      if (range === '1h') bucketSize = 60 * 1000;
      else if (range === '24h') bucketSize = 5 * 60 * 1000;
      else if (range === '7d') bucketSize = 60 * 60 * 1000;
      else if (range === '30d') bucketSize = 6 * 60 * 60 * 1000;

      if (bucketSize > 0) {
        payloads = downsample(payloads, bucketSize);
      }
    }

    return { data: payloads, isMocked: false };
  } catch (err) {
    console.error('Error fetching history:', err);
    const skip = (page - 1) * limit;
    const device = devices.get(deviceId);
    const fallback = device ? device.history.slice(skip, skip + limit) : [];
    return { data: fallback, isMocked: false };
  }
};

export const getDevicesStats = () => {
  let online = 0, offline = 0, unassigned = 0;
  devices.forEach(d => {
    if (d.status === 'OFFLINE') offline++;
    else if (d.status === 'UNASSIGNED' || !d.tenantId) unassigned++;
    else online++;
  });
  return {
    totalDevices: devices.size,
    onlineDevices: online,
    offlineDevices: offline,
    unassignedDevices: unassigned
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

export const updateDeviceLocation = async (deviceId, location, name = null) => {
  const updateDoc = {};
  if (location !== null && location !== undefined) updateDoc.location = location;
  if (name !== null && name !== undefined) updateDoc.name = name;

  await Device.updateOne({ deviceId }, updateDoc);

  const cachedDevice = devices.get(deviceId);
  if (cachedDevice) {
    if (location !== null && location !== undefined) cachedDevice.location = location;
    if (name !== null && name !== undefined) cachedDevice.name = name;
  }

  try {
    const io = getIO();
    const updatedList = await getDeviceList();
    io.emit('deviceListUpdated', updatedList);
  } catch (err) {
    console.error('Socket.IO emit error:', err.message);
  }
};

export const updateDeviceTenant = async (deviceId, tenantId, location = null) => {
  const newStatus = tenantId ? 'ONLINE' : 'UNASSIGNED';
  const updatePayload = { tenantId, status: newStatus };
  if (location) updatePayload.location = location;

  await Device.updateOne({ deviceId }, updatePayload);

  const cachedDevice = devices.get(deviceId);
  if (cachedDevice) {
    cachedDevice.tenantId = tenantId;
    cachedDevice.status = newStatus;
    if (location) cachedDevice.location = location;
  }

  try {
    const io = getIO();
    const updatedList = await getDeviceList();
    io.emit('deviceListUpdated', updatedList);
  } catch (err) {
    console.error('Socket.IO emit error:', err.message);
  }
};

export const unassignDeviceTenant = async (deviceId) => {
  await Device.updateOne({ deviceId }, { tenantId: null, status: 'UNASSIGNED' });

  const cachedDevice = devices.get(deviceId);
  if (cachedDevice) {
    cachedDevice.tenantId = null;
    cachedDevice.status = 'UNASSIGNED';
  }

  try {
    const io = getIO();
    const updatedList = await getDeviceList();
    io.emit('deviceListUpdated', updatedList);
  } catch (err) {
    console.error('Socket.IO emit error:', err.message);
  }
};
