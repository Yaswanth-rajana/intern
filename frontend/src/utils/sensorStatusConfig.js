export const SENSOR_CONFIG = {
  AQI: {
    unit: '',
    min: 0,
    max: 500,
    thresholds: [
      { max: 50, label: 'Good', color: 'green' },
      { max: 100, label: 'Moderate', color: 'yellow' },
      { max: 150, label: 'Poor', color: 'orange' },
      { max: 200, label: 'Unhealthy', color: 'red' },
      { max: Infinity, label: 'Hazardous', color: 'red' },
    ]
  },
  CO2: {
    unit: 'ppm',
    min: 400,
    max: 2000,
    thresholds: [
      { max: 600, label: 'Fresh Air', color: 'green' },
      { max: 800, label: 'Good', color: 'green' },
      { max: 1200, label: 'Elevated', color: 'yellow' },
      { max: 1800, label: 'Poor Ventilation', color: 'orange' },
      { max: Infinity, label: 'Dangerous', color: 'red' },
    ]
  },
  VOC: {
    unit: 'ppb',
    min: 0,
    max: 1000,
    thresholds: [
      { max: 65, label: 'Clean', color: 'green' },
      { max: 150, label: 'Low', color: 'green' },
      { max: 300, label: 'Elevated', color: 'yellow' },
      { max: 660, label: 'High', color: 'orange' },
      { max: Infinity, label: 'Toxic', color: 'red' },
    ]
  },
  PM1_0: {
    unit: 'µg/m³',
    min: 0,
    max: 150,
    thresholds: [
      { max: 10, label: 'Clean', color: 'green' },
      { max: 25, label: 'Acceptable', color: 'green' },
      { max: 50, label: 'Elevated', color: 'yellow' },
      { max: 100, label: 'Unhealthy', color: 'orange' },
      { max: Infinity, label: 'Hazardous', color: 'red' },
    ]
  },
  PM2_5: {
    unit: 'µg/m³',
    min: 0,
    max: 200,
    thresholds: [
      { max: 15, label: 'Clean', color: 'green' },
      { max: 35, label: 'Acceptable', color: 'green' },
      { max: 75, label: 'Elevated', color: 'yellow' },
      { max: 150, label: 'Unhealthy', color: 'orange' },
      { max: Infinity, label: 'Hazardous', color: 'red' },
    ]
  },
  PM4_0: {
    unit: 'µg/m³',
    min: 0,
    max: 200,
    thresholds: [
      { max: 20, label: 'Clean', color: 'green' },
      { max: 40, label: 'Acceptable', color: 'green' },
      { max: 80, label: 'Elevated', color: 'yellow' },
      { max: 150, label: 'Unhealthy', color: 'orange' },
      { max: Infinity, label: 'Hazardous', color: 'red' },
    ]
  },
  PM10: {
    unit: 'µg/m³',
    min: 0,
    max: 500,
    thresholds: [
      { max: 50, label: 'Clean', color: 'green' },
      { max: 100, label: 'Acceptable', color: 'green' },
      { max: 250, label: 'Dusty', color: 'yellow' },
      { max: 350, label: 'High Dust', color: 'orange' },
      { max: Infinity, label: 'Severe Dust', color: 'red' },
    ]
  },
  Temperature: {
    unit: '°C',
    min: 10,
    max: 50,
    thresholds: [
      { max: 19.99, label: 'Cool', color: 'blue' },
      { max: 27, label: 'Comfortable', color: 'green' },
      { max: 30, label: 'Warm', color: 'yellow' },
      { max: 35, label: 'Hot', color: 'orange' },
      { max: Infinity, label: 'Extreme Heat', color: 'red' },
    ]
  },
  Humidity: {
    unit: '%',
    min: 0,
    max: 100,
    thresholds: [
      { max: 29.99, label: 'Dry', color: 'orange' },
      { max: 60, label: 'Comfortable', color: 'green' },
      { max: 70, label: 'Humid', color: 'yellow' },
      { max: 80, label: 'Very Humid', color: 'orange' },
      { max: Infinity, label: 'Excessive', color: 'red' },
    ]
  }
};

export function getSensorStatus(key, value) {
  const config = SENSOR_CONFIG[key];
  if (!config) {
    return { label: 'Unknown', color: 'gray' };
  }
  
  for (const t of config.thresholds) {
    if (value <= t.max) {
      return { label: t.label, color: t.color };
    }
  }
  return { label: 'Unknown', color: 'gray' };
}

export function updateSensorLimits(key, warningLimit, criticalLimit) {
  if (key === 'AQI') return; // Fixed standard scale (0-50 Good, 51-100 Moderate, 101-150 Poor, 151-200 Unhealthy)
  const config = SENSOR_CONFIG[key];
  if (!config || !config.thresholds || config.thresholds.length < 5) return;

  if (key === 'Temperature') {
    config.thresholds[1].max = warningLimit;
    config.thresholds[2].max = Math.round((warningLimit + criticalLimit) / 2 * 100) / 100;
    config.thresholds[3].max = criticalLimit;
  } else if (key === 'Humidity') {
    config.thresholds[1].max = warningLimit;
    config.thresholds[2].max = Math.round((warningLimit + criticalLimit) / 2);
    config.thresholds[3].max = criticalLimit;
  } else {
    config.thresholds[0].max = Math.round(warningLimit * 0.5);
    config.thresholds[1].max = warningLimit;
    config.thresholds[2].max = Math.round((warningLimit + criticalLimit) / 2);
    config.thresholds[3].max = criticalLimit;
  }
}
