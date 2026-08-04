import mqtt from 'mqtt';
import dotenv from 'dotenv';
dotenv.config();
const { MQTT_HOST, MQTT_PORT, MQTT_USERNAME, MQTT_PASSWORD, MQTT_TOPIC } = process.env;
const hostUrl = `mqtts://${MQTT_HOST}:${MQTT_PORT || 8883}`;
const client = mqtt.connect(hostUrl, {
  clientId: `mqtt_pub_test_device`,
  clean: true,
  connectTimeout: 4000,
  username: MQTT_USERNAME,
  password: MQTT_PASSWORD,
});
client.on('connect', () => {
  setInterval(() => {
    const payload = {
      deviceId: "Factory-02",
      firmwareVersion: "2.1.0",
      hardwareVersion: "F-Series",
      sensors: {
        "AQI": 85,
        "CO2": 800,
        "Humidity": 45,
        "Temperature": 24,
      },
      timestamp: new Date().toISOString()
    };
    client.publish(MQTT_TOPIC, JSON.stringify(payload), { qos: 1 });
  }, 1000);
});
