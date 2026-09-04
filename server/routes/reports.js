/**
 * Reports router (ticket #10, ticket #14).
 *
 * Three admin-gated routes:
 *   GET /api/reports/by-school     — uses loginCount (not visitCount)
 *   GET /api/reports/by-user       — loginCount + lastLogin
 *   GET /api/reports/export/pdf    — JSON placeholder (legacy returned JSON)
 *
 * The reports endpoints use the same aggregator math as /stats but with
 * different field names. The router renames `visitCount` → `loginCount`
 * for the by-school report to match the legacy shape (server/index.js:1336).
 *
 * Ticket #14: `/api/reports/export/pdf` synthesises per-event records
 * from day-records (one synthetic event per `loginCount` per day,
 * timestamped at `lastSeenAt`) so the response shape — `{ totalLogins,
 * loginHistory: [...] }` — is preserved (decision 2).
 */
const express = require('express');
const { requireAdmin } = require('../middleware/auth');
const { createVisitsAccess } = require('../storage/visitsAccess');
const aggregator = require('../services/aggregator');

/**
 * Project a day-record into `loginCount` synthetic per-event records.
 * See `server/routes/stats.js` for the canonical helper — this one
 * includes the `date` field for richer reporting context.
 *
 * Ticket #14.
 */
function dayRecordToEvents(record) {
  if (!record || !record.nationalNumber) return [];
  const count = Number(record.loginCount) || 0;
  if (count <= 0) return [];
  const events = [];
  for (let i = 0; i < count; i++) {
    events.push({
      timestamp: record.lastSeenAt || null,
      date: record.date || null,
      nationalNumber: record.nationalNumber,
      name: record.name || '',
      school: record.school || '',
    });
  }
  return events;
}

function createReportsRouter(store) {
  const router = express.Router();
  const visitsAccess = createVisitsAccess({ store });

  router.get('/api/reports/by-school', requireAdmin, async (req, res) => {
    try {
      const visitsData = await visitsAccess.readVisitsData();
      const loginHistory = visitsData.loginHistory || [];
      const rows = aggregator.bySchool(loginHistory, req.query);
      // Rename visitCount → loginCount for the report shape.
      const data = rows.map(({ school, visitCount, uniqueUsers }) => ({
        school, loginCount: visitCount, uniqueUsers,
      }));
      res.json({ success: true, data });
    } catch (error) {
      console.error('Error getting school reports:', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  });

  router.get('/api/reports/by-user', requireAdmin, async (req, res) => {
    try {
      const visitsData = await visitsAccess.readVisitsData();
      const loginHistory = visitsData.loginHistory || [];
      const data = aggregator.byUser(loginHistory, req.query);
      res.json({ success: true, data });
    } catch (error) {
      console.error('Error getting user reports:', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  });

  router.get('/api/reports/export/pdf', requireAdmin, async (req, res) => {
    try {
      const visitsData = await visitsAccess.readVisitsData();
      const loginHistory = visitsData.loginHistory || [];
      const filtered = aggregator.filterByDateRange(
        loginHistory,
        req.query.startDate,
        req.query.endDate
      );
      // Synthesise per-event records (decision 2).
      const events = filtered.flatMap(dayRecordToEvents);
      res.json({
        success: true,
        message: 'PDF export not fully implemented. Please use CSV export.',
        data: {
          startDate: req.query.startDate,
          endDate: req.query.endDate,
          totalLogins: events.length,
          loginHistory: events.slice(0, 1000),
        },
      });
    } catch (error) {
      console.error('Error exporting PDF:', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  });

  return router;
}

module.exports = { createReportsRouter };
