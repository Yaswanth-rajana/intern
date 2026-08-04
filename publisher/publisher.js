import mqtt from 'mqtt';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '.env') });

const {
  MQTT_HOST,
  MQTT_PORT,
  MQTT_USERNAME,
  MQTT_PASSWORD,
  MQTT_TOPIC,
} = process.env;

if (!MQTT_HOST || !MQTT_USERNAME || !MQTT_PASSWORD || !MQTT_TOPIC) {
  console.error('Error: Missing required MQTT configuration in .env');
  process.exit(1);
}

const clientId = `mqtt_pub_${Math.random().toString(16).slice(3)}`;
const hostUrl = `mqtts://${MQTT_HOST}:${MQTT_PORT || 8883}`;

const options = {
  clientId,
  clean: true,
  connectTimeout: 4000,
  username: MQTT_USERNAME,
  password: MQTT_PASSWORD,
  reconnectPeriod: 1000, // Reconnect automatically every 1000ms if disconnected
};

console.log(`Connecting to MQTT broker at ${hostUrl}...`);

const client = mqtt.connect(hostUrl, options);

client.on('connect', () => {
  console.log('Connected to MQTT broker securely over TLS.');
  
  // Start publishing messages every 30 seconds
  setInterval(publishTelemetry, 30000);
});

client.on('error', (err) => {
  console.error('MQTT connection error:', err);
});

client.on('offline', () => {
  console.warn('MQTT client is offline. Will try to reconnect automatically.');
});

client.on('reconnect', () => {
  console.log('Reconnecting to MQTT broker...');
});

function random(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

const getIndianTimestamp = () => {
  return new Date().toLocaleString('sv-SE', { timeZone: 'Asia/Kolkata' }).replace(' ', 'T') + '+05:30';
};

function publishTelemetry() {
  const deviceId = process.argv[2] || "IAQ-0001";
  
  const payload = {
    deviceId: deviceId,
    firmwareVersion: "1.0.0",
    hardwareVersion: "T113i-RevA",
    sensors: {
      "AQI": random(20, 180),
      "CO2": random(400, 1900),
      "Humidity": random(30, 80),
      "Temperature": random(18, 38),
      "VOC": random(0, 300),
      "NOX": random(0, 100),
      "PM1.0": random(1, 40),
      "PM2.5": random(1, 80),
      "PM4.0": random(1, 120),
      "PM10": random(1, 200)
    },
    timestamp: getIndianTimestamp()
  };

  const message = JSON.stringify(payload);

  client.publish(MQTT_TOPIC, message, { qos: 1 }, (err) => {
    if (err) {
      console.error(`Failed to publish message:`, err);
    } else {
      console.log(`[${payload.timestamp}] Published to ${MQTT_TOPIC}:`, message);
    }
  });
}
