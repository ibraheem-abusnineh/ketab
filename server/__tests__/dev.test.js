/**
 * Tests for the dev router (ticket #12).
 *
 * Five read endpoints per entity + a boot-reset endpoint. Every route is
 * gated by `requireDev` at the router level (not per route), per ADR-0003
 * (dev is a superset of admin — admin tokens do NOT satisfy requireDev).
 *
 * Token-construction strategy (ticket #12 brief):
 *   - dev token: hit `POST /api/developer/login` and capture `sessionToken`
 *   - admin token: hit `POST /api/admin/login` and capture `sessionToken`
 *   - no token: omit the Authorization header
 *
 * The router is mounted at root inside each test app so requireDev fires
 * on the same path it would in production (the composer's pattern).
 */
const express = require('express');
const bcrypt = require('bcryptjs');
const { createDevRouter } = require('../routes/dev');
const { createAuthRouter } = require('../routes/auth');
const { startApp, request, requestWithHeaders, makeStubStore } = require('./__httpHelper');

/**
 * Mount only the dev router. The router declares its own requireDev
 * gate via `router.use(requireDev)` — the mount here does NOT add a
 * second gate. This makes the test exercise the actual contract:
 * gating lives in the router, not in the composer.
 */
function mountDevRouter(store) {
  const app = express();
  app.use(express.json());
  app.use(createDevRouter(store));
  return app;
}

/**
 * Mount the auth router (for token-mint setup) followed by the dev
 * router. The dev router carries its own requireDev gate; the auth
 * router's routes are intentionally open (matches production).
 */
function mountWithAuth(store) {
  const app = express();
  app.use(express.json());
  app.use(createAuthRouter(store));
  app.use(createDevRouter(store));
  return app;
}

/**
 * Mint a dev token by hitting POST /api/developer/login. Returns the
 * raw sessionToken (matches `^dev_[a-f0-9]{48}$`).
 */
async function mintDevToken(ctx) {
  const res = await request(ctx.baseUrl, 'POST', '/api/developer/login', {
    password: 'dev_ketab_2026',
  });
  if (res.status !== 200) {
    throw new Error(`dev login failed: ${res.status} ${JSON.stringify(res.body)}`);
  }
  return res.body.sessionToken;
}

/**
 * Mint an admin token by hitting POST /api/admin/login. Returns the
 * raw sessionToken (matches `^admin_[a-f0-9]{48}$`).
 */
async function mintAdminToken(ctx, username, password, passwordHash) {
  const res = await request(ctx.baseUrl, 'POST', '/api/admin/login', {
    username,
    password,
  });
  if (res.status !== 200) {
    throw new Error(`admin login failed: ${res.status} ${JSON.stringify(res.body)}`);
  }
  return res.body.sessionToken;
}

describe('dev router', () => {
  let ctx;
  afterEach(() => {
    if (ctx && ctx.server) ctx.server.close();
    ctx = null;
  });

  describe('gating (requireDev)', () => {
    test('GET /api/dev/users with no token → 401', async () => {
      const store = makeStubStore();
      ctx = await startApp(mountDevRouter(store));
      const res = await request(ctx.baseUrl, 'GET', '/api/dev/users');
      expect(res.status).toBe(401);
      expect(res.body.success).toBe(false);
    });

    test('GET /api/dev/users with an admin token → 401 (admin is not a dev)', async () => {
      const passwordHash = bcrypt.hashSync('hunter2', 10);
      const store = makeStubStore({ admin: { username: 'admin', passwordHash } });
      ctx = await startApp(mountWithAuth(store));
      const adminToken = await mintAdminToken(ctx, 'admin', 'hunter2');
      const res = await requestWithHeaders(ctx.baseUrl, 'GET', '/api/dev/users', null, {
        Authorization: adminToken,
      });
      expect(res.status).toBe(401);
    });

    test('GET /api/dev/users with a dev token → 200 with raw users data', async () => {
      const usersFixture = [{ nationalNumber: '111', name: 'Alice' }];
      const store = makeStubStore({ users: usersFixture });
      ctx = await startApp(mountWithAuth(store));
      const devToken = await mintDevToken(ctx);
      const res = await requestWithHeaders(ctx.baseUrl, 'GET', '/api/dev/users', null, {
        Authorization: devToken,
      });
      expect(res.status).toBe(200);
      expect(res.body).toEqual(usersFixture);
    });
  });

  describe('read endpoints (dev token in)', () => {
    async function setupDevCtx(store) {
      const app = mountWithAuth(store);
      ctx = await startApp(app);
      const token = await mintDevToken(ctx);
      return token;
    }

    test('GET /api/dev/visits returns raw visits (including loginHistory)', async () => {
      const visitsFixture = {
        totalVisits: 3,
        loginHistory: [
          { nationalNumber: '111', name: 'Alice', at: 1 },
          { nationalNumber: '222', name: 'Bob', at: 2 },
        ],
      };
      const store = makeStubStore({ visits: visitsFixture });
      const token = await setupDevCtx(store);
      const res = await requestWithHeaders(ctx.baseUrl, 'GET', '/api/dev/visits', null, {
        Authorization: token,
      });
      expect(res.status).toBe(200);
      expect(res.body).toEqual(visitsFixture);
      expect(Array.isArray(res.body.loginHistory)).toBe(true);
    });

    test('GET /api/dev/notifications returns raw notifications', async () => {
      const notificationsFixture = [
        { id: 'n1', title: 'First', body: 'Hello' },
        { id: 'n2', title: 'Second', body: 'World' },
      ];
      const store = makeStubStore({ notifications: notificationsFixture });
      const token = await setupDevCtx(store);
      const res = await requestWithHeaders(ctx.baseUrl, 'GET', '/api/dev/notifications', null, {
        Authorization: token,
      });
      expect(res.status).toBe(200);
      expect(res.body).toEqual(notificationsFixture);
    });

    test('GET /api/dev/courses returns raw courses', async () => {
      const coursesFixture = {
        arabic: { locked: false, label: 'Arabic Language' },
        english: { locked: true, label: 'English Language' },
      };
      const store = makeStubStore({ courses: coursesFixture });
      const token = await setupDevCtx(store);
      const res = await requestWithHeaders(ctx.baseUrl, 'GET', '/api/dev/courses', null, {
        Authorization: token,
      });
      expect(res.status).toBe(200);
      expect(res.body).toEqual(coursesFixture);
    });

    test('GET /api/dev/admin returns raw admin data', async () => {
      const adminFixture = { username: 'admin', passwordHash: 'hash' };
      const store = makeStubStore({ admin: adminFixture });
      const token = await setupDevCtx(store);
      const res = await requestWithHeaders(ctx.baseUrl, 'GET', '/api/dev/admin', null, {
        Authorization: token,
      });
      expect(res.status).toBe(200);
      expect(res.body).toEqual(adminFixture);
    });
  });

  describe('POST /api/dev/bootstrap', () => {
    test('with dev token → 200 {ok: true} after calling store.bootstrap()', async () => {
      let bootstrapCalls = 0;
      const baseStore = makeStubStore();
      // Wrap with a stub that counts bootstrap() calls while keeping the
      // entity read/write contract the router exercises.
      const store = {
        ...baseStore,
        bootstrap: async () => {
          bootstrapCalls += 1;
          return { ok: true };
        },
      };
      ctx = await startApp(mountWithAuth(store));
      const token = await mintDevToken(ctx);
      const res = await requestWithHeaders(ctx.baseUrl, 'POST', '/api/dev/bootstrap', null, {
        Authorization: token,
      });
      expect(res.status).toBe(200);
      expect(res.body).toEqual({ ok: true });
      expect(bootstrapCalls).toBe(1);
    });

    test('with admin token → 401', async () => {
      const passwordHash = bcrypt.hashSync('hunter2', 10);
      const store = makeStubStore({ admin: { username: 'admin', passwordHash } });
      ctx = await startApp(mountWithAuth(store));
      const adminToken = await mintAdminToken(ctx, 'admin', 'hunter2');
      const res = await requestWithHeaders(ctx.baseUrl, 'POST', '/api/dev/bootstrap', null, {
        Authorization: adminToken,
      });
      expect(res.status).toBe(401);
    });

    test('with no token → 401', async () => {
      const store = makeStubStore();
      ctx = await startApp(mountDevRouter(store));
      const res = await request(ctx.baseUrl, 'POST', '/api/dev/bootstrap');
      expect(res.status).toBe(401);
    });
  });
});
