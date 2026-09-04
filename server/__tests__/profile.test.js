/**
 * Tests for the profile router (ticket #10).
 */
const express = require('express');
const { createProfileRouter } = require('../routes/profile');
const { startApp, request, makeStubStore } = require('./__httpHelper');

function mount(store) {
  const app = express();
  app.use(express.json());
  app.use(createProfileRouter(store));
  return app;
}

describe('profile router', () => {
  let ctx;
  afterEach(() => {
    if (ctx && ctx.server) ctx.server.close();
    ctx = null;
  });

  describe('GET /api/user/profile/:nationalNumber', () => {
    test('returns user profile with login history stats', async () => {
      const store = makeStubStore({
        users: [{ nationalNumber: 'N1', name: 'Ahmed', role: 'parent', school: 'Alpha' }],
        visits: {
          totalVisits: 3,
          loginHistory: [
            { nationalNumber: 'N1', name: 'Ahmed', school: 'Alpha', timestamp: '2026-04-01T08:00:00Z' },
            { nationalNumber: 'N1', name: 'Ahmed', school: 'Alpha', timestamp: '2026-04-02T08:00:00Z' },
            { nationalNumber: 'N1', name: 'Ahmed', school: 'Alpha', timestamp: '2026-04-03T08:00:00Z' },
          ],
        },
      });
      ctx = await startApp(mount(store));
      const res = await request(ctx.baseUrl, 'GET', '/api/user/profile/N1');
      expect(res.status).toBe(200);
      expect(res.body.data.nationalNumber).toBe('N1');
      expect(res.body.data.totalLogins).toBe(3);
      expect(res.body.data.firstLogin).toBe('2026-04-01T08:00:00Z');
      expect(res.body.data.lastLogin).toBe('2026-04-03T08:00:00Z');
      expect(res.body.data.recentLogins).toHaveLength(3);
    });

    test('returns 404 when user does not exist', async () => {
      const store = makeStubStore({ users: [] });
      ctx = await startApp(mount(store));
      const res = await request(ctx.baseUrl, 'GET', '/api/user/profile/MISSING');
      expect(res.status).toBe(404);
    });

    test('returns 0 totalLogins when no login history exists', async () => {
      const store = makeStubStore({
        users: [{ nationalNumber: 'N1', name: 'A', role: 'parent' }],
        visits: { totalVisits: 0, loginHistory: [] },
      });
      ctx = await startApp(mount(store));
      const res = await request(ctx.baseUrl, 'GET', '/api/user/profile/N1');
      expect(res.status).toBe(200);
      expect(res.body.data.totalLogins).toBe(0);
      expect(res.body.data.firstLogin).toBeNull();
      expect(res.body.data.lastLogin).toBeNull();
    });
  });

  describe('POST /api/user/profile/:nationalNumber/request-edit', () => {
    test('creates a profile_edit_request notification when fields change', async () => {
      const store = makeStubStore({
        users: [{ nationalNumber: 'N1', name: 'Ahmed', role: 'parent', school: 'Alpha' }],
      });
      ctx = await startApp(mount(store));
      const res = await request(ctx.baseUrl, 'POST', '/api/user/profile/N1/request-edit', {
        name: 'Ahmed Updated', phone: '0791234567',
      });
      expect(res.status).toBe(200);
      const notifications = await store.notifications.read();
      expect(notifications).toHaveLength(1);
      expect(notifications[0].type).toBe('profile_edit_request');
      expect(notifications[0].status).toBe('pending');
    });

    test('returns 400 when no fields changed', async () => {
      const store = makeStubStore({
        users: [{ nationalNumber: 'N1', name: 'Ahmed', role: 'parent', school: 'Alpha' }],
      });
      ctx = await startApp(mount(store));
      const res = await request(ctx.baseUrl, 'POST', '/api/user/profile/N1/request-edit', {
        name: 'Ahmed',
      });
      expect(res.status).toBe(400);
    });

    test('returns 404 when user does not exist', async () => {
      const store = makeStubStore({ users: [] });
      ctx = await startApp(mount(store));
      const res = await request(ctx.baseUrl, 'POST', '/api/user/profile/MISSING/request-edit', {
        name: 'X',
      });
      expect(res.status).toBe(404);
    });
  });

  describe('PUT /api/user/profile/:nationalNumber', () => {
    test('updates the user and creates a profile_update notification', async () => {
      const store = makeStubStore({
        users: [{ nationalNumber: 'N1', name: 'Ahmed', role: 'parent', school: 'Alpha' }],
      });
      ctx = await startApp(mount(store));
      const res = await request(ctx.baseUrl, 'PUT', '/api/user/profile/N1', {
        name: 'Ahmed Updated', school: 'Beta',
      });
      expect(res.status).toBe(200);
      const users = await store.users.read();
      expect(users[0].name).toBe('Ahmed Updated');
      expect(users[0].school).toBe('Beta');
      const notifications = await store.notifications.read();
      expect(notifications).toHaveLength(1);
      expect(notifications[0].type).toBe('profile_update');
    });

    test('updates without creating notification when no fields change', async () => {
      const store = makeStubStore({
        users: [{ nationalNumber: 'N1', name: 'Ahmed', role: 'parent', school: 'Alpha' }],
      });
      ctx = await startApp(mount(store));
      const res = await request(ctx.baseUrl, 'PUT', '/api/user/profile/N1', { name: 'Ahmed' });
      expect(res.status).toBe(200);
      const notifications = await store.notifications.read();
      expect(notifications).toHaveLength(0);
    });
  });
});
