import Device from '../models/Device.js';
import SensorReading from '../models/SensorReading.js';
import Tenant from '../models/Tenant.js';

export const DEFAULT_TIMEZONE = process.env.APP_TIMEZONE || 'Asia/Kolkata';

/**
 * Get configured device inactivity threshold in seconds (default 120s)
 */
export const getInactivityThresholdSeconds = () => {
  const timeoutSec = parseInt(process.env.DEVICE_OFFLINE_TIMEOUT_SECONDS, 10);
  return !isNaN(timeoutSec) && timeoutSec > 0 ? timeoutSec : 120;
};

/**
 * Format duration in seconds into HH:MM:SS string for CSV / UI display
 */
export const formatDurationHMS = (totalSeconds) => {
  const secs = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(secs / 3600);
  const minutes = Math.floor((secs % 3600) / 60);
  const seconds = secs % 60;
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
};

/**
 * Calculate timezone offset in milliseconds for a target date and timeZone
 */
export const getTimeZoneOffsetMs = (date, timeZone = DEFAULT_TIMEZONE) => {
  const format = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hour12: false
  });
  
  const parts = format.formatToParts(date);
  const map = {};
  parts.forEach(p => { map[p.type] = p.value; });

  let hour = parseInt(map.hour, 10);
  if (hour === 24) hour = 0;

  const tzDate = new Date(Date.UTC(
    parseInt(map.year, 10),
    parseInt(map.month, 10) - 1,
    parseInt(map.day, 10),
    hour,
    parseInt(map.minute, 10),
    parseInt(map.second, 10)
  ));

  return tzDate.getTime() - date.getTime();
};

/**
 * Parse YYYY-MM-DD in display timezone into UTC day bounds [dayStart, dayEnd]
 * For example: 2026-08-20 in Asia/Kolkata ->
 *   dayStart: 2026-08-19 18:30:00.000 UTC (00:00:00 IST)
 *   dayEnd:   2026-08-20 18:29:59.999 UTC (23:59:59.999 IST)
 */
export const parseDayBoundsInTimeZone = (dateStr, timeZone = DEFAULT_TIMEZONE) => {
  let targetDate;
  if (dateStr && typeof dateStr === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateStr.trim())) {
    targetDate = dateStr.trim();
  } else {
    // Current date in target timeZone
    const parts = new Intl.DateTimeFormat('en-GB', {
      timeZone,
      year: 'numeric', month: '2-digit', day: '2-digit'
    }).formatToParts(new Date());

    const map = {};
    parts.forEach(p => { map[p.type] = p.value; });
    targetDate = `${map.year}-${map.month}-${map.day}`;
  }

  const [year, month, day] = targetDate.split('-').map(Number);
  
  // Approximate UTC date for offset calculation
  const approxUtc = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
  const offsetMs = getTimeZoneOffsetMs(approxUtc, timeZone);

  // Exact day start (00:00:00.000 in target timeZone converted to UTC Date)
  const dayStart = new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0) - offsetMs);
  // Exact day end (23:59:59.999 in target timeZone converted to UTC Date)
  const dayEnd = new Date(Date.UTC(year, month - 1, day, 23, 59, 59, 999) - offsetMs);

  return { targetDate, dayStart, dayEnd, timeZone, offsetMs };
};

/**
 * Format Date object to HH:MM:SS string in target timeZone
 */
export const formatTimeHMSInTimeZone = (dateObj, timeZone = DEFAULT_TIMEZONE) => {
  if (!dateObj) return '-';
  const d = new Date(dateObj);
  if (isNaN(d.getTime())) return '-';

  const format = new Intl.DateTimeFormat('en-GB', {
    timeZone,
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false
  });
  return format.format(d);
};

/**
 * Format Date object to full YYYY-MM-DD HH:MM:SS string in target timeZone
 */
export const formatDateTimeInTimeZone = (dateObj, timeZone = DEFAULT_TIMEZONE) => {
  if (!dateObj) return null;
  const d = new Date(dateObj);
  if (isNaN(d.getTime())) return null;

  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone,
    year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hour12: false
  }).formatToParts(d);

  const map = {};
  parts.forEach(p => { map[p.type] = p.value; });
  let hour = map.hour;
  if (hour === '24') hour = '00';

  return `${map.year}-${map.month}-${map.day} ${hour}:${map.minute}:${map.second}`;
};

/**
 * Calculate Daily Device Activity Report for a target date with tenant & device scoping in display timezone.
 */
export const getDeviceActivityForDay = async ({ date, tenantId, deviceId, timeZone = DEFAULT_TIMEZONE }) => {
  const thresholdSec = getInactivityThresholdSeconds();
  const thresholdMs = thresholdSec * 1000;

  const { targetDate, dayStart, dayEnd, timeZone: activeZone } = parseDayBoundsInTimeZone(date, timeZone);
  const dayStartMs = dayStart.getTime();
  const dayEndMs = dayEnd.getTime();

  // Buffer bounds to detect sessions crossing midnight in target timezone
  const queryStartMs = dayStartMs - thresholdMs;
  const queryEndMs = dayEndMs + thresholdMs;

  // 1. Build Device Filter
  const deviceQuery = {};
  if (tenantId) {
    deviceQuery.tenantId = tenantId;
  }
  if (deviceId) {
    deviceQuery.deviceId = deviceId;
  }

  const registeredDevices = await Device.find(deviceQuery)
    .populate('tenantId', 'name slug')
    .lean();

  if (registeredDevices.length === 0) {
    return {
      date: targetDate,
      timeZone: activeZone,
      summary: {
        totalDevices: 0,
        activeDevices: 0,
        inactiveDevices: 0,
        totalReadings: 0,
        activePeriods: 0,
      },
      devices: [],
    };
  }

  const targetDeviceIds = registeredDevices.map(d => d.deviceId);

  // 2. Fetch Telemetry Readings within Buffer Window
  const readings = await SensorReading.find(
    {
      deviceId: { $in: targetDeviceIds },
      timestamp: { $gte: new Date(queryStartMs), $lte: new Date(queryEndMs) },
    },
    { deviceId: 1, timestamp: 1 }
  )
    .sort({ timestamp: 1 })
    .lean();

  // Group reading timestamps by deviceId
  const readingsMap = new Map();
  targetDeviceIds.forEach(id => readingsMap.set(id, []));

  readings.forEach(r => {
    const ts = new Date(r.timestamp).getTime();
    if (readingsMap.has(r.deviceId)) {
      readingsMap.get(r.deviceId).push(ts);
    }
  });

  // Track overall summary statistics
  let totalReadingsInDay = 0;
  let totalActivePeriodsInDay = 0;
  let activeDevicesCount = 0;
  let inactiveDevicesCount = 0;

  const deviceReports = [];

  // 3. Process Each Device
  for (const dev of registeredDevices) {
    const devId = dev.deviceId;
    const tsList = readingsMap.get(devId) || [];

    // Count readings strictly falling within day bounds [dayStartMs, dayEndMs]
    const dayReadingsCount = tsList.filter(ts => ts >= dayStartMs && ts <= dayEndMs).length;
    totalReadingsInDay += dayReadingsCount;

    // Cluster readings into active sessions
    const rawSessions = [];
    if (tsList.length > 0) {
      let currentCluster = [tsList[0]];

      for (let i = 1; i < tsList.length; i++) {
        const prevTs = tsList[i - 1];
        const currTs = tsList[i];

        if (currTs - prevTs <= thresholdMs) {
          currentCluster.push(currTs);
        } else {
          const firstTs = currentCluster[0];
          const lastTs = currentCluster[currentCluster.length - 1];
          rawSessions.push({
            rawStart: firstTs,
            rawEnd: lastTs + thresholdMs,
            readings: currentCluster,
            firstTs,
            lastTs,
          });
          currentCluster = [currTs];
        }
      }

      if (currentCluster.length > 0) {
        const firstTs = currentCluster[0];
        const lastTs = currentCluster[currentCluster.length - 1];
        rawSessions.push({
          rawStart: firstTs,
          rawEnd: lastTs + thresholdMs,
          readings: currentCluster,
          firstTs,
          lastTs,
        });
      }
    }

    // Merge any adjacent/overlapping raw active sessions
    const mergedSessions = [];
    for (const sess of rawSessions) {
      if (mergedSessions.length === 0) {
        mergedSessions.push(sess);
      } else {
        const lastSess = mergedSessions[mergedSessions.length - 1];
        if (sess.rawStart <= lastSess.rawEnd) {
          lastSess.rawEnd = Math.max(lastSess.rawEnd, sess.rawEnd);
          lastSess.readings = lastSess.readings.concat(sess.readings);
          lastSess.lastTs = Math.max(lastSess.lastTs, sess.lastTs);
        } else {
          mergedSessions.push(sess);
        }
      }
    }

    // 4. Generate Timeline of ACTIVE and INACTIVE Periods & Clip to Day Window [dayStartMs, dayEndMs]
    const periods = [];
    let currentTime = dayStartMs;

    for (const sess of mergedSessions) {
      // Gap before active session
      if (sess.rawStart > currentTime) {
        const inactiveEnd = Math.min(sess.rawStart, dayEndMs);
        if (currentTime < inactiveEnd) {
          const durSec = Math.round((inactiveEnd - currentTime) / 1000);
          periods.push({
            status: 'INACTIVE',
            startTime: new Date(currentTime).toISOString(),
            endTime: new Date(inactiveEnd).toISOString(),
            startTimeDisplay: formatTimeHMSInTimeZone(currentTime, activeZone),
            endTimeDisplay: formatTimeHMSInTimeZone(inactiveEnd, activeZone),
            durationSeconds: durSec,
            readingCount: 0,
            firstReading: null,
            lastReading: null,
            firstReadingDisplay: '-',
            lastReadingDisplay: '-',
          });
        }
        currentTime = inactiveEnd;
      }

      // Clip active session to day window
      const clippedActiveStart = Math.max(sess.rawStart, dayStartMs);
      const clippedActiveEnd = Math.min(sess.rawEnd, dayEndMs);

      if (clippedActiveStart < clippedActiveEnd) {
        const readingsInClippedPeriod = sess.readings.filter(ts => ts >= clippedActiveStart && ts <= clippedActiveEnd);
        const durSec = Math.round((clippedActiveEnd - clippedActiveStart) / 1000);

        periods.push({
          status: 'ACTIVE',
          startTime: new Date(clippedActiveStart).toISOString(),
          endTime: new Date(clippedActiveEnd).toISOString(),
          startTimeDisplay: formatTimeHMSInTimeZone(clippedActiveStart, activeZone),
          endTimeDisplay: formatTimeHMSInTimeZone(clippedActiveEnd, activeZone),
          durationSeconds: durSec,
          readingCount: readingsInClippedPeriod.length,
          firstReading: new Date(sess.firstTs).toISOString(),
          lastReading: new Date(sess.lastTs).toISOString(),
          firstReadingDisplay: formatTimeHMSInTimeZone(sess.firstTs, activeZone),
          lastReadingDisplay: formatTimeHMSInTimeZone(sess.lastTs, activeZone),
        });

        currentTime = clippedActiveEnd;
      }
    }

    // Fill remaining trailing time in day as INACTIVE if needed
    if (currentTime < dayEndMs) {
      const durSec = Math.round((dayEndMs - currentTime) / 1000);
      periods.push({
        status: 'INACTIVE',
        startTime: new Date(currentTime).toISOString(),
        endTime: new Date(dayEndMs).toISOString(),
        startTimeDisplay: formatTimeHMSInTimeZone(currentTime, activeZone),
        endTimeDisplay: formatTimeHMSInTimeZone(dayEndMs, activeZone),
        durationSeconds: durSec,
        readingCount: 0,
        firstReading: null,
        lastReading: null,
        firstReadingDisplay: '-',
        lastReadingDisplay: '-',
      });
    }

    // Count active periods for summary
    const deviceActivePeriods = periods.filter(p => p.status === 'ACTIVE');
    if (deviceActivePeriods.length > 0) {
      activeDevicesCount++;
      totalActivePeriodsInDay += deviceActivePeriods.length;
    } else {
      inactiveDevicesCount++;
    }

    const tenantName = dev.tenantId?.name || 'Unassigned';
    const tenantIdStr = dev.tenantId?._id ? dev.tenantId._id.toString() : null;

    deviceReports.push({
      deviceId: dev.deviceId,
      deviceName: dev.name || dev.deviceId,
      tenantId: tenantIdStr,
      tenantName,
      location: dev.location || 'Unallocated',
      periods,
    });
  }

  return {
    date: targetDate,
    timeZone: activeZone,
    summary: {
      totalDevices: registeredDevices.length,
      activeDevices: activeDevicesCount,
      inactiveDevices: inactiveDevicesCount,
      totalReadings: totalReadingsInDay,
      activePeriods: totalActivePeriodsInDay,
    },
    devices: deviceReports,
  };
};

/**
 * Helper to convert a report object into flat rows for CSV export
 */
export const formatReportRowsForCSV = (reportData) => {
  const rows = [];
  const reportDate = reportData.date || '';
  const reportTz = reportData.timeZone || DEFAULT_TIMEZONE;

  for (const dev of reportData.devices || []) {
    for (const period of dev.periods || []) {
      const startTimeStr = period.startTimeDisplay || formatTimeHMSInTimeZone(period.startTime, reportTz);
      const endTimeStr = period.endTimeDisplay || formatTimeHMSInTimeZone(period.endTime, reportTz);
      const durationStr = formatDurationHMS(period.durationSeconds);
      const firstReadingStr = period.firstReadingDisplay && period.firstReadingDisplay !== '-'
        ? period.firstReadingDisplay 
        : (period.firstReading ? formatTimeHMSInTimeZone(period.firstReading, reportTz) : '');
      const lastReadingStr = period.lastReadingDisplay && period.lastReadingDisplay !== '-'
        ? period.lastReadingDisplay 
        : (period.lastReading ? formatTimeHMSInTimeZone(period.lastReading, reportTz) : '');

      rows.push({
        Date: reportDate,
        Tenant: dev.tenantName || 'Unassigned',
        'Device ID': dev.deviceId,
        'Device Name': dev.deviceName,
        Status: period.status,
        'Start Time': startTimeStr,
        'End Time': endTimeStr,
        Duration: durationStr,
        'Reading Count': period.readingCount,
        'First Reading Timestamp': firstReadingStr,
        'Last Reading Timestamp': lastReadingStr,
        Timezone: reportTz,
      });
    }
  }

  return rows;
};
