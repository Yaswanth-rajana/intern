import { create } from 'zustand';
import { 
  fetchDevices, 
  fetchDeviceLatest, 
  fetchDeviceHistory, 
  healthCheck, 
  fetchThresholds, 
  updateThreshold, 
  updateDeviceLocation 
} from '../services/api';
import { connectSocket, socket } from '../services/socket';
import { getSensorStatus, updateSensorLimits } from '../utils/sensorStatusConfig';

const HISTORY_LIMIT = 50;

// Human-readable display names for sensor keys
const SENSOR_DISPLAY_NAMES = {
  AQI: 'AQI',
  CO2: 'CO₂',
  VOC: 'VOC',
  Temperature: 'Temperature',
  Humidity: 'Humidity',
  PM1_0: 'PM 1.0',
  PM2_5: 'PM 2.5',
  PM4_0: 'PM 4.0',
  PM10: 'PM 10',
  NOX: 'NOx',
};
const getSensorLabel = (key) => SENSOR_DISPLAY_NAMES[key] || key;

const generateAlarmsList = (sensors, prevAlarms = [], timeStr = new Date().toLocaleTimeString(), deviceId = null, deviceName = null) => {
  let newAlarms = [...prevAlarms];
  const now = Date.now();

  Object.entries(sensors).forEach(([key, value]) => {
    if (value === undefined || value === null) return;

    const currentStatus = getSensorStatus(key, value);
    
    // Find if there's already an active alarm for this sensor and device
    const activeAlarmIdx = newAlarms.findIndex(a => a.sensor === key && a.deviceId === deviceId && a.status === 'Active');

    if (currentStatus.color === 'yellow' || currentStatus.color === 'orange') {
      // Should have a Warning alarm
      if (activeAlarmIdx > -1) {
        const existing = newAlarms[activeAlarmIdx];
        if (existing.severity !== 'Warning') {
          // Change critical to warning
          newAlarms[activeAlarmIdx] = {
            ...existing,
            timestamp: timeStr,
            value,
            severity: 'Warning',
            message: `${deviceName ? deviceName + ': ' : ''}${getSensorLabel(key)} reached warning level (${value} - ${currentStatus.label})`,
            threshold: 'Warning Limit'
          };
        } else {
          // Update value
          newAlarms[activeAlarmIdx].value = value;
        }
      } else {
        // Add new warning alarm
        const devicePrefix = deviceName ? `${deviceName} (${deviceId})` : (deviceId || '');
        newAlarms.unshift({
          id: `${deviceId ? deviceId + '-' : ''}${key}-warning-${now}`,
          timestamp: timeStr,
          sensor: key,
          deviceId: deviceId,
          deviceName: deviceName,
          value: value,
          threshold: 'Warning Limit',
          severity: 'Warning',
          message: `${devicePrefix ? devicePrefix + ': ' : ''}${getSensorLabel(key)} reached warning level (${value} - ${currentStatus.label})`,
          status: 'Active'
        });
      }
    } else if (currentStatus.color === 'red') {
      // Should have a Critical alarm
      if (activeAlarmIdx > -1) {
        const existing = newAlarms[activeAlarmIdx];
        if (existing.severity !== 'Critical') {
          // Change warning to critical
          newAlarms[activeAlarmIdx] = {
            ...existing,
            timestamp: timeStr,
            value,
            severity: 'Critical',
            message: `${deviceName ? deviceName + ': ' : ''}${getSensorLabel(key)} reached critical level (${value} - ${currentStatus.label})`,
            threshold: 'Critical Limit'
          };
        } else {
          // Update value
          newAlarms[activeAlarmIdx].value = value;
        }
      } else {
        // Add new critical alarm
        const devicePrefix = deviceName ? `${deviceName} (${deviceId})` : (deviceId || '');
        newAlarms.unshift({
          id: `${deviceId ? deviceId + '-' : ''}${key}-critical-${now}`,
          timestamp: timeStr,
          sensor: key,
          deviceId: deviceId,
          deviceName: deviceName,
          value: value,
          threshold: 'Critical Limit',
          severity: 'Critical',
          message: `${devicePrefix ? devicePrefix + ': ' : ''}${getSensorLabel(key)} reached critical level (${value} - ${currentStatus.label})`,
          status: 'Active'
        });
      }
    } else if (currentStatus.color === 'green' || currentStatus.color === 'blue') {
      // If there was an active alarm, resolve it
      if (activeAlarmIdx > -1) {
        const existing = newAlarms[activeAlarmIdx];
        newAlarms[activeAlarmIdx] = {
          ...existing,
          status: 'Resolved',
          severity: 'Info',
          message: `${deviceName ? deviceName + ': ' : ''}${getSensorLabel(key)} returned to normal levels (${value} - ${currentStatus.label})`,
          timestamp: timeStr
        };
      }
    }
  });

  if (newAlarms.length > 100) {
    newAlarms = newAlarms.slice(0, 100);
  }

  return newAlarms;
};

const getInitialVisibleMetrics = () => {
  try {
    const saved = localStorage.getItem('iaq_visible_metrics');
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (e) {}
  return {
    AQI: true,
    CO2: true,
    Temperature: true,
    Humidity: true,
    PM2_5: true,
    VOC: false,
    NOX: false,
    PM1_0: false,
    PM4_0: false,
    PM10: false,
  };
};

const getInitialTimeRange = () => {
  try {
    const saved = localStorage.getItem('iaq_time_range');
    if (saved) return saved;
  } catch (e) {}
  return 'live';
};

export const useDashboardStore = create((set, get) => ({
  deviceList: [],
  selectedDeviceId: null,
  visibleMetrics: getInitialVisibleMetrics(),
  hoveredMetricKey: null,
  activeTab: 'Dashboard', // 'Dashboard' | 'Devices' | 'Settings'
  thresholds: [],
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
    activeAlarms: [], // current snapshot: one entry per sensor, updated live
    alarmLog: [],     // historical log: every event ever fired
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
  timeRange: getInitialTimeRange(),
  isHistoryLoading: false,
  historyError: null,
  isHistoryMocked: false,
  _currentFetchToken: null,

  setActiveTab: (tab) => set({ activeTab: tab }),

  setTimeRange: async (range) => {
    const { selectedDeviceId } = get();
    if (!selectedDeviceId) return;

    try {
      localStorage.setItem('iaq_time_range', range);
    } catch (e) {}

    set({ timeRange: range, historyError: null });

    const fetchToken = Math.random().toString(36).substring(7);
    get()._currentFetchToken = fetchToken;

    if (range === 'live') {
      try {
        set({ isHistoryLoading: true });
        const res = await fetchDeviceHistory(selectedDeviceId, 'live');
        if (get()._currentFetchToken !== fetchToken) return;

        const historyData = res.data || [];
        const newHistory = historyData.reverse().map(p => ({
          timestamp: p.timestamp,
          _ts: new Date(p.timestamp).getTime(),
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
        }));
        console.log(`[History Response] Range: live, Data Points: ${newHistory.length}, Is Mocked: false`);
        set({ history: newHistory, isHistoryLoading: false, isHistoryMocked: false });
      } catch (err) {
        if (get()._currentFetchToken !== fetchToken) return;
        set({ historyError: 'Failed to load live history buffer', isHistoryLoading: false });
      }
    } else {
      try {
        set({ isHistoryLoading: true });
        const res = await fetchDeviceHistory(selectedDeviceId, range);
        if (get()._currentFetchToken !== fetchToken) return;

        const historyData = res.data || [];
        const newHistory = historyData.map(p => ({
          timestamp: p.timestamp,
          _ts: new Date(p.timestamp).getTime(),
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
        }));
        console.log(`[History Response] Range: ${range}, Data Points: ${newHistory.length}, Is Mocked: ${res.isMocked}`);
        set({ 
          history: newHistory, 
          isHistoryLoading: false, 
          isHistoryMocked: res.isMocked || false 
        });
      } catch (err) {
        if (get()._currentFetchToken !== fetchToken) return;
        set({ historyError: 'Failed to load historical data', isHistoryLoading: false });
      }
    }
  },

  resolveAlarm: (alarmId) => set((state) => {
    const resolvedAt = new Date().toLocaleTimeString();

    const resolveEntry = (alarm) =>
      alarm.id === alarmId
        ? { ...alarm, status: 'Resolved', severity: 'Info', resolvedAt, message: alarm.message.replace('reached', 'resolved —') }
        : alarm;

    return {
      alarms: {
        activeAlarms: state.alarms.activeAlarms.map(resolveEntry),
        alarmLog: state.alarms.alarmLog.map(resolveEntry),
      }
    };
  }),


  initialize: async () => {
    try {
      set((state) => ({ ui: { ...state.ui, state: 'initialLoading' } }));
      
      // Load thresholds from DB
      let dbThresholds = [];
      try {
        dbThresholds = await fetchThresholds();
        dbThresholds.forEach(t => {
          updateSensorLimits(t.sensorKey, t.warningLimit, t.criticalLimit);
        });
      } catch (err) {
        console.error('Failed to fetch thresholds on init', err);
      }

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
          const activeRange = get().timeRange;
          if (activeRange !== 'live') {
            set({ isHistoryLoading: true, historyError: null });
          }
          const [res, lat] = await Promise.all([
            fetchDeviceHistory(defaultDevice, activeRange).catch((e) => {
              set({ historyError: 'Failed to load data on initialization' });
              return { data: [], isMocked: false };
            }),
            fetchDeviceLatest(defaultDevice).catch(() => null)
          ]);
          historyData = res?.data || [];
          latestData = lat;
          set({ isHistoryMocked: res?.isMocked || false, isHistoryLoading: false });
        } catch (e) {
          set({ isHistoryLoading: false });
        }
      }

      set((state) => {
        let newHistory = [];
        if (Array.isArray(historyData)) {
          const activeRange = get().timeRange;
          const sortedData = activeRange === 'live' ? [...historyData].reverse() : historyData;
          newHistory = sortedData
            .slice(0, activeRange === 'live' ? HISTORY_LIMIT : sortedData.length)
            .map(p => ({
              timestamp: p.timestamp,
              _ts: new Date(p.timestamp).getTime(),
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
            }));
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

        const updatedDevices = devices.map(d => {
          if (d.deviceId === defaultDevice) {
            return {
              ...d,
              latestSensors
            };
          }
          return d;
        });

        return {
          deviceList: updatedDevices,
          selectedDeviceId: defaultDevice,
          thresholds: dbThresholds,
          history: newHistory,
          sensors: { latest: latestSensors },
          alarms: {
            activeAlarms: generateAlarmsList(latestSensors, [], new Date().toLocaleTimeString(), defaultDevice, latestData?.name || defaultDevice),
            alarmLog: generateAlarmsList(latestSensors, [], new Date().toLocaleTimeString(), defaultDevice, latestData?.name || defaultDevice),
          },
          device: {
            ...state.device,
            info: {
              ...(devices.find(d => d.deviceId === defaultDevice) || {}),
              ...latestData
            },
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
      set((state) => ({ ui: { ...state.ui, state: 'loadingDevice' }, selectedDeviceId: deviceId, historyError: null }));
      
      const activeRange = get().timeRange;
      if (activeRange !== 'live') {
        set({ isHistoryLoading: true });
      }

      const [res, latestData] = await Promise.all([
        fetchDeviceHistory(deviceId, activeRange).catch((e) => {
          set({ historyError: 'Failed to load data for selected device' });
          return { data: [], isMocked: false };
        }),
        fetchDeviceLatest(deviceId).catch(() => null)
      ]);
      const historyData = res?.data || [];
      const isMocked = res?.isMocked || false;

      set((state) => {
        let newHistory = [];
        if (Array.isArray(historyData)) {
          const sortedData = activeRange === 'live' ? [...historyData].reverse() : historyData;
          newHistory = sortedData
            .slice(0, activeRange === 'live' ? HISTORY_LIMIT : sortedData.length)
            .map(p => ({
              timestamp: p.timestamp,
              _ts: new Date(p.timestamp).getTime(),
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
            }));
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

        const updatedDevices = state.deviceList.map(d => {
          if (d.deviceId === deviceId) {
            return {
              ...d,
              latestSensors
            };
          }
          return d;
        });

        return {
          deviceList: updatedDevices,
          history: newHistory,
          isHistoryLoading: false,
          isHistoryMocked: isMocked,
          sensors: { latest: latestSensors },
          alarms: {
            activeAlarms: generateAlarmsList(latestSensors, [], new Date().toLocaleTimeString(), deviceId, latestData?.name || deviceId),
            alarmLog: generateAlarmsList(latestSensors, [], new Date().toLocaleTimeString(), deviceId, latestData?.name || deviceId),
          },
          device: {
            ...state.device,
            info: {
              ...(updatedDevices.find(d => d.deviceId === deviceId) || {}),
              ...latestData
            },
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
      const nowIso = new Date(now).toISOString();

      // Find the device in the device list to get its name
      const deviceObj = state.deviceList.find(d => d.deviceId === payload.deviceId);
      const deviceName = deviceObj ? (deviceObj.name || deviceObj.deviceId) : payload.deviceId;
      // Get previous sensor readings cached on the device
      const prevSensors = deviceObj?.latestSensors || {};

      // Update deviceList for the target device
      const updatedList = state.deviceList.map(d => {
        if (d.deviceId === payload.deviceId) {
          return {
            ...d,
            status: 'ONLINE',
            lastSeen: nowIso,
            lastSeenAt: nowIso,
            messageCount: (d.messageCount || 0) + 1,
            latestAQI: payload.sensors?.AQI,
            latestCO2: payload.sensors?.CO2,
            latestTemperature: payload.sensors?.Temperature,
            latestHumidity: payload.sensors?.Humidity,
            latestSensors: {
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
            }
          };
        }
        return d;
      });

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

      // Process history and stats only for the currently selected device
      let newHistory = state.history;
      let newDevice = state.device;
      let newSensors = state.sensors;
      let newStats = state.stats;

      if (payload.deviceId === state.selectedDeviceId) {
        if (state.timeRange === 'live') {
          const newHistoryPoint = {
            timestamp: nowIso,
            _ts: now,
            ...normalizedSensors
          };
          newHistory = [...state.history, newHistoryPoint];
          if (newHistory.length > HISTORY_LIMIT) {
            newHistory = newHistory.slice(newHistory.length - HISTORY_LIMIT);
          }
        }
         const newTotalPackets = state.device.totalPackets + 1;
        newDevice = {
          ...state.device,
          info: {
            ...(updatedList.find(d => d.deviceId === payload.deviceId) || {}),
            ...payload
          },
          lastPacketTime: now,
          totalPackets: newTotalPackets,
        };
        newSensors = {
          latest: normalizedSensors
        };
        const newMessagesToday = state.stats.messagesToday + 1;
        const newFirstPacketTime = state.stats.firstPacketTime || now;
        let newAvgInterval = state.stats.avgPacketInterval;
        if (state.device.lastPacketTime) {
          const interval = now - state.device.lastPacketTime;
          newAvgInterval = state.device.totalPackets === 0 ? interval : (state.stats.avgPacketInterval * state.device.totalPackets + interval) / newTotalPackets;
        }
        newStats = {
          messagesToday: newMessagesToday,
          firstPacketTime: newFirstPacketTime,
          avgPacketInterval: newAvgInterval,
        };
      }

      // Update current-state alarm snapshot (one entry per sensor per device)
      const newAlarms = generateAlarmsList(normalizedSensors, state.alarms.activeAlarms, timeStr, payload.deviceId, deviceName);

      // Build alarm log based on SEVERITY TRANSITIONS per sensor
      const getSeverityTier = (color) => {
        if (color === 'red')                          return 'Critical';
        if (color === 'yellow' || color === 'orange') return 'Warning';
        return 'Normal';
      };

      let newAlarmLog = [...state.alarms.alarmLog];

      Object.entries(normalizedSensors).forEach(([key, value]) => {
        if (value === undefined || value === null) return;

        const prevValue       = prevSensors[key];
        const currentStatus   = getSensorStatus(key, value);
        const prevStatus      = prevValue !== undefined
          ? getSensorStatus(key, prevValue)
          : { label: 'Normal', color: 'green' };

        const prevTier    = getSeverityTier(prevStatus.color);
        const currentTier = getSeverityTier(currentStatus.color);

        // Only log when the severity tier actually changes
        if (currentTier !== prevTier) {
          const logId = `${payload.deviceId}-${key}-${currentTier.toLowerCase()}-${now}`;
          const devicePrefix = deviceName ? `${deviceName} (${payload.deviceId})` : payload.deviceId;
          if (currentTier === 'Warning') {
            newAlarmLog.unshift({
              id: logId,
              timestamp: timeStr,
              loggedAt: new Date().toISOString(),
              sensor: key,
              deviceId: payload.deviceId,
              deviceName: deviceName,
              value,
              threshold: 'Warning Limit',
              severity: 'Warning',
              message: `${devicePrefix}: ${getSensorLabel(key)} reached warning level (${value} - ${currentStatus.label})`,
              status: 'Active',
            });
          } else if (currentTier === 'Critical') {
            newAlarmLog.unshift({
              id: logId,
              timestamp: timeStr,
              loggedAt: new Date().toISOString(),
              sensor: key,
              deviceId: payload.deviceId,
              deviceName: deviceName,
              value,
              threshold: 'Critical Limit',
              severity: 'Critical',
              message: `${devicePrefix}: ${getSensorLabel(key)} reached critical level (${value} - ${currentStatus.label})`,
              status: 'Active',
            });
          } else {
            // Returned to Normal
            newAlarmLog.unshift({
              id: logId,
              timestamp: timeStr,
              loggedAt: new Date().toISOString(),
              sensor: key,
              deviceId: payload.deviceId,
              deviceName: deviceName,
              value,
              threshold: 'Normal',
              severity: 'Info',
              message: `${devicePrefix}: ${getSensorLabel(key)} returned to normal (${value} - ${currentStatus.label})`,
              status: 'Resolved',
            });
          }
        }
      });

      if (newAlarmLog.length > 500) newAlarmLog = newAlarmLog.slice(0, 500);

      return {
        deviceList: updatedList,
        device: newDevice,
        sensors: newSensors,
        history: newHistory,
        alarms: {
          activeAlarms: newAlarms,
          alarmLog: newAlarmLog,
        },
        stats: newStats,
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
  },

  updateDeviceLocation: async (deviceId, location) => {
    try {
      await updateDeviceLocation(deviceId, location);
      set((state) => {
        const newList = state.deviceList.map(d => 
          d.deviceId === deviceId ? { ...d, location } : d
        );
        const updatedInfo = state.device.info.deviceId === deviceId 
          ? { ...state.device.info, location } 
          : state.device.info;
        return {
          deviceList: newList,
          device: { ...state.device, info: updatedInfo }
        };
      });
      return true;
    } catch (err) {
      console.error('Failed to update location', err);
      return false;
    }
  },

  updateThreshold: async (sensorKey, warningLimit, criticalLimit) => {
    try {
      await updateThreshold(sensorKey, warningLimit, criticalLimit);
      updateSensorLimits(sensorKey, warningLimit, criticalLimit);
      set((state) => {
        const index = state.thresholds.findIndex(t => t.sensorKey === sensorKey);
        let newThresholds = [...state.thresholds];
        if (index > -1) {
          newThresholds[index] = { ...newThresholds[index], warningLimit, criticalLimit };
        } else {
          newThresholds.push({ sensorKey, warningLimit, criticalLimit });
        }

        // Recalculate alarms immediately with updated thresholds
        const deviceId = state.selectedDeviceId;
        const deviceObj = state.deviceList.find(d => d.deviceId === deviceId);
        const deviceName = deviceObj ? (deviceObj.name || deviceObj.deviceId) : deviceId;
        const newAlarms = generateAlarmsList(state.sensors.latest, state.alarms.activeAlarms, new Date().toLocaleTimeString(), deviceId, deviceName);
        let newLog = [...state.alarms.alarmLog];
        newAlarms.forEach(alarm => {
          if (!newLog.find(l => l.id === alarm.id)) {
            newLog.unshift({ ...alarm, loggedAt: new Date().toISOString() });
          }
        });
        if (newLog.length > 500) newLog = newLog.slice(0, 500);

        return { 
          thresholds: newThresholds,
          alarms: { activeAlarms: newAlarms, alarmLog: newLog }
        };
      });
      return true;
    } catch (err) {
      console.error('Failed to update threshold', err);
      return false;
    }
  },

  toggleMetric: (key) => set((state) => {
    const updated = {
      ...state.visibleMetrics,
      [key]: !state.visibleMetrics[key]
    };
    try {
      localStorage.setItem('iaq_visible_metrics', JSON.stringify(updated));
    } catch (e) {}
    return { visibleMetrics: updated };
  }),

  setHoveredMetric: (key) => set({ hoveredMetricKey: key }),
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
