/**
 * Stats router (ticket #10, ticket #14).
 *
 * Four admin-gated routes:
 *   GET /api/stats/by-school
 *   GET /api/stats/by-time
 *   GET /api/stats/user-history
 *   GET /api/stats/visits
 *
 * Uses the aggregator service (server/services/aggregator.js) for the
 * pure math; this router just pulls loginHistory from the visits store
 * and forwards query params (startDate / endDate) to the aggregator.
 *
 * Ticket #14: `loginHistory` is the per-day aggregate. The aggregator
 * is rewritten against that shape (decision 4: visitCount = sum(loginCount)
 * per school; pageViews is exposed as a separate field). `/api/stats/visits`
 * synthesises per-event records from day-records (decision 2: one
 * synthetic event per `loginCount` per day, timestamped at `lastSeenAt`)
 * so the response body shape is preserved — "old readers continue to
 * read what they read".
 */
const express = require('express');
const { requireAdmin } = require('../middleware/auth');
const { createVisitsAccess } = require('../storage/visitsAccess');
const aggregator = require('../services/aggregator');

/**
 * Project a day-record into `loginCount` synthetic per-event records.
 * Each synthetic event inherits the day-record's user identity and the
 * `lastSeenAt` timestamp. This preserves the response shape of
 * `/api/stats/visits` (decision 2).
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
      nationalNumber: record.nationalNumber,
      name: record.name || '',
      school: record.school || '',
    });
  }
  return events;
}

function createStatsRouter(store) {
  const router = express.Router();
  const visitsAccess = createVisitsAccess({ store });

  router.get('/api/stats/by-school', requireAdmin, async (req, res) => {
    try {
      const visitsData = await visitsAccess.readVisitsData();
      const loginHistory = visitsData.loginHistory || [];
      const data = aggregator.bySchool(loginHistory, req.query);
      res.json({ success: true, data });
    } catch (error) {
      console.error('Error getting school stats:', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  });

  router.get('/api/stats/by-time', requireAdmin, async (req, res) => {
    try {
      const visitsData = await visitsAccess.readVisitsData();
      const loginHistory = visitsData.loginHistory || [];
      const data = aggregator.byTime(loginHistory, req.query);
      res.json({ success: true, data });
    } catch (error) {
      console.error('Error getting time stats:', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  });

  router.get('/api/stats/user-history', requireAdmin, async (req, res) => {
    try {
      const visitsData = await visitsAccess.readVisitsData();
      const loginHistory = visitsData.loginHistory || [];
      const data = aggregator.userHistory(loginHistory, req.query);
      res.json({ success: true, data });
    } catch (error) {
      console.error('Error getting user history:', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  });

  router.get('/api/stats/visits', requireAdmin, async (req, res) => {
    try {
      const visitsData = await visitsAccess.readVisitsData();
      const loginHistory = visitsData.loginHistory || [];
      // Date filter on the day-record `date` field.
      const filtered = aggregator.filterByDateRange(
        loginHistory,
        req.query.startDate,
        req.query.endDate
      );
      // Synthesise per-event records from day-records (ticket #14
      // decision 2): one synthetic event per `loginCount` per day,
      // timestamped at `lastSeenAt`. This preserves the response
      // body shape from the legacy per-event storage.
      const visits = filtered.flatMap(dayRecordToEvents);
      res.json({ success: true, count: visits.length, visits });
    } catch (error) {
      console.error('Error getting visits:', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  });

  return router;
}

module.exports = { createStatsRouter };
