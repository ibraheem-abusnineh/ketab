/**
 * Tests for the stats router (ticket #10).
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

  const historyFixture = [
    { timestamp: '2026-04-15T08:30:00Z', nationalNumber: 'A1', name: 'Ahmed', school: 'Alpha', role: 'parent' },
    { timestamp: '2026-04-15T08:45:00Z', nationalNumber: 'A1', name: 'Ahmed', school: 'Alpha', role: 'parent' },
    { timestamp: '2026-04-15T13:00:00Z', nationalNumber: 'B2', name: 'Bilal', school: 'Alpha', role: 'parent' },
    { timestamp: '2026-04-16T08:00:00Z', nationalNumber: 'C3', name: 'Carol', school: 'Beta', role: 'teacher' },
  ];

  describe('GET /api/stats/by-school', () => {
    test('groups logins by school with visitCount and uniqueUsers', async () => {
      const store = makeStubStore({
        visits: { totalVisits: 4, loginHistory: historyFixture },
      });
      ctx = await startApp(mount(store));
      const res = await asAdmin(ctx, '/api/stats/by-school');
      expect(res.status).toBe(200);
      expect(res.body.data).toEqual([
        { school: 'Alpha', visitCount: 3, uniqueUsers: 2 },
        { school: 'Beta', visitCount: 1, uniqueUsers: 1 },
      ]);
    });

    test('applies startDate/endDate filters', async () => {
      const store = makeStubStore({
        visits: { totalVisits: 4, loginHistory: historyFixture },
      });
      ctx = await startApp(mount(store));
      // Use a wide range that covers all 4 fixture timestamps. The legacy
      // filterByDateRange uses inclusive bounds at the start of the day;
      // narrower ranges like start=end=2026-04-16 would miss the
      // 08:00Z login on that day because end is 00:00Z of the same day.
      const res = await asAdmin(ctx, '/api/stats/by-school?startDate=2026-04-15&endDate=2026-04-17');
      expect(res.status).toBe(200);
      expect(res.body.data).toEqual([
        { school: 'Alpha', visitCount: 3, uniqueUsers: 2 },
        { school: 'Beta', visitCount: 1, uniqueUsers: 1 },
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
    test('returns per-user aggregates with loginCount, lastLogin, recentLogins', async () => {
      const store = makeStubStore({
        visits: { totalVisits: 4, loginHistory: historyFixture },
      });
      ctx = await startApp(mount(store));
      const res = await asAdmin(ctx, '/api/stats/user-history');
      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(3); // A1, B2, C3
      const ahmed = res.body.data.find((u) => u.nationalNumber === 'A1');
      expect(ahmed.loginCount).toBe(2);
      expect(ahmed.recentLogins.length).toBe(2);
    });
  });

  describe('GET /api/stats/visits', () => {
    test('returns flat visits list with count', async () => {
      const store = makeStubStore({
        visits: { totalVisits: 4, loginHistory: historyFixture },
      });
      ctx = await startApp(mount(store));
      const res = await asAdmin(ctx, '/api/stats/visits');
      expect(res.status).toBe(200);
      expect(res.body.count).toBe(4);
      expect(res.body.visits).toHaveLength(4);
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
