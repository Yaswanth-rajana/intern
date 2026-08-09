import mqtt from 'mqtt';
import { config } from './config.js';

export function connectMqtt(onConnect, onDisconnect) {
  const protocol = 'mqtts';
  const brokerUrl = `${protocol}://${config.mqtt.host}:${config.mqtt.port}`;
  
  console.log('Connecting to EMQX...');
  
  const options = {
    username: config.mqtt.username,
    password: config.mqtt.password,
    clientId: `iaq_mock_pub_${Math.random().toString(16).slice(3, 11)}`,
    reconnectPeriod: 5000, // Reconnect attempt interval (5s)
    connectTimeout: 30000,
    rejectUnauthorized: config.mqtt.rejectUnauthorized,
  };
  
  const client = mqtt.connect(brokerUrl, options);
  
  let wasConnected = false;
  
  client.on('connect', () => {
    if (wasConnected) {
      console.log('✓ MQTT reconnected');
    } else {
      console.log('==================================================');
      console.log('✓ MQTT connected');
      console.log('==================================================');
      wasConnected = true;
    }
    if (onConnect) onConnect();
  });
  
  client.on('reconnect', () => {
    console.log('↻ Attempting reconnect...');
  });
  
  client.on('close', () => {
    console.log('⚠ MQTT connection lost');
    if (onDisconnect) onDisconnect();
  });
  
  client.on('error', (err) => {
    console.error('MQTT Error:', err.message);
  });
  
  return client;
}
