/**
 * Developer-only API router (ticket #12).
 *
 * Exposes raw store data per entity and a boot-reset endpoint. Every
 * route is gated by `requireDev` at the router level via `router.use()`,
 * per ticket #12 acceptance criterion #3 — the gating lives here, not
 * in the composer and not per route.
 *
 * Per ADR-0003: a dev token satisfies `requireAdmin` (dev is a superset
 * of admin for unblocking stuck admin operations), but an admin token
 * does NOT satisfy `requireDev`. This router therefore sits behind
 * `requireDev` only — never behind `requireAdmin` alone.
 *
 * Endpoints:
 *   GET  /api/dev/users          — raw users data
 *   GET  /api/dev/visits         — raw visits data (loginHistory included)
 *   GET  /api/dev/notifications  — raw notifications data
 *   GET  /api/dev/courses        — raw courses data
 *   GET  /api/dev/admin          — raw admin data
 *   POST /api/dev/bootstrap      — re-run store.bootstrap()
 */
const express = require('express');
const { requireDev } = require('../middleware/auth');

function createDevRouter(store) {
  const router = express.Router();

  // Gate every route in this router. `router.use(requireDev)` runs the
  // middleware for every method/path mounted on this router below, so
  // we don't repeat it on each route declaration.
  router.use(requireDev);

  router.get('/api/dev/users', async (req, res) => {
    try {
      const users = await store.users.read();
      res.json(users);
    } catch (error) {
      console.error('Error reading dev/users:', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  });

  router.get('/api/dev/visits', async (req, res) => {
    try {
      const visits = await store.visits.read();
      res.json(visits);
    } catch (error) {
      console.error('Error reading dev/visits:', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  });

  router.get('/api/dev/notifications', async (req, res) => {
    try {
      const notifications = await store.notifications.read();
      res.json(notifications);
    } catch (error) {
      console.error('Error reading dev/notifications:', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  });

  router.get('/api/dev/courses', async (req, res) => {
    try {
      const courses = await store.courses.read();
      res.json(courses);
    } catch (error) {
      console.error('Error reading dev/courses:', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  });

  router.get('/api/dev/admin', async (req, res) => {
    try {
      const admin = await store.admin.read();
      res.json(admin);
    } catch (error) {
      console.error('Error reading dev/admin:', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  });

  router.post('/api/dev/bootstrap', async (req, res) => {
    try {
      await store.bootstrap();
      res.json({ ok: true });
    } catch (error) {
      console.error('Error running dev/bootstrap:', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  });

  return router;
}

module.exports = { createDevRouter };
