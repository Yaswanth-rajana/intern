import express from 'express';
import { getLatestPayload, getHistory, getDeviceList, updateDeviceLocation } from '../services/mqttService.js';
import SensorHistory from '../models/SensorHistory.js';
import { parse } from 'json2csv';
import { authenticateJWT, requireAdmin } from '../middleware/auth.js';

const router = express.Router();

// Protect all routes under /devices
router.use(authenticateJWT);

router.get('/', (req, res) => {
  res.json(getDeviceList());
});

router.patch('/:deviceId', requireAdmin, async (req, res) => {
  try {
    const { deviceId } = req.params;
    const { location } = req.body;

    if (location === undefined) {
      return res.status(400).json({ error: 'Location is required' });
    }

    await updateDeviceLocation(deviceId, location);
    res.json({ message: 'Device location updated successfully', deviceId, location });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update location: ' + error.message });
  }
});

router.get('/:deviceId/latest', (req, res) => {
  const latest = getLatestPayload(req.params.deviceId);
  if (!latest) {
    return res.status(404).json({ error: 'No data available yet' });
  }
  res.json(latest);
});

router.get('/:deviceId/history', async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 100;
    const history = await getHistory(req.params.deviceId, page, limit);
    res.json(history);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch history' });
  }
});

router.get('/export/csv', async (req, res) => {
  try {
    const data = await SensorHistory.find({}).sort({ timestamp: -1 }).lean();
    if (data.length === 0) {
      return res.status(404).send('No data available for export.');
    }
    const csv = parse(data);
    res.header('Content-Type', 'text/csv');
    res.attachment('sensor_history.csv');
    return res.send(csv);
  } catch (error) {
    res.status(500).json({ error: 'Failed to export CSV' });
  }
});

router.get('/export/json', async (req, res) => {
  try {
    const data = await SensorHistory.find({}).sort({ timestamp: -1 }).lean();
    res.header('Content-Type', 'application/json');
    res.attachment('sensor_history.json');
    return res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to export JSON' });
  }
});

export default router;
