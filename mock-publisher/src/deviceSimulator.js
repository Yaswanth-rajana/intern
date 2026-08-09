// Backend warning and critical limits for reference
export const BACKEND_LIMITS = {
  AQI: { warningLimit: 50, criticalLimit: 200 },
  CO2: { warningLimit: 800, criticalLimit: 1800 },
  VOC: { warningLimit: 150, criticalLimit: 660 },
  PM1_0: { warningLimit: 25, criticalLimit: 100 },
  PM2_5: { warningLimit: 35, criticalLimit: 150 },
  PM4_0: { warningLimit: 40, criticalLimit: 150 },
  PM10: { warningLimit: 100, criticalLimit: 350 },
  Temperature: { warningLimit: 30, criticalLimit: 35 },
  Humidity: { warningLimit: 70, criticalLimit: 80 },
  NOX: { warningLimit: 100, criticalLimit: 300 }
};

// Sensor variation limits (maximum changes per 30-second interval)
export const SENSOR_WALK_LIMITS = {
  AQI: 3,
  CO2: 25,
  Temperature: 0.3,
  Humidity: 2,
  VOC: 5,
  NOX: 2,
  PM1_0: 2,
  PM2_5: 3,
  PM4_0: 3,
  PM10: 4
};

// Baseline normal ranges for different location types
export const LOCATION_BASELINES = {
  office: {
    location: "Main Office",
    firmwareVersion: "1.2.3",
    hardwareVersion: "T113i-RevA",
    sensors: {
      AQI: { min: 35, max: 48 }, // Sit below warning limit 50
      CO2: { min: 550, max: 780 }, // Sit below warning limit 800
      Temperature: { min: 25, max: 28 }, // Sit below warning limit 30
      Humidity: { min: 45, max: 60 }, // Sit below warning limit 70
      VOC: { min: 30, max: 80 }, // Sit below warning limit 150
      NOX: { min: 5, max: 25 }, // Sit below warning limit 100
      PM1_0: { min: 2, max: 8 }, // Sit below warning limit 25
      PM2_5: { min: 5, max: 15 }, // Sit below warning limit 35
      PM4_0: { min: 8, max: 20 }, // Sit below warning limit 40
      PM10: { min: 10, max: 25 } // Sit below warning limit 100
    }
  },
  conference_room: {
    location: "Conference Room",
    firmwareVersion: "1.2.1",
    hardwareVersion: "T113i-RevB",
    sensors: {
      AQI: { min: 40, max: 49 },
      CO2: { min: 700, max: 795 },
      Temperature: { min: 24, max: 27.5 },
      Humidity: { min: 45, max: 65 },
      VOC: { min: 40, max: 90 },
      NOX: { min: 10, max: 30 },
      PM1_0: { min: 3, max: 10 },
      PM2_5: { min: 6, max: 18 },
      PM4_0: { min: 9, max: 22 },
      PM10: { min: 12, max: 28 }
    }
  },
  factory: {
    location: "Main Factory",
    firmwareVersion: "1.3.0",
    hardwareVersion: "T113i-RevC",
    sensors: {
      AQI: { min: 60, max: 90 }, // Higher baseline for Factory env (triggers normal warning)
      CO2: { min: 700, max: 1050 },
      Temperature: { min: 22, max: 30 },
      Humidity: { min: 40, max: 68 },
      VOC: { min: 50, max: 100 },
      NOX: { min: 20, max: 60 },
      PM1_0: { min: 10, max: 22 },
      PM2_5: { min: 15, max: 32 },
      PM4_0: { min: 20, max: 38 },
      PM10: { min: 25, max: 65 }
    }
  }
};

/**
 * Smooth random walk function.
 * Clamps output within [min, max].
 * If previousValue is outside active bounds (due to mode change), walks gradually towards them.
 */
export function randomWalk(previousValue, maxChange, min, max) {
  if (previousValue < min) {
    const step = (0.5 + Math.random() * 0.5) * maxChange;
    return Math.min(max, previousValue + step);
  } else if (previousValue > max) {
    const step = (0.5 + Math.random() * 0.5) * maxChange;
    return Math.max(min, previousValue - step);
  }
  
  const change = (Math.random() * 2 - 1) * maxChange;
  const newValue = previousValue + change;
  return Math.max(min, Math.min(max, newValue));
}

/**
 * Initialize simulated devices with persistent state.
 */
export function initializeDevices(deviceCount) {
  const devices = [];
  const types = ['office', 'conference_room', 'factory'];
  
  for (let i = 0; i < deviceCount; i++) {
    const type = types[i % types.length];
    const base = LOCATION_BASELINES[type];
    
    let deviceId = '';
    let location = '';
    
    // Explicit requested mapping for the first 3 default devices
    if (i === 0) {
      deviceId = 'DEMO-OFFICE-01';
      location = 'Main Office';
    } else if (i === 1) {
      deviceId = 'DEMO-OFFICE-02';
      location = 'Conference Room';
    } else if (i === 2) {
      deviceId = 'DEMO-FACTORY-01';
      location = 'Main Factory';
    } else {
      // Dynamic fallback names for extra devices
      const cycleIdx = Math.floor(i / 3) + 1;
      if (type === 'office') {
        deviceId = `DEMO-OFFICE-${String(cycleIdx + 2).padStart(2, '0')}`;
        location = `Main Office ${cycleIdx + 2}`;
      } else if (type === 'conference_room') {
        deviceId = `DEMO-CONFERENCE-${String(cycleIdx).padStart(2, '0')}`;
        location = `Conference Room ${cycleIdx}`;
      } else {
        deviceId = `DEMO-FACTORY-${String(cycleIdx + 1).padStart(2, '0')}`;
        location = `Main Factory ${cycleIdx + 1}`;
      }
    }
    
    // Initialize sensor states with random values inside normal ranges
    const sensorStates = {};
    for (const [key, range] of Object.entries(base.sensors)) {
      const initialVal = range.min + Math.random() * (range.max - range.min);
      sensorStates[key] = key === 'Temperature' ? parseFloat(initialVal.toFixed(1)) : Math.round(initialVal);
    }
    
    devices.push({
      deviceId,
      location,
      firmwareVersion: base.firmwareVersion,
      hardwareVersion: base.hardwareVersion,
      type,
      sensors: sensorStates,
      stepIndex: 0
    });
  }
  
  return devices;
}

/**
 * Generate next sensor readings for a device.
 */
export function generateNextReadings(device, mode) {
  const base = LOCATION_BASELINES[device.type];
  const nextSensors = {};
  
  device.stepIndex++;
  
  // 20-minute environmental cycle (40 steps of 30 seconds)
  const cycleDuration = 40;
  const angle = (device.stepIndex / cycleDuration) * 2 * Math.PI;
  const driftFactor = Math.sin(angle); // sinusoidal drift between -1 and 1
  
  for (const [key, prevVal] of Object.entries(device.sensors)) {
    const limits = BACKEND_LIMITS[key];
    const maxChange = SENSOR_WALK_LIMITS[key];
    
    let targetMin, targetMax;
    
    if (mode === 'warning' && limits) {
      // Shift target range slightly above warning limits but below critical limits
      targetMin = limits.warningLimit + 5;
      targetMax = Math.min(limits.criticalLimit - 10, limits.warningLimit + 40);
    } else if (mode === 'critical' && limits) {
      // Shift target range above critical limits
      targetMin = limits.criticalLimit + 5;
      targetMax = limits.criticalLimit + 100;
    } else {
      // Normal mode uses baseline range
      const baseRange = base.sensors[key];
      targetMin = baseRange.min;
      targetMax = baseRange.max;
    }
    
    // Apply environmental diurnal drift offset in normal mode
    // (drift amplitude is 15% of the target range width)
    if (mode === 'normal') {
      const rangeWidth = targetMax - targetMin;
      const driftAmount = rangeWidth * 0.15;
      targetMin += driftFactor * driftAmount;
      targetMax += driftFactor * driftAmount;
    }
    
    const newVal = randomWalk(prevVal, maxChange, targetMin, targetMax);
    nextSensors[key] = key === 'Temperature' ? parseFloat(newVal.toFixed(1)) : Math.round(newVal);
  }
  
  // Save new values to device state
  device.sensors = nextSensors;
  
  // Clone state and format payload
  const timestamp = new Date().toISOString();
  
  // Ensure we include both dot and underscore formats for PM fields (e.g. PM1.0 and PM1_0)
  // to satisfy both user specification and database model compatibility.
  const sensorsPayload = {
    ...nextSensors,
    'PM1.0': nextSensors.PM1_0,
    'PM2.5': nextSensors.PM2_5,
    'PM4.0': nextSensors.PM4_0
  };
  
  return {
    deviceId: device.deviceId,
    timestamp,
    firmwareVersion: device.firmwareVersion,
    hardwareVersion: device.hardwareVersion,
    location: device.location,
    sensors: sensorsPayload
  };
}
