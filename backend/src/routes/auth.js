import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import User from '../models/User.js';
import Tenant from '../models/Tenant.js';
import Device from '../models/Device.js';
import ViewerDeviceAccess from '../models/ViewerDeviceAccess.js';
import { authenticateJWT, requireRole, applyTenantFilter } from '../middleware/auth.js';
import { logAudit } from '../models/AuditLog.js';
import { syncViewerSocketRooms } from '../socket/socket.js';
import { broadcastDeviceListUpdated } from '../services/mqttService.js';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'super_secret_jwt_key_123';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '8h';

// Simple Rate Limiter for Login Endpoint
const loginAttempts = new Map();
const loginRateLimiter = (req, res, next) => {
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
  const now = Date.now();
  const windowMs = 15 * 60 * 1000; // 15 minutes
  const maxAttempts = 30;

  const record = loginAttempts.get(ip) || { count: 0, resetAt: now + windowMs };
  if (now > record.resetAt) {
    record.count = 0;
    record.resetAt = now + windowMs;
  }

  record.count++;
  loginAttempts.set(ip, record);

  if (record.count > maxAttempts) {
    return res.status(429).json({ error: 'Too many login attempts. Please try again later.' });
  }

  next();
};

// POST /auth/login
router.post('/login', loginRateLimiter, async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    const cleanUsername = username.toLowerCase().trim();
    const user = await User.findOne({ username: cleanUsername });
    
    if (!user) {
      await logAudit({
        req: { ...req, user: { username: cleanUsername, role: 'GUEST', tenantId: null } },
        action: 'LOGIN_FAILURE',
        resource: 'User',
        resourceId: cleanUsername,
        metadata: { reason: 'User not found' }
      });
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      await logAudit({
        req: { ...req, user: { username: cleanUsername, role: user.role, tenantId: user.tenantId } },
        action: 'LOGIN_FAILURE',
        resource: 'User',
        resourceId: cleanUsername,
        metadata: { reason: 'Password mismatch' }
      });
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    // If user belongs to a tenant, check if tenant is active
    if (user.tenantId) {
      const tenant = await Tenant.findById(user.tenantId);
      if (!tenant || tenant.status === 'inactive') {
        return res.status(403).json({ error: 'Tenant account is inactive. Please contact system administrator.' });
      }
    }

    // Sign JWT with multi-tenant payload and configurable expiration
    const token = jwt.sign(
      {
        id: user._id,
        userId: user._id,
        username: user.username,
        role: user.role,
        tenantId: user.tenantId || null,
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    await logAudit({
      req: { ...req, user: { id: user._id, username: user.username, role: user.role, tenantId: user.tenantId } },
      action: 'LOGIN_SUCCESS',
      resource: 'User',
      resourceId: user._id,
    });

    res.json({
      token,
      user: {
        id: user._id,
        userId: user._id,
        username: user.username,
        role: user.role,
        tenantId: user.tenantId || null,
      },
    });
  } catch (error) {
    res.status(500).json({ error: 'Login failed' });
  }
});

// POST /auth/register - Public registration (defaults to VIEWER role)
router.post('/register', async (req, res) => {
  try {
    const { username, password, role, tenantId } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    const existingUser = await User.findOne({ username: username.toLowerCase().trim() });
    if (existingUser) {
      return res.status(400).json({ error: 'Username already exists' });
    }

    let userRole = 'VIEWER';
    if (role && ['SUPER_ADMIN', 'CLIENT_ADMIN', 'VIEWER'].includes(role)) {
      userRole = role;
    }

    let assignedTenantId = tenantId || null;
    if (userRole !== 'SUPER_ADMIN' && !assignedTenantId) {
      const defaultTenant = await Tenant.findOne({ slug: 'default-tenant' });
      assignedTenantId = defaultTenant ? defaultTenant._id : null;
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({
      username: username.toLowerCase().trim(),
      password: hashedPassword,
      role: userRole,
      tenantId: userRole === 'SUPER_ADMIN' ? null : assignedTenantId,
    });

    await newUser.save();

    res.status(201).json({
      message: 'Registration successful',
      user: {
        id: newUser._id,
        userId: newUser._id,
        username: newUser.username,
        role: newUser.role,
        tenantId: newUser.tenantId,
      },
    });
  } catch (error) {
    res.status(500).json({ error: 'Registration failed: ' + error.message });
  }
});

// GET /auth/me
router.get('/me', authenticateJWT, async (req, res) => {
  try {
    const user = await User.findById(req.user.id || req.user.userId).select('-password');
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json({ user });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch profile: ' + error.message });
  }
});

// GET /auth/users - List users (SUPER_ADMIN sees all, CLIENT_ADMIN sees their tenant)
router.get('/users', authenticateJWT, requireRole('SUPER_ADMIN', 'CLIENT_ADMIN'), async (req, res) => {
  try {
    const filter = applyTenantFilter(req);
    const users = await User.find(filter).select('-password').sort({ createdAt: -1 }).lean();

    // Fetch device assignments for all returned viewers in batch
    const viewerIds = users.filter(u => u.role === 'VIEWER').map(u => u._id);
    const assignments = await ViewerDeviceAccess.find({ viewerId: { $in: viewerIds } }).lean();
    
    // Group assignments by viewerId
    const assignmentsMap = {};
    assignments.forEach(a => {
      const vid = a.viewerId.toString();
      if (!assignmentsMap[vid]) assignmentsMap[vid] = [];
      assignmentsMap[vid].push(a.deviceId);
    });

    // Get total device count per tenant
    const tenantIds = [...new Set(users.map(u => u.tenantId?.toString()).filter(Boolean))];
    const tenantDevices = await Device.find({ tenantId: { $in: tenantIds } }).select('deviceId tenantId').lean();
    const tenantDeviceCountMap = {};
    tenantDevices.forEach(d => {
      const tid = d.tenantId.toString();
      tenantDeviceCountMap[tid] = (tenantDeviceCountMap[tid] || 0) + 1;
    });

    const enrichedUsers = users.map(u => {
      const vid = u._id.toString();
      const tid = u.tenantId?.toString();
      const assignedDeviceIds = assignmentsMap[vid] || [];
      const totalTenantDevices = tid ? (tenantDeviceCountMap[tid] || 0) : 0;
      return {
        ...u,
        assignedDeviceIds,
        deviceCount: assignedDeviceIds.length,
        totalTenantDevices,
      };
    });

    res.json({ users: enrichedUsers });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch users: ' + error.message });
  }
});

// GET /auth/users/:id/devices - Get assigned devices for a specific viewer
router.get('/users/:id/devices', authenticateJWT, requireRole('SUPER_ADMIN', 'CLIENT_ADMIN'), async (req, res) => {
  try {
    const targetUserId = req.params.id;
    const targetUser = await User.findById(targetUserId);

    if (!targetUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (targetUser.role !== 'VIEWER') {
      return res.status(400).json({ error: 'Device-level access control is only applicable to VIEWER accounts' });
    }

    if (req.user.role === 'CLIENT_ADMIN') {
      if (String(targetUser.tenantId) !== String(req.user.tenantId)) {
        return res.status(403).json({ error: 'Forbidden: Cannot view users outside your tenant' });
      }
    }

    const assignments = await ViewerDeviceAccess.find({ viewerId: targetUserId }).lean();
    const deviceIds = assignments.map(a => a.deviceId);

    res.json({
      userId: targetUserId,
      username: targetUser.username,
      deviceIds,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch viewer devices: ' + error.message });
  }
});

// PUT /auth/users/:id/devices - Replace assigned devices for a specific viewer
const updateViewerDevicesHandler = async (req, res) => {
  try {
    const targetUserId = req.params.id;
    const { deviceIds } = req.body;

    if (!Array.isArray(deviceIds)) {
      return res.status(400).json({ error: 'deviceIds must be an array of strings' });
    }

    const targetUser = await User.findById(targetUserId);
    if (!targetUser) {
      return res.status(404).json({ error: 'Target user not found' });
    }

    if (targetUser.role !== 'VIEWER') {
      return res.status(400).json({ error: 'Device assignments can only be configured for VIEWER accounts' });
    }

    let tenantIdToVerify = targetUser.tenantId;

    if (req.user.role === 'CLIENT_ADMIN') {
      if (String(targetUser.tenantId) !== String(req.user.tenantId)) {
        return res.status(403).json({ error: 'Forbidden: Target viewer belongs to a different tenant' });
      }
      tenantIdToVerify = req.user.tenantId;
    }

    if (!tenantIdToVerify) {
      return res.status(400).json({ error: 'Target viewer has no assigned tenant' });
    }

    // Clean & de-duplicate device IDs
    const cleanDeviceIds = [...new Set(deviceIds.map(d => String(d).trim()).filter(Boolean))];

    // Verify EVERY supplied device belongs to the exact same tenant
    if (cleanDeviceIds.length > 0) {
      const matchingDevices = await Device.find({
        deviceId: { $in: cleanDeviceIds },
        tenantId: tenantIdToVerify,
      }).lean();

      if (matchingDevices.length !== cleanDeviceIds.length) {
        return res.status(403).json({ 
          error: 'Security Error: One or more selected devices do not belong to this tenant' 
        });
      }
    }

    // Replace assignments atomically
    await ViewerDeviceAccess.deleteMany({ viewerId: targetUserId });

    if (cleanDeviceIds.length > 0) {
      const docsToInsert = cleanDeviceIds.map(deviceId => ({
        viewerId: targetUserId,
        deviceId,
        tenantId: tenantIdToVerify,
      }));
      await ViewerDeviceAccess.insertMany(docsToInsert);
    }

    await logAudit({
      req,
      action: 'ASSIGN_VIEWER_DEVICES',
      resource: 'User',
      resourceId: targetUserId,
      metadata: { 
        username: targetUser.username, 
        deviceIds: cleanDeviceIds, 
        deviceCount: cleanDeviceIds.length 
      }
    });

    // Real-time synchronization: Update active socket rooms for this viewer and push deviceList update
    await syncViewerSocketRooms(targetUserId, cleanDeviceIds);
    await broadcastDeviceListUpdated();

    res.json({
      message: `Successfully assigned ${cleanDeviceIds.length} device(s) to ${targetUser.username}`,
      userId: targetUserId,
      deviceIds: cleanDeviceIds,
      deviceCount: cleanDeviceIds.length,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update viewer devices: ' + error.message });
  }
};

router.put('/users/:id/devices', authenticateJWT, requireRole('SUPER_ADMIN', 'CLIENT_ADMIN'), updateViewerDevicesHandler);
router.patch('/users/:id/devices', authenticateJWT, requireRole('SUPER_ADMIN', 'CLIENT_ADMIN'), updateViewerDevicesHandler);

// POST /auth/users - Create user (SUPER_ADMIN or CLIENT_ADMIN)
router.post('/users', authenticateJWT, requireRole('SUPER_ADMIN', 'CLIENT_ADMIN'), async (req, res) => {
  try {
    const { username, password, role, tenantId } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password are required' });
    }

    if (username.trim().length < 3) {
      return res.status(400).json({ error: 'Username must be at least 3 characters' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    const existingUser = await User.findOne({ username: username.toLowerCase().trim() });
    if (existingUser) {
      return res.status(400).json({ error: 'Username already exists' });
    }

    let targetRole = 'VIEWER';
    let targetTenantId = null;

    if (req.user.role === 'SUPER_ADMIN') {
      if (role && ['SUPER_ADMIN', 'CLIENT_ADMIN', 'VIEWER'].includes(role)) {
        targetRole = role;
      }
      if (targetRole !== 'SUPER_ADMIN') {
        if (!tenantId || !mongoose.Types.ObjectId.isValid(tenantId)) {
          return res.status(400).json({ error: 'Valid tenantId is required for CLIENT_ADMIN and VIEWER users' });
        }
        const tenantExists = await Tenant.findById(tenantId);
        if (!tenantExists) {
          return res.status(404).json({ error: 'Target tenant not found' });
        }
        targetTenantId = tenantId;
      }
    } else {
      if (role && role !== 'VIEWER') {
        return res.status(403).json({ error: 'Forbidden: CLIENT_ADMIN can only create VIEWER accounts' });
      }
      targetRole = 'VIEWER';
      targetTenantId = req.user.tenantId;
      if (!targetTenantId) {
        return res.status(400).json({ error: 'CLIENT_ADMIN must belong to a tenant to create viewer accounts' });
      }
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const newUser = new User({
      username: username.toLowerCase().trim(),
      password: hashedPassword,
      role: targetRole,
      tenantId: targetTenantId,
    });

    await newUser.save();

    await logAudit({
      req,
      action: 'CREATE_USER',
      resource: 'User',
      resourceId: newUser._id,
      metadata: { username: newUser.username, role: targetRole, tenantId: targetTenantId }
    });

    res.status(201).json({
      message: `${targetRole} account created successfully`,
      user: {
        id: newUser._id,
        userId: newUser._id,
        username: newUser.username,
        role: newUser.role,
        tenantId: newUser.tenantId,
        createdAt: newUser.createdAt,
        deviceCount: 0,
        assignedDeviceIds: [],
      },
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create user: ' + error.message });
  }
});

// DELETE /auth/users/:id - Delete user account and clean up device assignments
router.delete('/users/:id', authenticateJWT, requireRole('SUPER_ADMIN', 'CLIENT_ADMIN'), async (req, res) => {
  try {
    const targetUserId = req.params.id;

    if (targetUserId === String(req.user.id || req.user.userId)) {
      return res.status(400).json({ error: 'Cannot delete your own account' });
    }

    const targetUser = await User.findById(targetUserId);
    if (!targetUser) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (req.user.role === 'CLIENT_ADMIN') {
      if (String(targetUser.tenantId) !== String(req.user.tenantId)) {
        return res.status(403).json({ error: 'Forbidden: Cannot delete users outside your tenant' });
      }
      if (targetUser.role !== 'VIEWER') {
        return res.status(403).json({ error: 'Forbidden: CLIENT_ADMIN can only delete VIEWER users' });
      }
    } else if (req.user.role === 'SUPER_ADMIN') {
      if (targetUser.role === 'SUPER_ADMIN') {
        return res.status(403).json({ error: 'Forbidden: Cannot delete SUPER_ADMIN accounts' });
      }
    }

    // Delete user and cascade delete any device assignments
    await Promise.all([
      User.findByIdAndDelete(targetUserId),
      ViewerDeviceAccess.deleteMany({ viewerId: targetUserId })
    ]);

    await logAudit({
      req,
      action: 'DELETE_USER',
      resource: 'User',
      resourceId: targetUserId,
      metadata: { username: targetUser.username, role: targetUser.role }
    });

    res.json({ message: `User ${targetUser.username} deleted successfully` });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete user: ' + error.message });
  }
});

export default router;
