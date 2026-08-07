import express from 'express';
import Threshold from '../models/Threshold.js';
import { authenticateJWT, requireAdmin } from '../middleware/auth.js';

const router = express.Router();

// GET /thresholds
router.get('/', authenticateJWT, async (req, res) => {
  try {
    const thresholds = await Threshold.find({});
    res.json(thresholds);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch thresholds: ' + error.message });
  }
});

// PATCH /thresholds/:sensorKey
router.patch('/:sensorKey', authenticateJWT, requireAdmin, async (req, res) => {
  try {
    const { sensorKey } = req.params;
    const { warningLimit, criticalLimit } = req.body;

    if (warningLimit === undefined || criticalLimit === undefined) {
      return res.status(400).json({ error: 'warningLimit and criticalLimit are required' });
    }

    let threshold = await Threshold.findOne({ sensorKey });

    if (!threshold) {
      // Create if it doesn't exist
      threshold = new Threshold({
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
