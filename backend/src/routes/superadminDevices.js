import express from 'express';
import mongoose from 'mongoose';
import Tenant from '../models/Tenant.js';
import Device from '../models/Device.js';
import { authenticateJWT, requireRole } from '../middleware/auth.js';
import { logAudit } from '../models/AuditLog.js';
import {
  bulkUnassignDevicesService,
  bulkArchiveDevicesService,
  bulkAssignDevicesService,
  bulkRestoreDevicesService,
} from '../services/mqttService.js';

const router = express.Router();

// Enforce authentication & SUPER_ADMIN role for all bulk device routes
router.use(authenticateJWT, requireRole('SUPER_ADMIN'));

// Helper validator for bulk device operations
const validateDeviceIdsArray = (deviceIds) => {
  if (!deviceIds || !Array.isArray(deviceIds) || deviceIds.length === 0) {
    return 'deviceIds must be a non-empty array';
  }
  if (deviceIds.length > 500) {
    return 'Maximum bulk operation limit is 500 devices per request';
  }
  for (const id of deviceIds) {
    if (typeof id !== 'string' || !id.trim()) {
      return 'All deviceIds must be non-empty strings';
    }
  }
  return null;
};

// POST /api/superadmin/devices/bulk-unassign
router.post('/bulk-unassign', async (req, res) => {
  try {
    const { deviceIds } = req.body;
    const validationError = validateDeviceIdsArray(deviceIds);
    if (validationError) {
      return res.status(400).json({ error: validationError });
    }

    const cleanIds = [...new Set(deviceIds.map(id => id.trim()))];
    const existingDevices = await Device.find({ deviceId: { $in: cleanIds } }).select('deviceId tenantId status').lean();
    if (existingDevices.length === 0) {
      return res.status(404).json({ error: 'None of the specified devices were found' });
    }

    const validIds = existingDevices.map(d => d.deviceId);
    const { unassignedCount, alreadyUnassignedCount } = await bulkUnassignDevicesService(validIds);

    await logAudit({
      req,
      action: 'BULK_UNASSIGN',
      resource: 'Device',
      metadata: {
        deviceIds: validIds,
        unassignedCount,
        alreadyUnassignedCount,
        totalRequested: cleanIds.length,
      },
    });

    let message = `${unassignedCount} device(s) unassigned successfully.`;
    if (alreadyUnassignedCount > 0) {
      message = `${unassignedCount} device(s) unassigned successfully. ${alreadyUnassignedCount} device(s) were already unassigned.`;
    }

    res.json({
      message,
      unassignedCount,
      alreadyUnassignedCount,
      processedDeviceIds: validIds,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to bulk unassign devices: ' + error.message });
  }
});

// POST /api/superadmin/devices/bulk-archive
router.post('/bulk-archive', async (req, res) => {
  try {
    const { deviceIds } = req.body;
    const validationError = validateDeviceIdsArray(deviceIds);
    if (validationError) {
      return res.status(400).json({ error: validationError });
    }

    const cleanIds = [...new Set(deviceIds.map(id => id.trim()))];
    const existingDevices = await Device.find({ deviceId: { $in: cleanIds } }).select('deviceId status tenantId').lean();
    if (existingDevices.length === 0) {
      return res.status(404).json({ error: 'None of the specified devices were found' });
    }

    const validIds = existingDevices.map(d => d.deviceId);
    const { archivedCount } = await bulkArchiveDevicesService(validIds);

    await logAudit({
      req,
      action: 'BULK_ARCHIVE',
      resource: 'Device',
      metadata: {
        deviceIds: validIds,
        archivedCount,
        totalRequested: cleanIds.length,
      },
    });

    res.json({
      message: `${archivedCount} device(s) archived successfully.`,
      archivedCount,
      processedDeviceIds: validIds,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to bulk archive devices: ' + error.message });
  }
});

// POST /api/superadmin/devices/bulk-assign
router.post('/bulk-assign', async (req, res) => {
  try {
    const { deviceIds, tenantId, location, buildingId, floorId, roomId } = req.body;
    const validationError = validateDeviceIdsArray(deviceIds);
    if (validationError) {
      return res.status(400).json({ error: validationError });
    }
    if (!tenantId || !mongoose.Types.ObjectId.isValid(tenantId)) {
      return res.status(400).json({ error: 'Valid tenantId is required' });
    }

    const tenant = await Tenant.findById(tenantId);
    if (!tenant) {
      return res.status(404).json({ error: 'Client organization not found' });
    }
    if (tenant.status !== 'active') {
      return res.status(400).json({ error: 'Cannot assign devices to an inactive client organization' });
    }

    const cleanIds = [...new Set(deviceIds.map(id => id.trim()))];
    const existingDevices = await Device.find({ deviceId: { $in: cleanIds } }).select('deviceId status tenantId').lean();
    
    // Validate that none of the selected devices are ARCHIVED
    const archivedDevices = existingDevices.filter(d => d.status === 'ARCHIVED');
    if (archivedDevices.length > 0) {
      return res.status(400).json({
        error: `Cannot assign archived devices (${archivedDevices.map(d => d.deviceId).join(', ')}). Restore them first before assigning.`,
      });
    }

    const validIds = existingDevices.map(d => d.deviceId);
    const { assignedCount } = await bulkAssignDevicesService(validIds, tenant._id, location, buildingId, floorId, roomId);

    await logAudit({
      req,
      action: 'BULK_ASSIGN',
      resource: 'Device',
      metadata: {
        deviceIds: validIds,
        targetTenantId: tenant._id,
        targetTenantName: tenant.name,
        assignedCount,
        buildingId,
        floorId,
        roomId,
      },
    });

    res.json({
      message: `${assignedCount} device(s) assigned to "${tenant.name}" successfully.`,
      assignedCount,
      targetTenant: { id: tenant._id, name: tenant.name },
      processedDeviceIds: validIds,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to bulk assign devices: ' + error.message });
  }
});

// POST /api/superadmin/devices/bulk-restore
router.post('/bulk-restore', async (req, res) => {
  try {
    const { deviceIds } = req.body;
    const validationError = validateDeviceIdsArray(deviceIds);
    if (validationError) {
      return res.status(400).json({ error: validationError });
    }

    const cleanIds = [...new Set(deviceIds.map(id => id.trim()))];
    const existingDevices = await Device.find({ deviceId: { $in: cleanIds } }).select('deviceId status').lean();
    if (existingDevices.length === 0) {
      return res.status(404).json({ error: 'None of the specified devices were found' });
    }

    const validIds = existingDevices.map(d => d.deviceId);
    const { restoredCount } = await bulkRestoreDevicesService(validIds);

    await logAudit({
      req,
      action: 'BULK_RESTORE',
      resource: 'Device',
      metadata: {
        deviceIds: validIds,
        restoredCount,
      },
    });

    res.json({
      message: `${restoredCount} device(s) restored to active fleet successfully.`,
      restoredCount,
      processedDeviceIds: validIds,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to bulk restore devices: ' + error.message });
  }
});

// POST /api/superadmin/devices/:deviceId/restore
router.post('/:deviceId/restore', async (req, res) => {
  try {
    const { deviceId } = req.params;
    const device = await Device.findOne({ deviceId });
    if (!device) {
      return res.status(404).json({ error: `Device "${deviceId}" not found` });
    }

    const { restoredCount } = await bulkRestoreDevicesService([deviceId]);

    await logAudit({
      req,
      action: 'DEVICE_RESTORE',
      resource: 'Device',
      resourceId: deviceId,
      metadata: {
        previousStatus: device.status,
        newStatus: 'UNASSIGNED',
      },
    });

    res.json({
      message: `Device "${deviceId}" restored to active fleet successfully.`,
      restoredCount,
      deviceId,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to restore device: ' + error.message });
  }
});

export default router;
