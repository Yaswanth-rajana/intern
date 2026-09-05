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

const LIVE_RETENTION_MS = 60 * 60 * 1000; // 60 minutes safety retention window for live history

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
      const parsed = JSON.parse(saved);
      delete parsed.NOX;
      return parsed;
    }
  } catch (e) {}
  return {
    AQI: true,
    CO2: true,
    VOC: true,
    Temperature: true,
    Humidity: true,
    PM1_0: true,
    PM2_5: true,
    PM4_0: true,
    PM10: true,
  };
};

const getInitialTimeRange = () => {
  try {
    const saved = localStorage.getItem('iaq_time_range');
    if (saved) return saved;
  } catch (e) {}
  return 'live';
};

const resolveTelemetryTimeMs = (latestData, deviceObj) => {
  if (latestData) {
    if (typeof latestData._ts === 'number' && Number.isFinite(latestData._ts)) return latestData._ts;
    if (latestData.timestamp) {
      const ts = typeof latestData.timestamp === 'number' ? latestData.timestamp : new Date(latestData.timestamp).getTime();
      if (Number.isFinite(ts)) return ts;
    }
    if (latestData.lastTelemetryAt) {
      const ts = new Date(latestData.lastTelemetryAt).getTime();
      if (Number.isFinite(ts)) return ts;
    }
    if (latestData.createdAt) {
      const ts = new Date(latestData.createdAt).getTime();
      if (Number.isFinite(ts)) return ts;
    }
  }
  if (deviceObj) {
    if (deviceObj.lastTelemetryAt) {
      const ts = new Date(deviceObj.lastTelemetryAt).getTime();
      if (Number.isFinite(ts)) return ts;
    }
    if (deviceObj.lastSeenAt || deviceObj.lastSeen) {
      const ts = new Date(deviceObj.lastSeenAt || deviceObj.lastSeen).getTime();
      if (Number.isFinite(ts)) return ts;
    }
  }
  return null;
};

const normalizeRawHistory = (rawData) => {
  if (!Array.isArray(rawData)) return [];
  return rawData
    .map(p => {
      const ts = typeof p._ts === 'number' && Number.isFinite(p._ts)
        ? p._ts 
        : (p.timestamp ? new Date(p.timestamp).getTime() : null);
      if (!ts || !Number.isFinite(ts)) return null;

      const formatVal = (v) => {
        if (v === undefined || v === null || isNaN(v)) return null;
        return typeof v === 'number' ? Number(v) : parseFloat(v) || null;
      };

      return {
        timestamp: p.timestamp || new Date(ts).toISOString(),
        _ts: ts,
        AQI: formatVal(p.sensors?.AQI ?? p.AQI),
        CO2: formatVal(p.sensors?.CO2 ?? p.CO2),
        VOC: formatVal(p.sensors?.VOC ?? p.VOC),
        Temperature: formatVal(p.sensors?.Temperature ?? p.Temperature),
        Humidity: formatVal(p.sensors?.Humidity ?? p.Humidity),
        PM1_0: formatVal(p.sensors?.PM1_0 ?? p.sensors?.['PM1.0'] ?? p.PM1_0),
        PM2_5: formatVal(p.sensors?.PM2_5 ?? p.sensors?.['PM2.5'] ?? p.PM2_5),
        PM4_0: formatVal(p.sensors?.PM4_0 ?? p.sensors?.['PM4.0'] ?? p.PM4_0),
        PM10: formatVal(p.sensors?.PM10 ?? p.PM10),
      };
    })
    .filter(Boolean)
    .sort((a, b) => a._ts - b._ts);
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
  _initializing: false,
  isInitialized: false,

  setActiveTab: (tab) => set({ activeTab: tab }),

  // Unified shared history fetcher for initialize, setTimeRange, and selectDevice
  loadChartData: async (deviceId, range) => {
    if (!deviceId) {
      set({ history: [], isHistoryLoading: false, historyError: null });
      return [];
    }

    const fetchToken = Math.random().toString(36).substring(7);
    get()._currentFetchToken = fetchToken;
    set({ isHistoryLoading: true, historyError: null });

    try {
      const res = await fetchDeviceHistory(deviceId, range);
      if (get()._currentFetchToken !== fetchToken) return null;

      const rawData = res?.data || [];
      const normalized = normalizeRawHistory(rawData);

      let finalHistory = normalized;
      if (range === 'live') {
        const combined = [...normalized, ...get().history];
        const dedupMap = new Map();
        combined.forEach(p => {
          if (p && p._ts) dedupMap.set(p._ts, p);
        });
        const sorted = Array.from(dedupMap.values()).sort((a, b) => a._ts - b._ts);
        const cutoff = Date.now() - LIVE_RETENTION_MS;
        finalHistory = sorted.filter(p => p._ts >= cutoff);
      }

      set({ 
        history: finalHistory, 
        isHistoryLoading: false, 
        isHistoryMocked: res?.isMocked || false,
        historyError: null 
      });
      return finalHistory;
    } catch (err) {
      if (get()._currentFetchToken !== fetchToken) return null;
      console.error('Failed to load chart history:', err);
      set({ 
        historyError: range === 'live' ? 'Failed to load live history buffer' : 'Failed to load historical data', 
        isHistoryLoading: false 
      });
      return [];
    }
  },

  setTimeRange: async (range) => {
    const { selectedDeviceId } = get();
    try {
      localStorage.setItem('iaq_time_range', range);
    } catch (e) {}

    set({ timeRange: range });

    if (selectedDeviceId) {
      await get().loadChartData(selectedDeviceId, range);
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
    if (get()._initializing || get().isInitialized) {
      return;
    }
    set({ _initializing: true });

    try {
      set((state) => ({ ui: { ...state.ui, state: 'initialLoading' } }));
      
      // 1. Concurrently fetch DB thresholds, device list, and system health
      const [dbThresholds, devices, healthData] = await Promise.all([
        fetchThresholds().catch(err => {
          console.error('Failed to fetch thresholds on init', err);
          return [];
        }),
        fetchDevices().catch(err => {
          console.error('Failed to fetch devices', err);
          return [];
        }),
        healthCheck().catch(() => ({}))
      ]);

      dbThresholds.forEach(t => {
        updateSensorLimits(t.sensorKey, t.warningLimit, t.criticalLimit);
      });

      const defaultDevice = devices.length > 0 ? devices[0].deviceId : null;
      const activeRange = get().timeRange;

      let latestData = null;

      // 2. Fetch chart data through the EXACT SAME shared function and latest telemetry
      if (defaultDevice) {
        const [, lat] = await Promise.all([
          get().loadChartData(defaultDevice, activeRange),
          fetchDeviceLatest(defaultDevice).catch(() => null)
        ]);
        latestData = lat;
      } else {
        set({ history: [], isHistoryLoading: false });
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

      const updatedDevices = (devices || []).map(d => {
        if (d.deviceId === defaultDevice) {
          return {
            ...d,
            latestSensors
          };
        }
        return d;
      });

      set((state) => ({
        deviceList: updatedDevices,
        selectedDeviceId: defaultDevice,
        thresholds: dbThresholds,
        sensors: { latest: latestSensors },
        alarms: {
          activeAlarms: generateAlarmsList(latestSensors, [], new Date().toLocaleTimeString(), defaultDevice, latestData?.name || defaultDevice),
          alarmLog: generateAlarmsList(latestSensors, [], new Date().toLocaleTimeString(), defaultDevice, latestData?.name || defaultDevice),
        },
        device: {
          ...state.device,
          info: {
            ...(updatedDevices.find(d => d.deviceId === defaultDevice) || {}),
            ...latestData
          },
          lastPacketTime: resolveTelemetryTimeMs(latestData, updatedDevices.find(d => d.deviceId === defaultDevice)),
        },
        system: {
          ...state.system,
          backend: { status: healthData?.status === 'ok' ? 'Running' : 'Offline' },
          mqtt: { status: healthData?.mqtt === 'connected' ? 'Connected' : 'Disconnected' },
          mqttStats: healthData?.mqttStats || {},
        },
        ui: { state: 'live' },
        isInitialized: true,
        _initializing: false,
      }));

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
      set({ _initializing: false, isHistoryLoading: false, isInitialized: true });
      set((state) => ({ ui: { ...state.ui, state: 'live' } }));
    }
  },

  selectDevice: async (deviceId) => {
    try {
      set((state) => ({ 
        ui: { ...state.ui, state: 'loadingDevice' }, 
        selectedDeviceId: deviceId, 
      }));
      
      const activeRange = get().timeRange;

      const [, latestData] = await Promise.all([
        get().loadChartData(deviceId, activeRange),
        fetchDeviceLatest(deviceId).catch(() => null)
      ]);

      set((state) => {
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
          isHistoryLoading: false,
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
            lastPacketTime: resolveTelemetryTimeMs(latestData, updatedDevices.find(d => d.deviceId === deviceId)),
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
      const statusUpper = (status || 'OFFLINE').toUpperCase();
      const newList = state.deviceList.map(d => 
        d.deviceId === deviceId ? { ...d, status: statusUpper } : d
      );
      const statusOrder = { 'ONLINE': 0, 'Online': 0, 'WARNING': 1, 'Warning': 1, 'OFFLINE': 2, 'Offline': 2, 'UNASSIGNED': 3 };
      newList.sort((a, b) => {
        const orderA = statusOrder[a.status] ?? 4;
        const orderB = statusOrder[b.status] ?? 4;
        if (orderA !== orderB) return orderA - orderB;
        return new Date(b.lastSeenAt || b.lastSeen || 0).getTime() - new Date(a.lastSeenAt || a.lastSeen || 0).getTime();
      });

      const updatedDeviceInfo = state.selectedDeviceId === deviceId 
        ? { ...state.device.info, status: statusUpper }
        : state.device.info;

      return { 
        deviceList: newList,
        device: {
          ...state.device,
          info: updatedDeviceInfo
        }
      };
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
          
          // Merge, deduplicate by timestamp/_ts, sort ascending, and prune points older than 60 minutes
          const combined = [...state.history, newHistoryPoint];
          const dedupMap = new Map();
          combined.forEach(p => {
            if (p && p._ts) dedupMap.set(p._ts, p);
          });
          const sorted = Array.from(dedupMap.values()).sort((a, b) => a._ts - b._ts);
          const cutoff = now - LIVE_RETENTION_MS;
          newHistory = sorted.filter(p => p._ts >= cutoff);
        }

        const newLen = newHistory.length;
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

  updateDeviceLocation: async (deviceId, location, buildingId = null, floorId = null, roomId = null) => {
    try {
      await updateDeviceLocation(deviceId, location, buildingId, floorId, roomId);
      set((state) => {
        const newList = state.deviceList.map(d => 
          d.deviceId === deviceId ? { ...d, location, buildingId, floorId, roomId } : d
        );
        const updatedInfo = state.device.info.deviceId === deviceId 
          ? { ...state.device.info, location, buildingId, floorId, roomId } 
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
