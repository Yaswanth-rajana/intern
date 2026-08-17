import express from 'express';
import { 
  getLatestPayload, 
  getHistory, 
  getDeviceList, 
  updateDeviceLocation, 
  verifyDeviceTenantAccess,
  registerDeviceInCache
} from '../services/mqttService.js';
import Device from '../models/Device.js';
import SensorHistory from '../models/SensorHistory.js';
import { parse } from 'json2csv';
import { authenticateJWT, requireRole, applyTenantFilter } from '../middleware/auth.js';
import { logAudit } from '../models/AuditLog.js';

const router = express.Router();

import ViewerDeviceAccess from '../models/ViewerDeviceAccess.js';

// Protect all routes under /devices
router.use(authenticateJWT);

// GET /devices - Get list of devices (scoped to tenant unless SUPER_ADMIN)
router.get('/', async (req, res) => {
  try {
    const devices = await getDeviceList(req.user, req.query);
    res.json(devices);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch devices: ' + error.message });
  }
});

// POST /devices/register - Register new physical device hardware (SUPER_ADMIN only)
router.post('/register', requireRole('SUPER_ADMIN'), async (req, res) => {
  try {
    const { deviceId, name, location, firmwareVersion, hardwareVersion } = req.body;

    if (!deviceId || !deviceId.trim()) {
      return res.status(400).json({ error: 'deviceId is required' });
    }

    const cleanDeviceId = deviceId.trim();
    const existing = await Device.findOne({ deviceId: cleanDeviceId });
    if (existing) {
      return res.status(409).json({ error: `Device "${cleanDeviceId}" is already registered` });
    }

    const newDevice = new Device({
      deviceId: cleanDeviceId,
      name: name?.trim() || cleanDeviceId,
      location: location?.trim() || 'Unallocated',
      firmwareVersion: firmwareVersion?.trim() || '1.0.0',
      hardwareVersion: hardwareVersion?.trim() || 'T113i',
      tenantId: null,
      status: 'UNASSIGNED',
      registeredAt: new Date(),
    });

    await newDevice.save();
    registerDeviceInCache(newDevice.toObject());

    await logAudit({
      req,
      action: 'REGISTER_DEVICE',
      resource: 'Device',
      resourceId: cleanDeviceId,
      metadata: { name: newDevice.name, location: newDevice.location }
    });

    res.status(201).json({
      message: `Device "${cleanDeviceId}" registered successfully`,
      device: newDevice,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to register device: ' + error.message });
  }
});

// PATCH /devices/:deviceId - Update device location / name (SUPER_ADMIN or CLIENT_ADMIN)
router.patch('/:deviceId', requireRole('SUPER_ADMIN', 'CLIENT_ADMIN'), async (req, res) => {
  try {
    const { deviceId } = req.params;
    const { location, name } = req.body;

    if (location === undefined && name === undefined) {
      return res.status(400).json({ error: 'location or name is required' });
    }

    const hasAccess = await verifyDeviceTenantAccess(deviceId, req.user);
    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied: You do not have permissions for this device' });
    }

    await updateDeviceLocation(deviceId, location, name);

    await logAudit({
      req,
      action: 'UPDATE_DEVICE_LOCATION',
      resource: 'Device',
      resourceId: deviceId,
      metadata: { location, name }
    });

    res.json({ message: 'Device location updated successfully', deviceId, location, name });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update location: ' + error.message });
  }
});

// GET /devices/:deviceId/latest
router.get('/:deviceId/latest', async (req, res) => {
  try {
    const { deviceId } = req.params;
    const hasAccess = await verifyDeviceTenantAccess(deviceId, req.user);
    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied: You do not have permissions for this device' });
    }

    const latest = getLatestPayload(deviceId);
    if (!latest) {
      return res.status(404).json({ error: 'No data available yet' });
    }
    res.json(latest);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch latest data' });
  }
});

// GET /devices/:deviceId/history
router.get('/:deviceId/history', async (req, res) => {
  try {
    const { deviceId } = req.params;
    const hasAccess = await verifyDeviceTenantAccess(deviceId, req.user);
    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied: You do not have permissions for this device' });
    }

    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 100;
    const range = req.query.range;
    const start = req.query.start;
    const end = req.query.end;

    const historyResult = await getHistory(deviceId, page, limit, req.user, range, start, end);
    res.json(historyResult);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch history' });
  }
});

// GET /devices/export/csv
router.get('/export/csv', async (req, res) => {
  try {
    let filter = applyTenantFilter(req);

    if (req.user.role === 'VIEWER') {
      const viewerId = req.user.userId || req.user.id;
      const assigned = await ViewerDeviceAccess.find({ viewerId }).distinct('deviceId');
      if (assigned.length === 0) {
        return res.status(404).send('No data available for export.');
      }
      filter.deviceId = { $in: assigned };
    }

    const data = await SensorHistory.find(filter).sort({ timestamp: -1 }).lean();
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

// GET /devices/export/json
router.get('/export/json', async (req, res) => {
  try {
    let filter = applyTenantFilter(req);

    if (req.user.role === 'VIEWER') {
      const viewerId = req.user.userId || req.user.id;
      const assigned = await ViewerDeviceAccess.find({ viewerId }).distinct('deviceId');
      if (assigned.length === 0) {
        return res.json([]);
      }
      filter.deviceId = { $in: assigned };
    }

    const data = await SensorHistory.find(filter).sort({ timestamp: -1 }).lean();
    res.header('Content-Type', 'application/json');
    res.attachment('sensor_history.json');
    return res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to export JSON' });
  }
});

export default router;
