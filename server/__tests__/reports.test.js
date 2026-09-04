/**
 * Tests for the reports router (ticket #10, ticket #14).
 *
 * Uses the per-day aggregate fixture shape:
 *   { nationalNumber, name, school, date, loginCount, pageViews, lastSeenAt }
 */
const express = require('express');
const { createReportsRouter } = require('../routes/reports');
const { startApp, request, requestWithHeaders, makeStubStore } = require('./__httpHelper');

const ADMIN_TOKEN = 'admin_' + 'a'.repeat(40);

function mount(store) {
  const app = express();
  app.use(createReportsRouter(store));
  return app;
}

function asAdmin(ctx, path) {
  return requestWithHeaders(ctx.baseUrl, 'GET', path, undefined, { authorization: ADMIN_TOKEN });
}

describe('reports router', () => {
  let ctx;
  afterEach(() => {
    if (ctx && ctx.server) ctx.server.close();
    ctx = null;
  });

  // Per-day aggregate fixture. loginCount on each row contributes to
  // the report's `loginCount` (sum per school).
  const historyFixture = [
    { nationalNumber: 'A1', name: 'Ahmed', school: 'Alpha', date: '2026-04-15', loginCount: 2, pageViews: 5, lastSeenAt: '2026-04-15T08:30:00Z' },
    { nationalNumber: 'B2', name: 'Bilal', school: 'Alpha', date: '2026-04-15', loginCount: 1, pageViews: 2, lastSeenAt: '2026-04-15T13:00:00Z' },
    { nationalNumber: 'C3', name: 'Carol', school: 'Beta', date: '2026-04-16', loginCount: 1, pageViews: 1, lastSeenAt: '2026-04-16T08:00:00Z' },
  ];

  describe('GET /api/reports/by-school', () => {
    test('returns per-school with loginCount field name (not visitCount)', async () => {
      const store = makeStubStore({
        visits: { totalVisits: 4, loginHistory: historyFixture },
      });
      ctx = await startApp(mount(store));
      const res = await asAdmin(ctx, '/api/reports/by-school');
      expect(res.status).toBe(200);
      expect(res.body.data).toEqual([
        { school: 'Alpha', loginCount: 3, uniqueUsers: 2 },
        { school: 'Beta', loginCount: 1, uniqueUsers: 1 },
      ]);
    });
  });

  describe('GET /api/reports/by-user', () => {
    test('returns per-user with loginCount (sum) and lastLogin (most recent lastSeenAt)', async () => {
      const store = makeStubStore({
        visits: { totalVisits: 4, loginHistory: historyFixture },
      });
      ctx = await startApp(mount(store));
      const res = await asAdmin(ctx, '/api/reports/by-user');
      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(3);
      const ahmed = res.body.data.find((u) => u.nationalNumber === 'A1');
      expect(ahmed.loginCount).toBe(2);
      expect(ahmed.lastLogin).toBe('2026-04-15T08:30:00Z');
    });
  });

  describe('GET /api/reports/export/pdf', () => {
    test('returns JSON placeholder with loginHistory (synthesised per-event records)', async () => {
      const store = makeStubStore({
        visits: { totalVisits: 4, loginHistory: historyFixture },
      });
      ctx = await startApp(mount(store));
      const res = await asAdmin(ctx, '/api/reports/export/pdf');
      expect(res.status).toBe(200);
      // totalLogins = sum(loginCount) across day-records: 2 + 1 + 1 = 4
      expect(res.body.data.totalLogins).toBe(4);
      expect(res.body.data.loginHistory).toHaveLength(4);
      // Synthetic events have timestamp + date + nationalNumber + name + school.
      const first = res.body.data.loginHistory[0];
      expect(first).toHaveProperty('timestamp');
      expect(first).toHaveProperty('date');
      expect(first).toHaveProperty('nationalNumber');
      expect(first).toHaveProperty('name');
      expect(first).toHaveProperty('school');
    });

    test('applies date filter', async () => {
      const store = makeStubStore({
        visits: { totalVisits: 4, loginHistory: historyFixture },
      });
      ctx = await startApp(mount(store));
      const res = await asAdmin(ctx, '/api/reports/export/pdf?startDate=2026-04-15&endDate=2026-04-17');
      expect(res.status).toBe(200);
      expect(res.body.data.totalLogins).toBe(4);
    });
  });
});
