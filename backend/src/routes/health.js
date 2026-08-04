import express from 'express';
import { getMqttStatus, getLatestPayload, getMqttStats, getDevicesStats } from '../services/mqttService.js';
import { mqttTopic } from '../config/mqtt.js';

const router = express.Router();

/**
 * GET /health
 * Returns health status of the application including MQTT state and uptime.
 */
router.get('/', (req, res) => {
  const mqttStats = getMqttStats();
  const devicesStats = getDevicesStats();
  res.json({
    status: 'ok',
    mqtt: mqttStats.status,
    topic: mqttStats.topic,
    uptime: mqttStats.uptime,
    mqttStats: mqttStats,
    ...devicesStats
  });
});

export default router;
