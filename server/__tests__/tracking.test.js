/**
 * Tests for the tracking router (ticket #10, ticket #14).
 *
 * POST /api/track-visit and GET /api/visit-count. Both go through the
 * visits storage seam (ADR-0001). The test wires a stub store via
 * `createVisitsAccess({ store })` so writes are observable without I/O.
 *
 * Ticket #14: `POST /api/track-visit` increments `totalVisits` and,
 * when the body carries `nationalNumber` + `date`, increments the
 * per-day `pageViews` counter on the day-record. Anonymous page-loads
 * (no nationalNumber) only bump `totalVisits`.
 */
const express = require('express');
const { createTrackingRouter } = require('../routes/tracking');
const { createVisitsAccess } = require('../storage/visitsAccess');
const { startApp, request, makeStubStore } = require('./__httpHelper');
describe('tracking router', () => {
  let ctx;
  afterEach(() => {
    if (ctx && ctx.server) ctx.server.close();
  });

  function mount(store) {
    const app = express();
    app.use(express.json());
    app.use(createTrackingRouter(store));
    return app;
  }

  test('POST /api/track-visit increments totalVisits by 1 and returns the new value', async () => {
    const store = makeStubStore({ visits: { totalVisits: 41, loginHistory: [] } });
    ctx = await startApp(mount(store));
    const res = await request(ctx.baseUrl, 'POST', '/api/track-visit', {});
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: true, totalVisits: 42 });
  });

  test('POST /api/track-visit persists the new total to the store', async () => {
    const store = makeStubStore({ visits: { totalVisits: 0, loginHistory: [] } });
    ctx = await startApp(mount(store));
    await request(ctx.baseUrl, 'POST', '/api/track-visit', {});
    const visits = await createVisitsAccess({ store }).readVisitsData();
    expect(visits.totalVisits).toBe(1);
  });

  test('POST /api/track-visit returns 500 when write fails', async () => {
    const store = {
      visits: {
        async read() { return { totalVisits: 5, loginHistory: [] }; },
        async write() { return { ok: false, source: 'none', error: new Error('disk full') }; },
      },
    };
    ctx = await startApp(mount(store));
    const res = await request(ctx.baseUrl, 'POST', '/api/track-visit', {});
    expect(res.status).toBe(500);
    expect(res.body.success).toBe(false);
  });

  test('GET /api/visit-count returns the current counter without incrementing', async () => {
    const store = makeStubStore({ visits: { totalVisits: 17, loginHistory: [] } });
    ctx = await startApp(mount(store));
    const res = await request(ctx.baseUrl, 'GET', '/api/visit-count');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ totalVisits: 17 });
  });

  test('GET /api/visit-count does not mutate the store', async () => {
    const store = makeStubStore({ visits: { totalVisits: 3, loginHistory: [] } });
    ctx = await startApp(mount(store));
    await request(ctx.baseUrl, 'GET', '/api/visit-count');
    await request(ctx.baseUrl, 'GET', '/api/visit-count');
    const visits = await store.visits.read();
    expect(visits.totalVisits).toBe(3);
  });

  test('GET /api/visit-count with no local data falls back to default (0)', async () => {
    const store = {
      visits: {
        async read() { return null; },
        async write() { return { ok: true }; },
      },
    };
    ctx = await startApp(mount(store));
    const res = await request(ctx.baseUrl, 'GET', '/api/visit-count');
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ totalVisits: 0 });
  });

  // Ticket #14: per-day pageViews extension.
  test('POST /api/track-visit with nationalNumber + date increments pageViews on the day-record', async () => {
    const store = makeStubStore({ visits: { totalVisits: 0, loginHistory: [] } });
    ctx = await startApp(mount(store));
    const res = await request(ctx.baseUrl, 'POST', '/api/track-visit', {
      nationalNumber: 'N1',
      name: 'Ahmed',
      school: 'Alpha',
      date: '2026-04-15',
    });
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: true, totalVisits: 1 });
    const visits = await store.visits.read();
    expect(visits.totalVisits).toBe(1);
    expect(visits.loginHistory).toHaveLength(1);
    const record = visits.loginHistory[0];
    expect(record.nationalNumber).toBe('N1');
    expect(record.date).toBe('2026-04-15');
    expect(record.pageViews).toBe(1);
    expect(record.loginCount).toBe(0);
  });

  test('anonymous POST /api/track-visit (no nationalNumber) only bumps totalVisits', async () => {
    const store = makeStubStore({ visits: { totalVisits: 4, loginHistory: [] } });
    ctx = await startApp(mount(store));
    const res = await request(ctx.baseUrl, 'POST', '/api/track-visit', {});
    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: true, totalVisits: 5 });
    const visits = await store.visits.read();
    expect(visits.totalVisits).toBe(5);
    expect(visits.loginHistory).toEqual([]);
  });

  test('POST /api/track-visit accumulates pageViews across calls (same day)', async () => {
    const store = makeStubStore({ visits: { totalVisits: 0, loginHistory: [] } });
    ctx = await startApp(mount(store));
    await request(ctx.baseUrl, 'POST', '/api/track-visit', {
      nationalNumber: 'N1', name: 'A', school: 'Alpha', date: '2026-04-15',
    });
    await request(ctx.baseUrl, 'POST', '/api/track-visit', {
      nationalNumber: 'N1', name: 'A', school: 'Alpha', date: '2026-04-15',
    });
    const visits = await store.visits.read();
    expect(visits.totalVisits).toBe(2);
    expect(visits.loginHistory).toHaveLength(1);
    expect(visits.loginHistory[0].pageViews).toBe(2);
  });
});