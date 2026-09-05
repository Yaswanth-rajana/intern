import express from 'express';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import Tenant from '../models/Tenant.js';
import Device from '../models/Device.js';
import User from '../models/User.js';
import { authenticateJWT, requireRole } from '../middleware/auth.js';
import { seedTenantThresholds } from '../config/database.js';
import { updateDeviceTenant, unassignDeviceTenant } from '../services/mqttService.js';
import { logAudit } from '../models/AuditLog.js';

const router = express.Router();

// Protect all tenant management routes for SUPER_ADMIN only
router.use(authenticateJWT, requireRole('SUPER_ADMIN'));

// GET /tenants - List all tenants with summary counts
router.get('/', async (req, res) => {
  try {
    const tenants = await Tenant.find({}).sort({ createdAt: -1 }).lean();

    const tenantSummaries = await Promise.all(
      tenants.map(async (t) => {
        const tenantId = t._id;
        const [deviceCount, onlineDeviceCount, userCount] = await Promise.all([
          Device.countDocuments({ tenantId }),
          Device.countDocuments({ tenantId, status: 'Online' }),
          User.countDocuments({ tenantId }),
        ]);

        return {
          _id: t._id,
          name: t.name,
          slug: t.slug,
          status: t.status,
          deviceCount,
          onlineDeviceCount,
          userCount,
          createdAt: t.createdAt,
          updatedAt: t.updatedAt,
        };
      })
    );

    res.json({ tenants: tenantSummaries });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch tenants: ' + error.message });
  }
});

// POST /tenants - Create new tenant + Client Admin credentials
router.post('/', async (req, res) => {
  try {
    const { name, slug, adminUsername, adminPassword } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ error: 'Organization name is required' });
    }

    const tenantSlug = (slug || name).trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    if (!tenantSlug) {
      return res.status(400).json({ error: 'Valid tenant slug is required' });
    }

    const existingTenant = await Tenant.findOne({ slug: tenantSlug });
    if (existingTenant) {
      return res.status(409).json({ error: `Tenant with slug "${tenantSlug}" already exists` });
    }

    // Validate admin credentials if provided
    if (adminUsername) {
      if (adminUsername.trim().length < 3) {
        return res.status(400).json({ error: 'Admin username must be at least 3 characters' });
      }
      if (!adminPassword || adminPassword.length < 6) {
        return res.status(400).json({ error: 'Admin password must be at least 6 characters' });
      }

      const existingUser = await User.findOne({ username: adminUsername.toLowerCase().trim() });
      if (existingUser) {
        return res.status(409).json({ error: `Username "${adminUsername}" is already taken` });
      }
    }

    // 1. Create Tenant
    const tenant = new Tenant({
      name: name.trim(),
      slug: tenantSlug,
      status: 'active',
    });
    await tenant.save();

    // Automatically seed tenant-specific threshold limits
    await seedTenantThresholds(tenant._id);

    // 2. Create CLIENT_ADMIN user if credentials supplied
    let createdAdmin = null;
    if (adminUsername && adminPassword) {
      const hashedPassword = await bcrypt.hash(adminPassword, 10);
      const adminUser = new User({
        username: adminUsername.toLowerCase().trim(),
        password: hashedPassword,
        role: 'CLIENT_ADMIN',
        tenantId: tenant._id,
      });
      await adminUser.save();

      createdAdmin = {
        id: adminUser._id,
        username: adminUser.username,
        role: adminUser.role,
        tenantId: adminUser.tenantId,
      };
    }

    await logAudit({
      req,
      action: 'CREATE_TENANT',
      resource: 'Tenant',
      resourceId: tenant._id,
      metadata: { name: tenant.name, slug: tenant.slug, adminUsername }
    });

    res.status(201).json({
      message: 'Tenant and Client Admin created successfully',
      tenant,
      adminUser: createdAdmin,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create tenant: ' + error.message });
  }
});

// GET /tenants/:id - Detailed tenant info
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid tenant ID' });
    }

    const tenant = await Tenant.findById(id).lean();
    if (!tenant) {
      return res.status(404).json({ error: 'Tenant not found' });
    }

    const [devices, users, deviceCount, onlineDeviceCount, userCount] = await Promise.all([
      Device.find({ tenantId: id }).lean(),
      User.find({ tenantId: id }).select('-password').sort({ createdAt: -1 }).lean(),
      Device.countDocuments({ tenantId: id }),
      Device.countDocuments({ tenantId: id, status: 'Online' }),
      User.countDocuments({ tenantId: id }),
    ]);

    res.json({
      tenant,
      stats: {
        deviceCount,
        onlineDeviceCount,
        offlineDeviceCount: deviceCount - onlineDeviceCount,
        userCount,
      },
      devices,
      users,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch tenant details: ' + error.message });
  }
});

// PATCH /tenants/:id - Update tenant info / status
router.patch('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, slug, status } = req.body;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid tenant ID' });
    }

    const tenant = await Tenant.findById(id);
    if (!tenant) {
      return res.status(404).json({ error: 'Tenant not found' });
    }

    if (name) tenant.name = name.trim();
    if (slug) {
      const formattedSlug = slug.trim().toLowerCase();
      const existingSlug = await Tenant.findOne({ slug: formattedSlug, _id: { $ne: id } });
      if (existingSlug) {
        return res.status(409).json({ error: 'Tenant slug already exists' });
      }
      tenant.slug = formattedSlug;
    }
    if (status && ['active', 'inactive'].includes(status)) {
      tenant.status = status;
    }

    await tenant.save();

    await logAudit({
      req,
      action: 'UPDATE_TENANT',
      resource: 'Tenant',
      resourceId: id,
      metadata: { name: tenant.name, status: tenant.status }
    });

    res.json({ message: 'Tenant updated successfully', tenant });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update tenant: ' + error.message });
  }
});

// DELETE /tenants/:id - Delete tenant organization (unassigns devices & deletes tenant users)
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ error: 'Invalid tenant ID' });
    }

    const tenant = await Tenant.findById(id);
    if (!tenant) {
      return res.status(404).json({ error: 'Tenant not found' });
    }

    // 1. Unassign all devices belonging to this tenant
    const assignedDevices = await Device.find({ tenantId: id });
    for (const dev of assignedDevices) {
      await unassignDeviceTenant(dev.deviceId);
    }

    // 2. Delete tenant users, thresholds, and alarms
    await User.deleteMany({ tenantId: id });
    const { default: Threshold } = await import('../models/Threshold.js');
    await Threshold.deleteMany({ tenantId: id });

    // 3. Delete Tenant document
    await Tenant.findByIdAndDelete(id);

    await logAudit({
      req,
      action: 'DELETE_TENANT',
      resource: 'Tenant',
      resourceId: id,
      metadata: { name: tenant.name, slug: tenant.slug }
    });

    res.json({
      message: `Tenant "${tenant.name}" deleted successfully. ${assignedDevices.length} device(s) unassigned.`,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete tenant: ' + error.message });
  }
});

// POST /tenants/:tenantId/devices - Assign or reassign device
router.post('/:tenantId/devices', async (req, res) => {
  try {
    const { tenantId } = req.params;
    const { deviceId, location, reassign, buildingId, floorId, roomId } = req.body;

    if (!mongoose.Types.ObjectId.isValid(tenantId)) {
      return res.status(400).json({ error: 'Invalid tenant ID' });
    }
    if (!deviceId) {
      return res.status(400).json({ error: 'deviceId is required' });
    }

    const tenant = await Tenant.findById(tenantId);
    if (!tenant) {
      return res.status(404).json({ error: 'Tenant not found' });
    }
    if (tenant.status !== 'active') {
      return res.status(400).json({ error: 'Cannot assign device to an inactive tenant' });
    }

    const device = await Device.findOne({ deviceId });
    if (!device) {
      return res.status(404).json({ error: `Device "${deviceId}" not found` });
    }

    const currentTenantId = device.tenantId ? device.tenantId.toString() : null;
    const targetTenantId = tenant._id.toString();

    if (currentTenantId === targetTenantId) {
      return res.json({ message: 'Device is already assigned to this tenant', device });
    }

    // Strict reassignment rule: require reassign: true if device belongs to another tenant
    if (currentTenantId !== null && currentTenantId !== targetTenantId) {
      if (!reassign) {
        return res.status(400).json({
          error: 'Device is currently assigned to another client. Set reassign: true to confirm reassignment.',
          isAssigned: true,
          currentTenantId,
        });
      }
    }

    // Single source of truth update in DB and memory cache
    await updateDeviceTenant(deviceId, tenant._id, location, buildingId, floorId, roomId);

    const isReassignment = currentTenantId !== null && currentTenantId !== targetTenantId;
    await logAudit({
      req,
      action: isReassignment ? 'REASSIGN_DEVICE' : 'ASSIGN_DEVICE',
      resource: 'Device',
      resourceId: deviceId,
      metadata: { targetTenantId: tenant._id, targetTenantName: tenant.name, previousTenantId: currentTenantId }
    });

    const updatedDevice = await Device.findOne({ deviceId });

    res.json({
      message: `Device ${deviceId} assigned to tenant "${tenant.name}" successfully`,
      device: updatedDevice,
      previousTenantId: currentTenantId,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to assign device: ' + error.message });
  }
});

// DELETE /tenants/:tenantId/devices/:deviceId - Unassign device
router.delete('/:tenantId/devices/:deviceId', async (req, res) => {
  try {
    const { tenantId, deviceId } = req.params;

    const device = await Device.findOne({ deviceId });
    if (!device) {
      return res.status(404).json({ error: 'Device not found' });
    }

    // Single source of truth unassign in DB and memory cache
    await unassignDeviceTenant(deviceId);

    await logAudit({
      req,
      action: 'UNASSIGN_DEVICE',
      resource: 'Device',
      resourceId: deviceId,
      metadata: { previousTenantId: tenantId }
    });

    const updatedDevice = await Device.findOne({ deviceId });

    res.json({
      message: `Device ${deviceId} unassigned successfully`,
      device: updatedDevice,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to unassign device: ' + error.message });
  }
});

export default router;
