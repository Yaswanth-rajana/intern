import dotenv from 'dotenv';
dotenv.config();

export const mqttConfig = {
  host: process.env.MQTT_HOST,
  port: parseInt(process.env.MQTT_PORT || '8883', 10),
  username: process.env.MQTT_USERNAME,
  password: process.env.MQTT_PASSWORD,
  protocol: 'mqtts', // Secure MQTT over TLS
  reconnectPeriod: 5000, // Auto reconnect every 5 seconds
  connectTimeout: 30000,
  clientId: `iaq_backend_${Math.random().toString(16).slice(3)}`, // Unique client ID
  rejectUnauthorized: true // Ensure TLS verification
};

export const mqttTopic = (process.env.MQTT_TOPIC || 'iaq/device/#,iaq/devices/#,iaq/controller/data')
  .split(',')
  .map(t => t.trim())
  .filter(Boolean);

