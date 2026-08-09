import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables from local .env
dotenv.config({ path: path.join(__dirname, '../.env') });

export const config = {
  mqtt: {
    host: process.env.MQTT_HOST,
    port: parseInt(process.env.MQTT_PORT || '8883', 10),
    username: process.env.MQTT_USERNAME,
    password: process.env.MQTT_PASSWORD,
    topicPrefix: process.env.MQTT_TOPIC_PREFIX || 'iaq/device',
    rejectUnauthorized: process.env.MQTT_REJECT_UNAUTHORIZED !== 'false', // Defaults to true
  },
  publishInterval: parseInt(process.env.PUBLISH_INTERVAL || '30000', 10),
  deviceCount: parseInt(process.env.DEVICE_COUNT || '3', 10),
  demoMode: process.env.DEMO_MODE || 'normal', // 'normal', 'warning', 'critical'
};
