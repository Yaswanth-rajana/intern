import express from 'express';
import AuditLog from '../models/AuditLog.js';
import { authenticateJWT, requireRole } from '../middleware/auth.js';

const router = express.Router();

// GET /audit-logs - Query audit history (SUPER_ADMIN sees all, CLIENT_ADMIN sees tenant logs)
router.get('/', authenticateJWT, requireRole('SUPER_ADMIN', 'CLIENT_ADMIN'), async (req, res) => {
  try {
    const { action, username, tenantId, page = 1, limit = 50 } = req.query;

    let filter = {};
    if (req.user.role === 'SUPER_ADMIN') {
      if (tenantId) filter.tenantId = tenantId;
    } else {
      // CLIENT_ADMIN: Strictly filter by req.user.tenantId
      filter.tenantId = req.user.tenantId;
    }

    if (action) filter.action = action;
    if (username) filter.username = username.toLowerCase();

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const logs = await AuditLog.find(filter)
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    const total = await AuditLog.countDocuments(filter);

    res.json({
      logs,
      total,
      page: parseInt(page),
      limit: parseInt(limit),
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch audit logs: ' + error.message });
  }
});

export default router;
