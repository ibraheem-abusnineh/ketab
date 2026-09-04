/**
 * Tests for the notifications router (ticket #10).
 */
const express = require('express');
const { createNotificationsRouter } = require('../routes/notifications');
const { startApp, request, requestWithHeaders, makeStubStore } = require('./__httpHelper');

const ADMIN_TOKEN = 'admin_' + 'a'.repeat(40);

function mount(store) {
  const app = express();
  app.use(express.json());
  app.use(createNotificationsRouter(store));
  return app;
}

function asAdmin(method, ctx, path, body) {
  return requestWithHeaders(ctx.baseUrl, method, path, body, { authorization: ADMIN_TOKEN });
}

describe('notifications router', () => {
  let ctx;
  afterEach(() => {
    if (ctx && ctx.server) ctx.server.close();
    ctx = null;
  });

  describe('GET /api/admin/notifications', () => {
    test('returns the notifications list', async () => {
      const store = makeStubStore({
        notifications: [{ id: 'n1', type: 'profile_update' }],
      });
      ctx = await startApp(mount(store));
      const res = await asAdmin('GET', ctx, '/api/admin/notifications', undefined);
      expect(res.status).toBe(200);
      expect(res.body.notifications).toHaveLength(1);
    });

    test('returns 401 without admin token', async () => {
      const store = makeStubStore();
      ctx = await startApp(mount(store));
      const res = await request(ctx.baseUrl, 'GET', '/api/admin/notifications');
      expect(res.status).toBe(401);
    });
  });

  describe('POST /api/admin/profile-requests/:id/approve', () => {
    test('approves a pending request and applies changes to the user', async () => {
      const store = makeStubStore({
        users: [{ nationalNumber: 'N1', name: 'Old', role: 'parent' }],
        notifications: [{
          id: 'r1', type: 'profile_edit_request', userId: 'N1', userName: 'Old',
          changes: [{ field: 'name', oldValue: 'Old', newValue: 'New' }],
          status: 'pending', read: false,
        }],
      });
      ctx = await startApp(mount(store));
      const res = await asAdmin('POST', ctx, '/api/admin/profile-requests/r1/approve', {});
      expect(res.status).toBe(200);
      const users = await store.users.read();
      expect(users[0].name).toBe('New');
      const notifications = await store.notifications.read();
      expect(notifications[0].status).toBe('approved');
      expect(notifications[0].read).toBe(true);
    });

    test('returns 404 when request is not found', async () => {
      const store = makeStubStore({ notifications: [], users: [] });
      ctx = await startApp(mount(store));
      const res = await asAdmin('POST', ctx, '/api/admin/profile-requests/missing/approve', {});
      expect(res.status).toBe(404);
    });

    test('returns 400 when request is already processed', async () => {
      const store = makeStubStore({
        notifications: [{
          id: 'r1', type: 'profile_edit_request', userId: 'N1',
          changes: [], status: 'approved', read: true,
        }],
        users: [{ nationalNumber: 'N1', name: 'A', role: 'parent' }],
      });
      ctx = await startApp(mount(store));
      const res = await asAdmin('POST', ctx, '/api/admin/profile-requests/r1/approve', {});
      expect(res.status).toBe(400);
    });
  });

  describe('POST /api/admin/profile-requests/:id/reject', () => {
    test('rejects a pending request without touching users', async () => {
      const store = makeStubStore({
        users: [{ nationalNumber: 'N1', name: 'Old', role: 'parent' }],
        notifications: [{
          id: 'r1', type: 'profile_edit_request', userId: 'N1',
          changes: [{ field: 'name', oldValue: 'Old', newValue: 'New' }],
          status: 'pending', read: false,
        }],
      });
      ctx = await startApp(mount(store));
      const res = await asAdmin('POST', ctx, '/api/admin/profile-requests/r1/reject', {});
      expect(res.status).toBe(200);
      const users = await store.users.read();
      expect(users[0].name).toBe('Old');
      const notifications = await store.notifications.read();
      expect(notifications[0].status).toBe('rejected');
    });
  });

  describe('POST /api/admin/notifications/:id/read', () => {
    test('marks a notification as read', async () => {
      const store = makeStubStore({
        notifications: [{ id: 'n1', type: 'profile_update', read: false }],
      });
      ctx = await startApp(mount(store));
      const res = await asAdmin('POST', ctx, '/api/admin/notifications/n1/read', {});
      expect(res.status).toBe(200);
      const notifications = await store.notifications.read();
      expect(notifications[0].read).toBe(true);
    });

    test('returns 404 when notification is not found', async () => {
      const store = makeStubStore({ notifications: [] });
      ctx = await startApp(mount(store));
      const res = await asAdmin('POST', ctx, '/api/admin/notifications/missing/read', {});
      expect(res.status).toBe(404);
    });
  });

  describe('DELETE /api/admin/notifications/:id', () => {
    test('deletes a profile_update notification', async () => {
      const store = makeStubStore({
        notifications: [{ id: 'n1', type: 'profile_update' }],
      });
      ctx = await startApp(mount(store));
      const res = await asAdmin('DELETE', ctx, '/api/admin/notifications/n1', undefined);
      expect(res.status).toBe(200);
      const notifications = await store.notifications.read();
      expect(notifications).toHaveLength(0);
    });

    test('refuses to delete a profile_edit_request', async () => {
      const store = makeStubStore({
        notifications: [{ id: 'r1', type: 'profile_edit_request', status: 'pending' }],
      });
      ctx = await startApp(mount(store));
      const res = await asAdmin('DELETE', ctx, '/api/admin/notifications/r1', undefined);
      expect(res.status).toBe(400);
    });
  });

  describe('DELETE /api/admin/notifications (bulk)', () => {
    test('clears profile_update notifications but keeps profile_edit_request', async () => {
      const store = makeStubStore({
        notifications: [
          { id: 'n1', type: 'profile_update' },
          { id: 'n2', type: 'profile_update' },
          { id: 'r1', type: 'profile_edit_request', status: 'pending' },
        ],
      });
      ctx = await startApp(mount(store));
      const res = await asAdmin('DELETE', ctx, '/api/admin/notifications', undefined);
      expect(res.status).toBe(200);
      expect(res.body.clearedCount).toBe(2);
      expect(res.body.remainingRequests).toBe(1);
      const notifications = await store.notifications.read();
      expect(notifications).toHaveLength(1);
      expect(notifications[0].type).toBe('profile_edit_request');
    });
  });

  describe('POST /api/admin/reset-visits', () => {
    test('resets visits when confirmed=true (new per-day aggregate shape)', async () => {
      // Fixture uses the new per-day aggregate shape (ADR-0004). The
      // reset must zero totalVisits and replace loginHistory with [].
      const store = makeStubStore({
        visits: {
          totalVisits: 50,
          loginHistory: [
            { nationalNumber: 'X', name: 'X', school: 'X', date: '2026-04-15', loginCount: 3, pageViews: 5, lastSeenAt: '2026-04-15T10:00:00Z' },
          ],
        },
      });
      ctx = await startApp(mount(store));
      const res = await asAdmin('POST', ctx, '/api/admin/reset-visits', { confirmed: true });
      expect(res.status).toBe(200);
      expect(res.body.totalVisits).toBe(0);
      const visits = await store.visits.read();
      expect(visits.totalVisits).toBe(0);
      expect(visits.loginHistory).toEqual([]);
    });

    test('returns 400 when confirmed is missing', async () => {
      const store = makeStubStore();
      ctx = await startApp(mount(store));
      const res = await asAdmin('POST', ctx, '/api/admin/reset-visits', {});
      expect(res.status).toBe(400);
    });
  });
});
