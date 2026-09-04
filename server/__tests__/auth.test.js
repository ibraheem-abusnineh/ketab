/**
 * Tests for the auth router (ticket #10).
 *
 * Five routes: /api/login/guest, /api/login, /api/developer/login,
 * /api/admin/login, /api/admin/change-password.
 *
 * Admin and change-password are gated by the composer at mount time;
 * the router itself does not enforce auth. Tests that exercise the
 * gated behaviour mount the router with requireAdmin as the middleware.
 *
 * Guest and `/api/login` go through the visits storage seam (ADR-0001).
 * Admin login reads the admin file via the store.
 */
const express = require('express');
const bcrypt = require('bcryptjs');
const { createAuthRouter } = require('../routes/auth');
const { requireAdmin } = require('../middleware/auth');
const { startApp, request, requestWithHeaders, makeStubStore } = require('./__httpHelper');

const ADMIN_TOKEN = 'admin_' + 'a'.repeat(40); // prefix + length >= 32

function mountOpen(store) {
  const app = express();
  app.use(express.json());
  app.use(createAuthRouter(store));
  return app;
}
function mountGated(store) {
  // Mount the gated route directly: we want to verify that
  // requireAdmin gates POST /api/admin/change-password when the
  // router is mounted at root (the composer's pattern).
  const app = express();
  app.use(express.json());
  app.post('/api/admin/change-password', requireAdmin, createAuthRouter(store));
  return app;
}

describe('auth router', () => {
  let ctx;
  afterEach(() => {
    if (ctx && ctx.server) ctx.server.close();
  });
  describe('POST /api/login/guest', () => {
    test('creates a new guest user when phone number is new', async () => {
      const store = makeStubStore();
      ctx = await startApp(mountOpen(store));
      const res = await request(ctx.baseUrl, 'POST', '/api/login/guest', {
        fullName: 'Sara',
        phoneNumber: '0791234567',
      });
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.user.name).toBe('Sara');
      expect(res.body.user.role).toBe('guest');
      expect(res.body.user.nationalNumber).toMatch(/^GUEST_/);
      const users = await store.users.read();
      expect(users).toHaveLength(1);
      expect(users[0].phone).toBe('0791234567');
    });

    test('reuses an existing guest by phone number and updates name', async () => {
      const store = makeStubStore({
        users: [{
          nationalNumber: 'GUEST_EXISTING',
          name: 'Old Name',
          role: 'guest',
          school: 'زيارة عامة',
          phone: '0791234567',
          directorate: '',
        }],
      });
      ctx = await startApp(mountOpen(store));
      const res = await request(ctx.baseUrl, 'POST', '/api/login/guest', {
        fullName: 'New Name',
        phoneNumber: '0791234567',
      });
      expect(res.status).toBe(200);
      const users = await store.users.read();
      expect(users[0].nationalNumber).toBe('GUEST_EXISTING');
    });

    test('returns 400 when fullName or phoneNumber is missing', async () => {
      const store = makeStubStore();
      ctx = await startApp(mountOpen(store));
      const res = await request(ctx.baseUrl, 'POST', '/api/login/guest', { fullName: '' });
      expect(res.status).toBe(400);
    });
    test('returns 400 when phone number is not 10 digits', async () => {
      const store = makeStubStore();
      ctx = await startApp(mountOpen(store));
      const res = await request(ctx.baseUrl, 'POST', '/api/login/guest', {
        fullName: 'Sara',
        phoneNumber: '12345',
      });
      expect(res.status).toBe(400);
    });

    test('records a visit and per-day aggregate entry on success', async () => {
      const store = makeStubStore();
      ctx = await startApp(mountOpen(store));
      await request(ctx.baseUrl, 'POST', '/api/login/guest', {
        fullName: 'Sara',
        phoneNumber: '0791234567',
      });
      const visits = await store.visits.read();
      expect(visits.totalVisits).toBe(1);
      expect(visits.loginHistory).toHaveLength(1);
      const record = visits.loginHistory[0];
      expect(record.name).toBe('Sara');
      expect(record.school).toBe('زيارة عامة');
      expect(record.loginCount).toBe(1);
      expect(record.pageViews).toBe(0);
      expect(record.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(typeof record.lastSeenAt).toBe('string');
    });

  });

  describe('POST /api/login', () => {
    test('rejects unknown national numbers with 401', async () => {
      const store = makeStubStore({ users: [] });
      ctx = await startApp(mountOpen(store));
      const res = await request(ctx.baseUrl, 'POST', '/api/login', { nationalNumber: 'X1' });
      expect(res.status).toBe(401);
    });

    test('returns the user and records a visit when nationalNumber matches', async () => {
      const store = makeStubStore({
        users: [{
          nationalNumber: 'X1',
          name: 'Ahmed',
          role: 'parent',
          school: 'Alpha',
        }],
      });
      ctx = await startApp(mountOpen(store));
      const res = await request(ctx.baseUrl, 'POST', '/api/login', { nationalNumber: 'X1' });
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.user).toEqual({
        nationalNumber: 'X1',
        name: 'Ahmed',
        role: 'parent',
        school: 'Alpha',
      });
      const visits = await store.visits.read();
      expect(visits.totalVisits).toBe(1);
      expect(visits.loginHistory).toHaveLength(1);
      const record = visits.loginHistory[0];
      expect(record.nationalNumber).toBe('X1');
      expect(record.name).toBe('Ahmed');
      expect(record.school).toBe('Alpha');
      expect(record.loginCount).toBe(1);
      expect(record.pageViews).toBe(0);
      expect(record.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    });
    test('returns 400 when nationalNumber is missing', async () => {
      const store = makeStubStore();
      ctx = await startApp(mountOpen(store));
      const res = await request(ctx.baseUrl, 'POST', '/api/login', {});
      expect(res.status).toBe(400);
    });
  });

  describe('POST /api/developer/login', () => {
    test('accepts the default dev password and returns a dev_ token', async () => {
      const store = makeStubStore();
      ctx = await startApp(mountOpen(store));
      const res = await request(ctx.baseUrl, 'POST', '/api/developer/login', {
        password: 'dev_ketab_2026',
      });
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.sessionToken).toMatch(/^dev_[a-f0-9]{48}$/);
      expect(res.body.user.role).toBe('developer');
    });

    test('rejects a wrong password with 401', async () => {
      const store = makeStubStore();
      ctx = await startApp(mountOpen(store));
      const res = await request(ctx.baseUrl, 'POST', '/api/developer/login', {
        password: 'wrong',
      });
      expect(res.status).toBe(401);
    });

    test('returns 400 when password is missing', async () => {
      const store = makeStubStore();
      ctx = await startApp(mountOpen(store));
      const res = await request(ctx.baseUrl, 'POST', '/api/developer/login', {});
      expect(res.status).toBe(400);
    });
  });

  describe('POST /api/admin/login', () => {
    test('validates credentials against the admin store and mints an admin_ token', async () => {
      const passwordHash = bcrypt.hashSync('hunter2', 10);
      const store = makeStubStore({ admin: { username: 'admin', passwordHash } });
      ctx = await startApp(mountOpen(store));
      const res = await request(ctx.baseUrl, 'POST', '/api/admin/login', {
        username: 'admin',
        password: 'hunter2',
      });
      expect(res.status).toBe(200);
      expect(res.body.sessionToken).toMatch(/^admin_[a-f0-9]{48}$/);
    });

    test('rejects a wrong password with 401', async () => {
      const passwordHash = bcrypt.hashSync('hunter2', 10);
      const store = makeStubStore({ admin: { username: 'admin', passwordHash } });
      ctx = await startApp(mountOpen(store));
      const res = await request(ctx.baseUrl, 'POST', '/api/admin/login', {
        username: 'admin',
        password: 'wrong',
      });
      expect(res.status).toBe(401);
    });

    test('returns 500 when the admin file is missing', async () => {
      const store = makeStubStore();
      ctx = await startApp(mountOpen(store));
      const res = await request(ctx.baseUrl, 'POST', '/api/admin/login', {
        username: 'admin',
        password: 'hunter2',
      });
      expect(res.status).toBe(500);
    });

    test('returns 400 when username or password is missing', async () => {
      const store = makeStubStore();
      ctx = await startApp(mountOpen(store));
      const res = await request(ctx.baseUrl, 'POST', '/api/admin/login', { username: '' });
      expect(res.status).toBe(400);
    });
  });

  describe('POST /api/admin/change-password', () => {
    test('changes the password when current is correct and new is different', async () => {
      const oldHash = bcrypt.hashSync('oldpass', 10);
      const store = makeStubStore({ admin: { username: 'admin', passwordHash: oldHash } });
      ctx = await startApp(mountGated(store));
      const res = await requestWithHeaders(ctx.baseUrl, 'POST', '/api/admin/change-password',
        { currentPassword: 'oldpass', newPassword: 'newpass1' },
        { authorization: ADMIN_TOKEN });
      expect(res.status).toBe(200);
      const admin = await store.admin.read();
      expect(admin.passwordHash).not.toBe(oldHash);
      expect(bcrypt.compareSync('newpass1', admin.passwordHash)).toBe(true);
    });

    test('rejects an incorrect current password', async () => {
      const passwordHash = bcrypt.hashSync('oldpass', 10);
      const store = makeStubStore({ admin: { username: 'admin', passwordHash } });
      ctx = await startApp(mountGated(store));
      const res = await requestWithHeaders(ctx.baseUrl, 'POST', '/api/admin/change-password',
        { currentPassword: 'wrong', newPassword: 'newpass1' },
        { authorization: ADMIN_TOKEN });
      expect(res.status).toBe(401);
    });

    test('rejects when new password equals current', async () => {
      const passwordHash = bcrypt.hashSync('oldpass', 10);
      const store = makeStubStore({ admin: { username: 'admin', passwordHash } });
      ctx = await startApp(mountGated(store));
      const res = await requestWithHeaders(ctx.baseUrl, 'POST', '/api/admin/change-password',
        { currentPassword: 'oldpass', newPassword: 'oldpass' },
        { authorization: ADMIN_TOKEN });
      expect(res.status).toBe(400);
    });

    test('rejects when new password is too short', async () => {
      const passwordHash = bcrypt.hashSync('oldpass', 10);
      const store = makeStubStore({ admin: { username: 'admin', passwordHash } });
      ctx = await startApp(mountGated(store));
      const res = await requestWithHeaders(ctx.baseUrl, 'POST', '/api/admin/change-password',
        { currentPassword: 'oldpass', newPassword: 'abc' },
        { authorization: ADMIN_TOKEN });
      expect(res.status).toBe(400);
    });

    test('returns 401 when no admin token is provided (gated)', async () => {
      const passwordHash = bcrypt.hashSync('oldpass', 10);
      const store = makeStubStore({ admin: { username: 'admin', passwordHash } });
      ctx = await startApp(mountGated(store));
      const res = await request(ctx.baseUrl, 'POST', '/api/admin/change-password',
        { currentPassword: 'oldpass', newPassword: 'newpass1' });
      expect(res.status).toBe(401);
    });
  });
});
