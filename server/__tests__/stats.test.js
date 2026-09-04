/**
 * Tests for the stats router (ticket #10, ticket #14).
 *
 * Uses the per-day aggregate fixture shape:
 *   { nationalNumber, name, school, date, loginCount, pageViews, lastSeenAt }
 *
 * Acceptance criterion #4: old readers continue to read what they read.
 * For /api/stats/visits, "what they read" is a flat list of per-event
 * records synthesised from day-records (one event per loginCount).
 */
const express = require('express');
const { createStatsRouter } = require('../routes/stats');
const { startApp, request, requestWithHeaders, makeStubStore } = require('./__httpHelper');

const ADMIN_TOKEN = 'admin_' + 'a'.repeat(40);

function mount(store) {
  const app = express();
  app.use(createStatsRouter(store));
  return app;
}

function asAdmin(ctx, path) {
  return requestWithHeaders(ctx.baseUrl, 'GET', path, undefined, { authorization: ADMIN_TOKEN });
}

describe('stats router', () => {
  let ctx;
  afterEach(() => {
    if (ctx && ctx.server) ctx.server.close();
    ctx = null;
  });

  // Per-day aggregate fixture. loginCount on each row contributes to
  // visitCount; pageViews is summed separately; unique users are
  // counted via distinct nationalNumbers.
  const historyFixture = [
    { nationalNumber: 'A1', name: 'Ahmed', school: 'Alpha', date: '2026-04-15', loginCount: 2, pageViews: 5, lastSeenAt: '2026-04-15T08:30:00Z' },
    { nationalNumber: 'A1', name: 'Ahmed', school: 'Alpha', date: '2026-04-15', loginCount: 0, pageViews: 3, lastSeenAt: '2026-04-15T08:45:00Z' },
    { nationalNumber: 'B2', name: 'Bilal', school: 'Alpha', date: '2026-04-15', loginCount: 1, pageViews: 2, lastSeenAt: '2026-04-15T13:00:00Z' },
    { nationalNumber: 'C3', name: 'Carol', school: 'Beta', date: '2026-04-16', loginCount: 1, pageViews: 1, lastSeenAt: '2026-04-16T08:00:00Z' },
  ];

  describe('GET /api/stats/by-school', () => {
    test('groups day-records by school with visitCount = sum(loginCount), pageViews = sum(pageViews), uniqueUsers', async () => {
      const store = makeStubStore({
        visits: { totalVisits: 4, loginHistory: historyFixture },
      });
      ctx = await startApp(mount(store));
      const res = await asAdmin(ctx, '/api/stats/by-school');
      expect(res.status).toBe(200);
      expect(res.body.data).toEqual([
        { school: 'Alpha', visitCount: 3, uniqueUsers: 2, pageViews: 10 },
        { school: 'Beta', visitCount: 1, uniqueUsers: 1, pageViews: 1 },
      ]);
    });

    test('applies startDate/endDate filters', async () => {
      const store = makeStubStore({
        visits: { totalVisits: 4, loginHistory: historyFixture },
      });
      ctx = await startApp(mount(store));
      const res = await asAdmin(ctx, '/api/stats/by-school?startDate=2026-04-15&endDate=2026-04-17');
      expect(res.status).toBe(200);
      expect(res.body.data).toEqual([
        { school: 'Alpha', visitCount: 3, uniqueUsers: 2, pageViews: 10 },
        { school: 'Beta', visitCount: 1, uniqueUsers: 1, pageViews: 1 },
      ]);
    });
    test('returns 401 without admin token', async () => {
      const store = makeStubStore();
      ctx = await startApp(mount(store));
      const res = await request(ctx.baseUrl, 'GET', '/api/stats/by-school');
      expect(res.status).toBe(401);
    });
  });

  describe('GET /api/stats/by-time', () => {
    test('returns hourly and daily arrays', async () => {
      const store = makeStubStore({
        visits: { totalVisits: 4, loginHistory: historyFixture },
      });
      ctx = await startApp(mount(store));
      const res = await asAdmin(ctx, '/api/stats/by-time');
      expect(res.status).toBe(200);
      expect(res.body.data.hourly.length).toBeGreaterThan(0);
      expect(res.body.data.daily.length).toBeGreaterThan(0);
    });
  });

  describe('GET /api/stats/user-history', () => {
    test('returns per-user aggregates with loginCount and lastLogin (no recentLogins — dropped in #14)', async () => {
      const store = makeStubStore({
        visits: { totalVisits: 4, loginHistory: historyFixture },
      });
      ctx = await startApp(mount(store));
      const res = await asAdmin(ctx, '/api/stats/user-history');
      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(3); // A1, B2, C3
      const ahmed = res.body.data.find((u) => u.nationalNumber === 'A1');
      expect(ahmed.loginCount).toBe(2); // A1 has 2 + 0 day-records → loginCount sum
      expect(ahmed.recentLogins).toBeUndefined(); // dropped in ticket #14
      expect(typeof ahmed.lastLogin).toBe('string');
    });
  });

  describe('GET /api/stats/visits', () => {
    test('returns flat visits list — one synthetic event per loginCount per day-record', async () => {
      const store = makeStubStore({
        visits: { totalVisits: 4, loginHistory: historyFixture },
      });
      ctx = await startApp(mount(store));
      const res = await asAdmin(ctx, '/api/stats/visits');
      expect(res.status).toBe(200);
      // A1: loginCount 2 + 0 = 2 events; B2: 1; C3: 1 → total 4
      expect(res.body.count).toBe(4);
      expect(res.body.visits).toHaveLength(4);
      const a1Events = res.body.visits.filter((v) => v.nationalNumber === 'A1');
      expect(a1Events).toHaveLength(2);
      a1Events.forEach((e) => {
        expect(e.timestamp).toBe('2026-04-15T08:30:00Z');
        expect(e.name).toBe('Ahmed');
        expect(e.school).toBe('Alpha');
      });
    });

    test('applies date range filter', async () => {
      const store = makeStubStore({
        visits: { totalVisits: 4, loginHistory: historyFixture },
      });
      ctx = await startApp(mount(store));
      const res = await asAdmin(ctx, '/api/stats/visits?startDate=2026-04-15&endDate=2026-04-17');
      expect(res.status).toBe(200);
      expect(res.body.count).toBe(4);
    });
  });
});
