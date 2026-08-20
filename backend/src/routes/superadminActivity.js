import express from 'express';
import { parse } from 'json2csv';
import { authenticateJWT, requireRole } from '../middleware/auth.js';
import { getDeviceActivityForDay, formatReportRowsForCSV } from '../services/deviceActivityService.js';

const router = express.Router();

// Apply JWT authentication and enforce SUPER_ADMIN role across all router endpoints
router.use(authenticateJWT);
router.use(requireRole('SUPER_ADMIN'));

/**
 * GET /api/superadmin/device-activity
 * Fetch daily device activity report as JSON for SuperAdmin UI
 */
router.get('/', async (req, res) => {
  try {
    const { date, tenantId, deviceId } = req.query;

    if (date && typeof date === 'string' && !/^\d{4}-\d{2}-\d{2}$/.test(date.trim())) {
      return res.status(400).json({ error: 'Invalid date format. Expected YYYY-MM-DD' });
    }

    const report = await getDeviceActivityForDay({
      date: date ? date.trim() : undefined,
      tenantId: tenantId ? tenantId.trim() : undefined,
      deviceId: deviceId ? deviceId.trim() : undefined,
    });

    res.json(report);
  } catch (error) {
    console.error('Error generating device activity report:', error);
    res.status(500).json({ error: 'Failed to generate device activity report: ' + error.message });
  }
});

/**
 * GET /api/superadmin/device-activity/export/csv
 * Stream dynamic CSV export for SuperAdmin
 */
router.get('/export/csv', async (req, res) => {
  try {
    const { date, tenantId, deviceId } = req.query;

    if (date && typeof date === 'string' && !/^\d{4}-\d{2}-\d{2}$/.test(date.trim())) {
      return res.status(400).json({ error: 'Invalid date format. Expected YYYY-MM-DD' });
    }

    const report = await getDeviceActivityForDay({
      date: date ? date.trim() : undefined,
      tenantId: tenantId ? tenantId.trim() : undefined,
      deviceId: deviceId ? deviceId.trim() : undefined,
    });

    const rows = formatReportRowsForCSV(report);

    let csvContent = '';
    if (rows.length > 0) {
      csvContent = parse(rows);
    } else {
      // Empty template headers if no rows
      csvContent = 'Date,Tenant,Device ID,Device Name,Status,Start Time,End Time,Duration,Reading Count,First Reading Timestamp,Last Reading Timestamp\n';
    }

    const filename = `device-activity-report-${report.date}.csv`;

    res.header('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    return res.send(csvContent);
  } catch (error) {
    console.error('Error exporting device activity CSV:', error);
    res.status(500).json({ error: 'Failed to export device activity CSV: ' + error.message });
  }
});

export default router;
