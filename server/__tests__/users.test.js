/**
 * Tests for the users router (ticket #10).
 *
 * Five admin-gated routes: GET, POST add, PUT, DELETE, POST import-csv.
 * Auth is gated inside the router via requireAdmin.
 *
 * The CSV import path uses multer in production; tests stub multer by
 * directly setting req.file. We only verify validation pre-conditions
 * for the import route here; the happy-path parse is exercised via the
 * live smoke test (real CSV headers, real parseCSV pipeline).
 */
const express = require('express');
const { createUsersRouter } = require('../routes/users');
const { startApp, request, requestWithHeaders, makeStubStore } = require('./__httpHelper');

const ADMIN_TOKEN = 'admin_' + 'a'.repeat(40);

function mount(store) {
  const app = express();
  app.use(express.json());
  app.use(createUsersRouter(store));
  return app;
}

function asAdmin(method, ctx, path, body) {
  return requestWithHeaders(ctx.baseUrl, method, path, body, { authorization: ADMIN_TOKEN });
}

describe('users router', () => {
  let ctx;
  afterEach(() => {
    if (ctx && ctx.server) ctx.server.close();
    ctx = null;
  });

  describe('GET /api/users', () => {
    test('returns the users array', async () => {
      const store = makeStubStore({
        users: [{ nationalNumber: 'X1', name: 'Ahmed', role: 'parent' }],
        notifications: [],
      });
      ctx = await startApp(mount(store));
      const res = await asAdmin('GET', ctx, '/api/users', undefined);
      expect(res.status).toBe(200);
      expect(res.body.users).toHaveLength(1);
    });

    test('returns 401 without an admin token', async () => {
      const store = makeStubStore({ users: [], notifications: [] });
      ctx = await startApp(mount(store));
      const res = await request(ctx.baseUrl, 'GET', '/api/users');
      expect(res.status).toBe(401);
    });
  });

  describe('POST /api/users/add', () => {
    test('adds a valid user and returns the new record', async () => {
      const store = makeStubStore({ users: [], notifications: [] });
      ctx = await startApp(mount(store));
      const res = await asAdmin('POST', ctx, '/api/users/add', {
        nationalNumber: 'N1', name: 'Sara', role: 'parent', school: 'Alpha',
      });
      expect(res.status).toBe(200);
      expect(res.body.user.nationalNumber).toBe('N1');
      const users = await store.users.read();
      expect(users).toHaveLength(1);
    });

    test('returns 400 when validation fails', async () => {
      const store = makeStubStore({ users: [], notifications: [] });
      ctx = await startApp(mount(store));
      const res = await asAdmin('POST', ctx, '/api/users/add', { name: '', role: 'parent' });
      expect(res.status).toBe(400);
    });

    test('returns 400 when national number already exists', async () => {
      const store = makeStubStore({
        users: [{ nationalNumber: 'N1', name: 'A', role: 'parent' }],
        notifications: [],
      });
      ctx = await startApp(mount(store));
      const res = await asAdmin('POST', ctx, '/api/users/add', {
        nationalNumber: 'N1', name: 'B', role: 'parent',
      });
      expect(res.status).toBe(400);
    });
  });

  describe('PUT /api/users/:nationalNumber', () => {
    test('updates allowed fields and creates a notification when something changed', async () => {
      const store = makeStubStore({
        users: [{ nationalNumber: 'N1', name: 'Ahmed', role: 'parent', school: 'Alpha' }],
        notifications: [],
      });
      ctx = await startApp(mount(store));
      const res = await asAdmin('PUT', ctx, '/api/users/N1', { name: 'Ahmed New', school: 'Beta' });
      expect(res.status).toBe(200);
      const users = await store.users.read();
      expect(users[0].name).toBe('Ahmed New');
      expect(users[0].school).toBe('Beta');
      const notifications = await store.notifications.read();
      expect(notifications).toHaveLength(1);
      expect(notifications[0].type).toBe('profile_update');
      expect(notifications[0].userId).toBe('N1');
    });

    test('skips the notification when no allowed fields change', async () => {
      const store = makeStubStore({
        users: [{ nationalNumber: 'N1', name: 'Ahmed', role: 'parent', school: 'Alpha' }],
        notifications: [],
      });
      ctx = await startApp(mount(store));
      const res = await asAdmin('PUT', ctx, '/api/users/N1', { name: 'Ahmed' });
      expect(res.status).toBe(200);
      const notifications = await store.notifications.read();
      expect(notifications).toHaveLength(0);
    });

    test('returns 404 when user does not exist', async () => {
      const store = makeStubStore({ users: [], notifications: [] });
      ctx = await startApp(mount(store));
      const res = await asAdmin('PUT', ctx, '/api/users/MISSING', { name: 'X' });
      expect(res.status).toBe(404);
    });
  });

  describe('PUT /api/users/:nationalNumber/nationalNumber', () => {
    test('changes the user\'s national number and the new id resolves to the same user', async () => {
      const store = makeStubStore({
        users: [{ nationalNumber: 'N1', name: 'Ahmed', role: 'parent', school: 'Alpha' }],
        notifications: [],
      });
      ctx = await startApp(mount(store));
      const res = await asAdmin('PUT', ctx, '/api/users/N1/nationalNumber', { newNationalNumber: 'N1-NEW' });
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.user.nationalNumber).toBe('N1-NEW');
      expect(res.body.user.name).toBe('Ahmed');

      const users = await store.users.read();
      expect(users[0].nationalNumber).toBe('N1-NEW');
      expect(users[0].name).toBe('Ahmed');
      // Confirm the new id resolves to the same user via the list endpoint.
      const lookup = await asAdmin('GET', ctx, '/api/users', undefined);
      expect(lookup.status).toBe(200);
      expect(lookup.body.users.find((u) => u.nationalNumber === 'N1-NEW')).toBeTruthy();
      expect(lookup.body.users.find((u) => u.nationalNumber === 'N1')).toBeUndefined();
    });

    test('returns 409 when the new national number is already in use', async () => {
      const store = makeStubStore({
        users: [
          { nationalNumber: 'N1', name: 'A', role: 'parent' },
          { nationalNumber: 'N2', name: 'B', role: 'parent' },
        ],
        notifications: [],
      });
      ctx = await startApp(mount(store));
      const res = await asAdmin('PUT', ctx, '/api/users/N1/nationalNumber', { newNationalNumber: 'N2' });
      expect(res.status).toBe(409);
      const users = await store.users.read();
      expect(users.find((u) => u.nationalNumber === 'N1')).toBeTruthy();
      expect(users.find((u) => u.nationalNumber === 'N2')).toBeTruthy();
    });

    test('returns 400 when the new national number is missing', async () => {
      const store = makeStubStore({
        users: [{ nationalNumber: 'N1', name: 'A', role: 'parent' }],
        notifications: [],
      });
      ctx = await startApp(mount(store));
      const res = await asAdmin('PUT', ctx, '/api/users/N1/nationalNumber', {});
      expect(res.status).toBe(400);
    });

    test('returns 404 when the user does not exist', async () => {
      const store = makeStubStore({ users: [], notifications: [] });
      ctx = await startApp(mount(store));
      const res = await asAdmin('PUT', ctx, '/api/users/MISSING/nationalNumber', { newNationalNumber: 'NEW' });
      expect(res.status).toBe(404);
    });
  });

  describe('DELETE /api/users/:nationalNumber', () => {
    test('removes the user', async () => {
      const store = makeStubStore({
        users: [
          { nationalNumber: 'N1', name: 'A', role: 'parent' },
          { nationalNumber: 'N2', name: 'B', role: 'parent' },
        ],
        notifications: [],
      });
      ctx = await startApp(mount(store));
      const res = await asAdmin('DELETE', ctx, '/api/users/N1', undefined);
      expect(res.status).toBe(200);
      const users = await store.users.read();
      expect(users).toHaveLength(1);
      expect(users[0].nationalNumber).toBe('N2');
    });

    test('returns 404 when user does not exist', async () => {
      const store = makeStubStore({ users: [], notifications: [] });
      ctx = await startApp(mount(store));
      const res = await asAdmin('DELETE', ctx, '/api/users/MISSING', undefined);
      expect(res.status).toBe(404);
    });
  });

  describe('POST /api/users/import-csv', () => {
    test('returns 400 when no file is uploaded', async () => {
      const store = makeStubStore({ users: [], notifications: [] });
      ctx = await startApp(mount(store));
      const res = await asAdmin('POST', ctx, '/api/users/import-csv', {
        strategy: 'add', role: 'parent',
      });
      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/No CSV file uploaded/);
    });

    test('returns 400 for an invalid role when a file is attached', async () => {
      const store = makeStubStore({ users: [], notifications: [] });
      const realRouter = createUsersRouter(store);
      const app = express();
      app.use((req, _res, next) => { req.file = { path: '/tmp/fake-csv' }; next(); });
      app.use(express.json());
      app.use(realRouter);
      ctx = await startApp(app);
      const res = await asAdmin('POST', ctx, '/api/users/import-csv', {
        strategy: 'add', role: 'student',
      });
      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/Invalid CSV import role/);
    });

    test('returns 400 for an invalid strategy when a file is attached', async () => {
      const store = makeStubStore({ users: [], notifications: [] });
      const realRouter = createUsersRouter(store);
      const app = express();
      app.use((req, _res, next) => { req.file = { path: '/tmp/fake-csv' }; next(); });
      app.use(express.json());
      app.use(realRouter);
      ctx = await startApp(app);
      const res = await asAdmin('POST', ctx, '/api/users/import-csv', {
        strategy: 'merge', role: 'parent',
      });
      expect(res.status).toBe(400);
      expect(res.body.error).toMatch(/Invalid strategy/);
    });
  });
});
