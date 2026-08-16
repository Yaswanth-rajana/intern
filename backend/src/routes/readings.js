import express from 'express';
import { parse } from 'json2csv';
import SensorReading from '../models/SensorReading.js';
import { authenticateJWT, applyTenantFilter } from '../middleware/auth.js';
import { verifyDeviceTenantAccess } from '../services/mqttService.js';

const router = express.Router();

// Apply JWT authentication to all readings API endpoints
router.use(authenticateJWT);

// GET /api/readings - Get paginated historical readings
router.get('/', async (req, res) => {
  try {
    let query = applyTenantFilter(req);
    const { deviceId, startDate, endDate } = req.query;

    // 1. Device scope & authorization validation
    if (deviceId) {
      const hasAccess = await verifyDeviceTenantAccess(deviceId, req.user);
      if (!hasAccess) {
        return res.status(403).json({ error: 'Access denied: You do not have permissions for this device' });
      }
      query.deviceId = deviceId;
    }

    // 2. Date range validation
    if (startDate || endDate) {
      query.timestamp = {};
      if (startDate) {
        const start = new Date(startDate);
        if (isNaN(start.getTime())) {
          return res.status(400).json({ error: 'Invalid startDate format' });
        }
        query.timestamp.$gte = start;
      }
      if (endDate) {
        const end = new Date(endDate);
        if (isNaN(end.getTime())) {
          return res.status(400).json({ error: 'Invalid endDate format' });
        }
        query.timestamp.$lte = end;
      }

      if (query.timestamp.$gte && query.timestamp.$lte && query.timestamp.$gte > query.timestamp.$lte) {
        return res.status(400).json({ error: 'startDate cannot be after endDate' });
      }
    }

    // 3. Pagination parsing and validation (max page size 100)
    let page = parseInt(req.query.page, 10);
    if (isNaN(page) || page < 1) page = 1;

    let limit = parseInt(req.query.limit, 10);
    if (isNaN(limit) || limit < 1) limit = 50;
    if (limit > 100) limit = 100;

    // 4. Query execution
    const total = await SensorReading.countDocuments(query);
    const totalPages = Math.ceil(total / limit);

    const data = await SensorReading.find(query)
      .sort({ timestamp: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    res.json({
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages
      }
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch historical readings: ' + error.message });
  }
});

// GET /api/readings/latest - Retrieve the latest reading for a selected device
router.get('/latest', async (req, res) => {
  try {
    const { deviceId } = req.query;
    if (!deviceId) {
      return res.status(400).json({ error: 'deviceId query parameter is required' });
    }

    const hasAccess = await verifyDeviceTenantAccess(deviceId, req.user);
    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied: You do not have permissions for this device' });
    }

    const latest = await SensorReading.findOne({ deviceId })
      .sort({ timestamp: -1 })
      .lean();

    if (!latest) {
      return res.status(404).json({ error: 'No data available for this device' });
    }

    res.json(latest);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch latest reading: ' + error.message });
  }
});

// GET /api/readings/export/csv - Export historical readings as CSV (10k limit)
router.get('/export/csv', async (req, res) => {
  try {
    let query = applyTenantFilter(req);
    const { deviceId, startDate, endDate } = req.query;

    if (deviceId) {
      const hasAccess = await verifyDeviceTenantAccess(deviceId, req.user);
      if (!hasAccess) {
        return res.status(403).json({ error: 'Access denied' });
      }
      query.deviceId = deviceId;
    }

    if (startDate || endDate) {
      query.timestamp = {};
      if (startDate) {
        const start = new Date(startDate);
        if (isNaN(start.getTime())) {
          return res.status(400).json({ error: 'Invalid startDate format' });
        }
        query.timestamp.$gte = start;
      }
      if (endDate) {
        const end = new Date(endDate);
        if (isNaN(end.getTime())) {
          return res.status(400).json({ error: 'Invalid endDate format' });
        }
        query.timestamp.$lte = end;
      }
      if (query.timestamp.$gte && query.timestamp.$lte && query.timestamp.$gte > query.timestamp.$lte) {
        return res.status(400).json({ error: 'startDate cannot be after endDate' });
      }
    }

    // Safety limit of 10,000 records to protect backend memory
    const data = await SensorReading.find(query)
      .sort({ timestamp: -1 })
      .limit(10000)
      .lean();

    if (data.length === 0) {
      return res.status(404).send('No data available for export with current filters.');
    }

    // Transform fields for clean CSV export
    const formattedData = data.map(item => ({
      Timestamp: item.timestamp ? new Date(item.timestamp).toISOString() : '',
      ReceivedAt: item.receivedAt ? new Date(item.receivedAt).toISOString() : '',
      DeviceID: item.deviceId,
      AQI: item.AQI,
      CO2: item.CO2,
      Temperature: item.Temperature,
      Humidity: item.Humidity,
      VOC: item.VOC,
      NOX: item.NOX,
      PM1_0: item.PM1_0,
      PM2_5: item.PM2_5,
      PM4_0: item.PM4_0,
      PM10: item.PM10,
      FirmwareVersion: item.firmwareVersion,
      HardwareVersion: item.hardwareVersion
    }));

    const csv = parse(formattedData);
    res.header('Content-Type', 'text/csv');
    res.attachment('sensor_readings_history.csv');
    return res.send(csv);
  } catch (error) {
    res.status(500).json({ error: 'Failed to export CSV: ' + error.message });
  }
});

export default router;
