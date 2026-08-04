import { create } from 'zustand';
import { fetchDevices, fetchDeviceLatest, fetchDeviceHistory, healthCheck } from '../services/api';
import { connectSocket, socket } from '../services/socket';
import { getSensorStatus } from '../utils/sensorStatusConfig';

const HISTORY_LIMIT = 50;

export const useDashboardStore = create((set, get) => ({
  deviceList: [],
  selectedDeviceId: null,
  device: {
    lastPacketTime: null,
    info: {},
    totalPackets: 0,
  },
  sensors: {
    latest: {},
  },
  history: [],
  alarms: {
    activeAlarms: [], // { id, timestamp, sensor, value, threshold, severity, message, status }
  },
  system: {
    backend: { status: 'Unknown' },
    mqtt: { status: 'Unknown' },
    socket: { status: 'Disconnected' },
    mqttStats: {},
  },
  stats: {
    messagesToday: 0,
    firstPacketTime: null,
    avgPacketInterval: 0,
  },
  ui: {
    state: 'initialLoading', // initialLoading, reconnecting, live, loadingDevice
  },

  initialize: async () => {
    try {
      set((state) => ({ ui: { ...state.ui, state: 'initialLoading' } }));
      
      let devices = [];
      try {
        devices = await fetchDevices();
      } catch (e) {
        console.error('Failed to fetch devices', e);
      }
      
      const defaultDevice = devices.length > 0 ? devices[0].deviceId : null;
      
      let historyData = [];
      let latestData = null;
      let healthData = {};
      
      try {
        healthData = await healthCheck();
      } catch (e) {}

      if (defaultDevice) {
        try {
          const [hist, lat] = await Promise.all([
            fetchDeviceHistory(defaultDevice).catch(() => []),
            fetchDeviceLatest(defaultDevice).catch(() => null)
          ]);
          historyData = hist;
          latestData = lat;
        } catch (e) {}
      }

      set((state) => {
        let newHistory = [];
        if (Array.isArray(historyData)) {
          newHistory = historyData.map(p => ({
            timestamp: new Date(p.timestamp).toLocaleTimeString(),
            AQI: p.sensors?.AQI,
            CO2: p.sensors?.CO2,
            VOC: p.sensors?.VOC,
            Temperature: p.sensors?.Temperature,
            Humidity: p.sensors?.Humidity,
            PM1_0: p.sensors?.PM1_0 || p.sensors?.['PM1.0'],
            PM2_5: p.sensors?.PM2_5 || p.sensors?.['PM2.5'],
            PM4_0: p.sensors?.PM4_0 || p.sensors?.['PM4.0'],
            PM10: p.sensors?.PM10,
            NOX: p.sensors?.NOX,
          })).slice(-HISTORY_LIMIT);
        }

        const latestSensors = latestData?.sensors ? {
          AQI: latestData.sensors.AQI,
          CO2: latestData.sensors.CO2,
          VOC: latestData.sensors.VOC,
          Temperature: latestData.sensors.Temperature,
          Humidity: latestData.sensors.Humidity,
          PM1_0: latestData.sensors.PM1_0 || latestData.sensors['PM1.0'],
          PM2_5: latestData.sensors.PM2_5 || latestData.sensors['PM2.5'],
          PM4_0: latestData.sensors.PM4_0 || latestData.sensors['PM4.0'],
          PM10: latestData.sensors.PM10,
          NOX: latestData.sensors.NOX,
        } : {};

        return {
          deviceList: devices,
          selectedDeviceId: defaultDevice,
          history: newHistory,
          sensors: { latest: latestSensors },
          device: {
            ...state.device,
            info: latestData || {},
            lastPacketTime: latestData ? Date.now() : null,
          },
          system: {
            ...state.system,
            backend: { status: healthData?.status === 'ok' ? 'Running' : 'Offline' },
            mqtt: { status: healthData?.mqtt === 'connected' ? 'Connected' : 'Disconnected' },
            mqttStats: healthData?.mqttStats || {},
          },
          ui: { state: 'live' }
        };
      });

      // Connect socket after initial load
      connectSocket();
      
      // Setup health polling
      if (!window.healthPollInterval) {
        window.healthPollInterval = setInterval(async () => {
          try {
            const healthData = await healthCheck();
            set((state) => ({
              system: {
                ...state.system,
                backend: { status: healthData?.status === 'ok' ? 'Running' : 'Offline' },
                mqtt: { status: healthData?.mqtt === 'connected' ? 'Connected' : 'Disconnected' },
                mqttStats: healthData?.mqttStats || {},
              }
            }));
          } catch (error) {
            set((state) => ({
              system: {
                ...state.system,
                backend: { status: 'Offline' },
                mqtt: { status: 'Disconnected' },
              }
            }));
          }
        }, 10000);
      }

    } catch (error) {
      console.error('Initialization failed', error);
      set((state) => ({ ui: { ...state.ui, state: 'live' } }));
    }
  },

  selectDevice: async (deviceId) => {
    try {
      set((state) => ({ ui: { ...state.ui, state: 'loadingDevice' }, selectedDeviceId: deviceId }));
      
      const [historyData, latestData] = await Promise.all([
        fetchDeviceHistory(deviceId).catch(() => []),
        fetchDeviceLatest(deviceId).catch(() => null)
      ]);

      set((state) => {
        let newHistory = [];
        if (Array.isArray(historyData)) {
          newHistory = historyData.map(p => ({
            timestamp: new Date(p.timestamp).toLocaleTimeString(),
            AQI: p.sensors?.AQI,
            CO2: p.sensors?.CO2,
            VOC: p.sensors?.VOC,
            Temperature: p.sensors?.Temperature,
            Humidity: p.sensors?.Humidity,
            PM1_0: p.sensors?.PM1_0 || p.sensors?.['PM1.0'],
            PM2_5: p.sensors?.PM2_5 || p.sensors?.['PM2.5'],
            PM4_0: p.sensors?.PM4_0 || p.sensors?.['PM4.0'],
            PM10: p.sensors?.PM10,
            NOX: p.sensors?.NOX,
          })).slice(-HISTORY_LIMIT);
        }

        const latestSensors = latestData?.sensors ? {
          AQI: latestData.sensors.AQI,
          CO2: latestData.sensors.CO2,
          VOC: latestData.sensors.VOC,
          Temperature: latestData.sensors.Temperature,
          Humidity: latestData.sensors.Humidity,
          PM1_0: latestData.sensors.PM1_0 || latestData.sensors['PM1.0'],
          PM2_5: latestData.sensors.PM2_5 || latestData.sensors['PM2.5'],
          PM4_0: latestData.sensors.PM4_0 || latestData.sensors['PM4.0'],
          PM10: latestData.sensors.PM10,
          NOX: latestData.sensors.NOX,
        } : {};

        return {
          history: newHistory,
          sensors: { latest: latestSensors },
          device: {
            ...state.device,
            info: latestData || {},
            lastPacketTime: latestData ? Date.now() : null,
          },
          ui: { state: 'live' }
        };
      });
    } catch (error) {
      console.error('Failed to select device', error);
      set((state) => ({ ui: { ...state.ui, state: 'live' } }));
    }
  },

  handleDeviceListUpdated: (devices) => {
    set({ deviceList: devices });
  },

  handleDeviceStatusChanged: ({ deviceId, status }) => {
    set((state) => {
      const newList = state.deviceList.map(d => 
        d.deviceId === deviceId ? { ...d, status } : d
      );
      // Re-sort correctly: Online -> Warning -> Offline, newest first
      const statusOrder = { 'Online': 0, 'Warning': 1, 'Offline': 2 };
      newList.sort((a, b) => {
        if (statusOrder[a.status] !== statusOrder[b.status]) {
          return statusOrder[a.status] - statusOrder[b.status];
        }
        return new Date(b.lastSeen).getTime() - new Date(a.lastSeen).getTime();
      });
      return { deviceList: newList };
    });
  },

  handleSensorData: (payload) => {
    if (!payload || !payload.sensors || !payload.deviceId) return;

    set((state) => {
      const now = Date.now();
      
      // If it's for a different device, update only the list silently
      if (payload.deviceId !== state.selectedDeviceId) {
        const newList = state.deviceList.map(d => {
          if (d.deviceId === payload.deviceId) {
            return {
              ...d,
              status: 'Online',
              lastSeen: new Date(now).toISOString(),
              messageCount: d.messageCount + 1,
              latestAQI: payload.sensors.AQI,
              latestCO2: payload.sensors.CO2,
              latestTemperature: payload.sensors.Temperature,
              latestHumidity: payload.sensors.Humidity
            };
          }
          return d;
        });
        return { deviceList: newList };
      }

      // Process for current selected device
      const timeStr = new Date(now).toLocaleTimeString();
      
      const normalizedSensors = {
        AQI: payload.sensors.AQI,
        CO2: payload.sensors.CO2,
        VOC: payload.sensors.VOC,
        Temperature: payload.sensors.Temperature,
        Humidity: payload.sensors.Humidity,
        PM1_0: payload.sensors.PM1_0 || payload.sensors['PM1.0'],
        PM2_5: payload.sensors.PM2_5 || payload.sensors['PM2.5'],
        PM4_0: payload.sensors.PM4_0 || payload.sensors['PM4.0'],
        PM10: payload.sensors.PM10,
        NOX: payload.sensors.NOX,
      };

      const newHistoryPoint = {
        timestamp: timeStr,
        ...normalizedSensors
      };

      let newHistory = [...state.history, newHistoryPoint];
      if (newHistory.length > HISTORY_LIMIT) {
        newHistory = newHistory.slice(newHistory.length - HISTORY_LIMIT);
      }

      // Advanced Alarm Generation Logic
      let newAlarms = [...state.alarms.activeAlarms];
      
      Object.entries(normalizedSensors).forEach(([key, value]) => {
        if (value === undefined) return;
        
        const prevValue = state.sensors.latest[key];
        const currentStatus = getSensorStatus(key, value);
        const prevStatus = prevValue !== undefined ? getSensorStatus(key, prevValue) : { label: 'Good', color: 'green' };

        if ((prevStatus.color === 'green' || prevStatus.color === 'blue') && (currentStatus.color === 'orange' || currentStatus.color === 'yellow')) {
          newAlarms.unshift({
            id: `${key}-warning-${now}`,
            timestamp: timeStr,
            sensor: key,
            value: value,
            threshold: 'Warning Limit',
            severity: 'Warning',
            message: `${key} reached warning level (${value} - ${currentStatus.label})`,
            status: 'Active'
          });
        }
        
        if (prevStatus.color !== 'red' && currentStatus.color === 'red') {
          newAlarms.unshift({
            id: `${key}-critical-${now}`,
            timestamp: timeStr,
            sensor: key,
            value: value,
            threshold: 'Critical Limit',
            severity: 'Critical',
            message: `${key} reached critical level (${value} - ${currentStatus.label})`,
            status: 'Active'
          });
        }
        
        if ((prevStatus.color === 'red' || prevStatus.color === 'orange' || prevStatus.color === 'yellow') && (currentStatus.color === 'green' || currentStatus.color === 'blue')) {
          newAlarms.unshift({
            id: `${key}-normal-${now}`,
            timestamp: timeStr,
            sensor: key,
            value: value,
            threshold: 'Normal Limit',
            severity: 'Info',
            message: `${key} returned to normal levels (${value} - ${currentStatus.label})`,
            status: 'Resolved'
          });
        }
      });
      
      if (newAlarms.length > 100) newAlarms = newAlarms.slice(0, 100);

      const newTotalPackets = state.device.totalPackets + 1;
      const newMessagesToday = state.stats.messagesToday + 1;
      const newFirstPacketTime = state.stats.firstPacketTime || now;
      let newAvgInterval = state.stats.avgPacketInterval;
      if (state.device.lastPacketTime) {
        const interval = now - state.device.lastPacketTime;
        newAvgInterval = state.device.totalPackets === 0 ? interval : (state.stats.avgPacketInterval * state.device.totalPackets + interval) / newTotalPackets;
      }

      return {
        device: {
          ...state.device,
          info: payload,
          lastPacketTime: now,
          totalPackets: newTotalPackets,
        },
        sensors: {
          latest: normalizedSensors
        },
        history: newHistory,
        alarms: {
          activeAlarms: newAlarms
        },
        stats: {
          messagesToday: newMessagesToday,
          firstPacketTime: newFirstPacketTime,
          avgPacketInterval: newAvgInterval,
        },
        ui: { state: 'live' }
      };
    });
  },

  handleMqttStats: (stats) => {
    set((state) => ({
      system: {
        ...state.system,
        mqttStats: stats
      }
    }));
  },

  setSocketStatus: (status) => {
    set((state) => {
      let uiState = state.ui.state;
      if (status === 'Reconnecting' || status === 'Disconnected') {
        uiState = 'reconnecting';
      } else if (status === 'Connected' && state.ui.state === 'reconnecting') {
        uiState = 'live';
      }
      return {
        system: {
          ...state.system,
          socket: { status }
        },
        ui: { state: uiState }
      };
    });
  }
}));

// Setup global socket listeners here so it's tied to the store
socket.on('connect', () => {
  useDashboardStore.getState().setSocketStatus('Connected');
});

socket.on('disconnect', () => {
  useDashboardStore.getState().setSocketStatus('Disconnected');
});

socket.on('connect_error', () => {
  useDashboardStore.getState().setSocketStatus('Reconnecting');
});

socket.on('sensorData', (data) => {
  useDashboardStore.getState().handleSensorData(data);
});

socket.on('deviceListUpdated', (devices) => {
  useDashboardStore.getState().handleDeviceListUpdated(devices);
});

socket.on('deviceStatusChanged', (data) => {
  useDashboardStore.getState().handleDeviceStatusChanged(data);
});

socket.on('mqttStats', (stats) => {
  useDashboardStore.getState().handleMqttStats(stats);
});
