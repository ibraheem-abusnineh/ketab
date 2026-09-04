/**
 * Stats router (ticket #10).
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
 */
const express = require('express');
const { requireAdmin } = require('../middleware/auth');
const { createVisitsAccess } = require('../storage/visitsAccess');
const aggregator = require('../services/aggregator');

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
      const filtered = aggregator.filterByDateRange(
        loginHistory,
        req.query.startDate,
        req.query.endDate
      );
      const visits = filtered.map((login) => ({
        timestamp: login.timestamp,
        nationalNumber: login.nationalNumber,
        name: login.name,
        school: login.school || '',
      }));
      res.json({ success: true, count: visits.length, visits });
    } catch (error) {
      console.error('Error getting visits:', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  });

  return router;
}

module.exports = { createStatsRouter };
