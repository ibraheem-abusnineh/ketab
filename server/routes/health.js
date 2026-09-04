/**
 * Health check router (ticket #10).
 *
 * Single GET /api/health. Public, no store interaction. Returns the same
 * payload the legacy handler returned (server/index.js:1421).
 */
const express = require('express');

function createHealthRouter() {
  const router = express.Router();
  router.get('/api/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
  });
  return router;
}

module.exports = { createHealthRouter };
