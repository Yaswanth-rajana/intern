export const mockSensorData = {
  deviceId: "IAQ-0001",
  location: "Manufacturing Floor A",
  firmwareVersion: "1.0.0",
  hardwareVersion: "T113i-RevA",
  status: "Online",
  lastUpdated: "2026-08-02 18:00",
  sensors: {
    AQI: 52,
    CO2: 650,
    Temperature: 27,
    Humidity: 54,
    VOC: 82,
    NOX: 45,
    PM1_0: 8,
    PM4_0: 25,
    PM10: 45,
    PM2_5: 16,
    PM1: 8
  }
};

export const mockAlarms = [
  { time: "16:55:01", message: "High CO₂", sub: "1450 ppm", severity: "Critical" },
  { time: "16:12:45", message: "Ventilation degraded", sub: "Airflow 45%", severity: "Medium" },
  { time: "15:40:22", message: "VOC peak detected", sub: "320 ppb", severity: "High" },
  { time: "14:15:10", message: "Sensor calibration", sub: "Required", severity: "Low" },
];

export const mockChartData = [
  { time: '10:00', AQI: 40, CO2: 450, Temperature: 22, Humidity: 45 },
  { time: '12:00', AQI: 45, CO2: 500, Temperature: 24, Humidity: 48 },
  { time: '14:00', AQI: 60, CO2: 800, Temperature: 26, Humidity: 50 },
  { time: '16:00', AQI: 55, CO2: 700, Temperature: 27, Humidity: 52 },
  { time: '18:00', AQI: 52, CO2: 650, Temperature: 27, Humidity: 54 },
];
