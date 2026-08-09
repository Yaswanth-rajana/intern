import { config } from './config.js';
import { initializeDevices, generateNextReadings } from './deviceSimulator.js';
import { connectMqtt } from './mqttClient.js';

console.log('Starting mock publisher in mode:', config.demoMode);
console.log(`Simulating ${config.deviceCount} devices, publishing every ${config.publishInterval / 1000}s`);

const devices = initializeDevices(config.deviceCount);

let client = null;
let intervalId = null;

function publishCycle() {
  console.log(`\n==================================================`);
  devices.forEach(device => {
    const payload = generateNextReadings(device, config.demoMode);
    const topic = `${config.mqtt.topicPrefix}/${device.deviceId}`;
    
    // Log output formatted precisely as requested
    console.log(`\n📡 ${device.deviceId}`);
    console.log(`Topic: ${topic}`);
    console.log(`AQI: ${payload.sensors.AQI} | CO2: ${payload.sensors.CO2} ppm | Temp: ${payload.sensors.Temperature}°C | Humidity: ${payload.sensors.Humidity}%`);
    console.log(`PM2.5: ${payload.sensors.PM2_5} | VOC: ${payload.sensors.VOC}`);
    
    if (client && client.connected) {
      client.publish(topic, JSON.stringify(payload), { qos: 1 }, (err) => {
        if (err) {
          console.error(`✗ Failed to publish payload for ${device.deviceId}:`, err.message);
        }
      });
    } else {
      console.log(`⚠ Skipped publishing (MQTT client not connected)`);
    }
  });
}

// Establish MQTT connection
client = connectMqtt(() => {
  // Start publishing cycle immediately and then every interval
  if (!intervalId) {
    publishCycle();
    intervalId = setInterval(publishCycle, config.publishInterval);
  }
});

// Handle graceful shutdown
let shuttingDown = false;
const shutdown = () => {
  if (shuttingDown) return;
  shuttingDown = true;
  
  console.log('\nStopping mock publisher...');
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
  }
  
  console.log('Disconnecting MQTT...');
  if (client) {
    client.end(false, () => {
      console.log('✓ MQTT disconnected');
      console.log('✓ Publisher stopped');
      process.exit(0);
    });
  } else {
    console.log('✓ Publisher stopped');
    process.exit(0);
  }
};

process.on('SIGINT', shutdown);
process.on('SIGTERM', shutdown);
