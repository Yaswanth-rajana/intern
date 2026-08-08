import express from 'express';
import mongoose from 'mongoose';
import Threshold from '../models/Threshold.js';
import { authenticateJWT, requireRole } from '../middleware/auth.js';
import { seedTenantThresholds } from '../config/database.js';

const router = express.Router();

// GET /thresholds - Fetch tenant-scoped threshold limits
router.get('/', authenticateJWT, async (req, res) => {
  try {
    let targetTenantId = null;

    if (req.user.role === 'SUPER_ADMIN') {
      const requestedTenantId = req.query.tenantId;
      if (requestedTenantId && mongoose.Types.ObjectId.isValid(requestedTenantId)) {
        targetTenantId = requestedTenantId;
      }
    } else {
      targetTenantId = req.user.tenantId;
    }

    let filter = {};
    if (targetTenantId) {
      filter.tenantId = targetTenantId;
      // Auto-seed if empty for this tenant
      const count = await Threshold.countDocuments(filter);
      if (count === 0) {
        await seedTenantThresholds(targetTenantId);
      }
    }

    const thresholds = await Threshold.find(filter);
    res.json(thresholds);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch thresholds: ' + error.message });
  }
});

// PATCH /thresholds/:sensorKey - Edit tenant-scoped threshold limits (SUPER_ADMIN or CLIENT_ADMIN only)
router.patch('/:sensorKey', authenticateJWT, requireRole('SUPER_ADMIN', 'CLIENT_ADMIN'), async (req, res) => {
  try {
    const { sensorKey } = req.params;
    const { warningLimit, criticalLimit } = req.body;

    if (warningLimit === undefined || criticalLimit === undefined) {
      return res.status(400).json({ error: 'warningLimit and criticalLimit are required' });
    }

    let targetTenantId = null;
    if (req.user.role === 'SUPER_ADMIN') {
      targetTenantId = req.body.tenantId || req.query.tenantId || null;
    } else {
      // CLIENT_ADMIN: Strictly derive tenantId from req.user.tenantId
      targetTenantId = req.user.tenantId;
      if (!targetTenantId) {
        return res.status(400).json({ error: 'CLIENT_ADMIN user must belong to a tenant to edit thresholds' });
      }
    }

    const filter = { sensorKey };
    if (targetTenantId) {
      filter.tenantId = targetTenantId;
    }

    let threshold = await Threshold.findOne(filter);

    if (!threshold) {
      threshold = new Threshold({
        tenantId: targetTenantId,
        sensorKey,
        warningLimit,
        criticalLimit,
      });
    } else {
      threshold.warningLimit = warningLimit;
      threshold.criticalLimit = criticalLimit;
    }

    await threshold.save();

    res.json({
      message: `Threshold for ${sensorKey} updated successfully`,
      threshold,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update threshold: ' + error.message });
  }
});

export default router;
