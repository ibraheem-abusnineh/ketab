/**
 * End-to-end smoke test (ticket #17).
 *
 * The integration gate for the storage-layer refactor. Spins up the real
 * `createApp` from server/composer.js against a real `createStore` with a
 * real `createLocalAdapter` pointed at a per-run tmp dir, and exercises
 * one endpoint per route category to prove the 16 prior tickets together
 * deliver a working system end-to-end.
 *
 * Coverage (one endpoint per category — every category hit, not every
 * endpoint):
 *
 *   - GET  /api/health              — health router (no auth)
 *   - GET  /api/courses/status      — courses router (no auth)
 *   - POST /api/track-visit         — tracking router (no auth)
 *   - GET  /api/visit-count         — tracking router (no auth)
 *   - POST /api/login/guest         — auth router (no auth)
 *   - POST /api/developer/login     — auth router (no auth, dev password)
 *   - GET  /api/dev/visits          — dev router (dev token)
 *   - GET  /api/admin/notifications — notifications router (admin token)
 *   - GET  /api/stats/by-school     — stats router (admin token)
 *   - GET  /api/reports/by-user     — reports router (admin token)
 *   - GET  /api/user/profile/:nat   — profile router (admin token)
 *
 * Idempotent (acceptance criterion #6):
 *   - No global state mutation: writes are confined to a tmp dir;
 *     `server/data/*` is never touched.
 *   - No port binding beyond the harness's ephemeral port-0 listener.
 *   - `afterAll` removes the tmp dir.
 *
 * ADR references:
 *   - ADR-0001 (store as the seam)        — exercised by every endpoint
 *   - ADR-0002 (best-effort remote write) — unconfigured remote is a no-op
 *   - ADR-0003 (operator middlewares)      — dev/admin gating exercised
 */
const fs = require('fs');
const os = require('os');
const path = require('path');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');

const { createStore } = require('../storage/store');
const { createLocalAdapter } = require('../storage/localAdapter');
const { createRemoteAdapter } = require('../storage/remoteAdapter');
const { createApp } = require('../composer');
const { startApp, request, requestWithHeaders } = require('./__httpHelper');

// The /api/developer/login route reads its password from
// `process.env.DEV_PASSWORD` with a hardcoded fallback of
// 'dev_ketab_2026' (server/routes/auth.js:161). We use the fallback value
// so the test stays idempotent and doesn't mutate process.env.
const ADMIN_USERNAME = 'e2e_admin';
const ADMIN_PASSWORD = 'e2e_password_2026';
const DEV_PASSWORD = 'dev_ketab_2026';

let tmpDir;
let uploadsDir;
let store;
let ctx;
let adminToken;
let devToken;

beforeAll(async () => {
  // Tmp dir under os.tmpdir() so the test never touches server/data (AC #7).
  const rand = crypto.randomBytes(8).toString('hex');
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), `ketab-e2e-${rand}-`));
  uploadsDir = fs.mkdtempSync(path.join(os.tmpdir(), `ketab-e2e-uploads-${rand}-`));

  // Seed the admin file before bootstrap so /api/admin/login can authenticate.
  // store.bootstrap() only ensures visits + notifications — admin is left to
  // the legacy setup step (server/setup.js). For the e2e test we write the
  // admin.json file directly to the tmp dir; the file shape matches
  // server/data/admin.json (ticket #7 contract).
  fs.writeFileSync(
    path.join(tmpDir, 'admin.json'),
    JSON.stringify(
      { username: ADMIN_USERNAME, passwordHash: bcrypt.hashSync(ADMIN_PASSWORD, 10) },
      null,
      2
    ),
    'utf8'
  );

  store = createStore({
    local: createLocalAdapter({ baseDir: tmpDir }),
    remote: createRemoteAdapter(),
  });
  await store.bootstrap();

  const app = createApp({ store, uploadsDir });
  ctx = await startApp(app);

  // Mint a dev token by hitting the real /api/developer/login route. The
  // route reads the dev password from `process.env.DEV_PASSWORD` with a
  // hardcoded fallback of 'dev_ketab_2026' (server/routes/auth.js:161).
  // The fallback matches DEV_PASSWORD above so no env mutation is needed
  // and the test stays idempotent.
  const devLoginRes = await request(ctx.baseUrl, 'POST', '/api/developer/login', {
    password: DEV_PASSWORD,
  });
  if (devLoginRes.status !== 200 || !devLoginRes.body.sessionToken) {
    throw new Error(`e2e: dev login failed: ${devLoginRes.status} ${JSON.stringify(devLoginRes.body)}`);
  }
  devToken = devLoginRes.body.sessionToken;

  // Mint an admin token by hitting the real /api/admin/login route. This
  // exercises the bcrypt path through the live admin.json we wrote above.
  const adminLoginRes = await request(ctx.baseUrl, 'POST', '/api/admin/login', {
    username: ADMIN_USERNAME,
    password: ADMIN_PASSWORD,
  });
  if (adminLoginRes.status !== 200 || !adminLoginRes.body.sessionToken) {
    throw new Error(`e2e: admin login failed: ${adminLoginRes.status} ${JSON.stringify(adminLoginRes.body)}`);
  }
  adminToken = adminLoginRes.body.sessionToken;
});

afterAll(() => {
  // Acceptance criterion #6: idempotent. Tear down the listener and the
  // tmp dirs so re-running the suite leaves no state behind.
  if (ctx && ctx.server) ctx.server.close();
  if (tmpDir && fs.existsSync(tmpDir)) fs.rmSync(tmpDir, { recursive: true, force: true });
  if (uploadsDir && fs.existsSync(uploadsDir)) fs.rmSync(uploadsDir, { recursive: true, force: true });
});

describe('e2e smoke (ticket #17)', () => {
  test('GET /api/health — health router, no auth', async () => {
    const res = await request(ctx.baseUrl, 'GET', '/api/health');
    expect(res.status).toBe(200);
    // Health returns a plain { status, timestamp } body — see health.js:12.
    expect(res.body.status).toBe('OK');
    expect(typeof res.body.timestamp).toBe('string');
  });

  test('GET /api/courses/status — courses router, no auth', async () => {
    const res = await request(ctx.baseUrl, 'GET', '/api/courses/status');
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    // Default course shape from courses.js:17-20.
    expect(res.body.courses).toHaveProperty('arabic');
    expect(res.body.courses).toHaveProperty('english');
    expect(typeof res.body.courses.arabic.locked).toBe('boolean');
  });

  test('POST /api/track-visit — tracking router, no auth', async () => {
    const res = await request(ctx.baseUrl, 'POST', '/api/track-visit', {});
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(typeof res.body.totalVisits).toBe('number');
    expect(res.body.totalVisits).toBeGreaterThanOrEqual(1);
  });

  test('GET /api/visit-count — tracking router, no auth (reads the same store)', async () => {
    // Anonymous page-load to bump totalVisits before the read.
    await request(ctx.baseUrl, 'POST', '/api/track-visit', {});
    const res = await request(ctx.baseUrl, 'GET', '/api/visit-count');
    expect(res.status).toBe(200);
    expect(typeof res.body.totalVisits).toBe('number');
    // totalVisits is a monotonic counter — must be >= the count after the
    // earlier /api/track-visit calls above.
    expect(res.body.totalVisits).toBeGreaterThanOrEqual(2);
  });

  test('POST /api/login/guest — auth router, no auth (creates a guest user)', async () => {
    const res = await request(ctx.baseUrl, 'POST', '/api/login/guest', {
      fullName: 'E2E Guest',
      phoneNumber: '0790000001',
    });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.user.name).toBe('E2E Guest');
    expect(res.body.user.role).toBe('guest');
    expect(res.body.user.nationalNumber).toMatch(/^GUEST_/);
  });

  test('POST /api/developer/login — auth router, no auth (dev password)', async () => {
    // The token was minted in beforeAll; this test just proves the route
    // works end-to-end and the token has the dev_ prefix.
    expect(devToken.startsWith('dev_')).toBe(true);
    expect(devToken.length).toBeGreaterThanOrEqual(32);
  });

  test('GET /api/dev/visits — dev router, dev token', async () => {
    const res = await requestWithHeaders(ctx.baseUrl, 'GET', '/api/dev/visits', null, {
      authorization: devToken,
    });
    expect(res.status).toBe(200);
    // /api/dev/* returns raw store data (dev.js:46); the visits entity
    // carries totalVisits + loginHistory per ADR-0004.
    expect(typeof res.body).toBe('object');
    expect(res.body).not.toBeNull();
    expect(typeof res.body.totalVisits).toBe('number');
    expect(Array.isArray(res.body.loginHistory)).toBe(true);
  });

  test('GET /api/admin/notifications — notifications router, admin token', async () => {
    const res = await requestWithHeaders(ctx.baseUrl, 'GET', '/api/admin/notifications', null, {
      authorization: adminToken,
    });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.notifications)).toBe(true);
  });

  test('GET /api/stats/by-school — stats router, admin token', async () => {
    const res = await requestWithHeaders(ctx.baseUrl, 'GET', '/api/stats/by-school', null, {
      authorization: adminToken,
    });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  test('GET /api/reports/by-user — reports router, admin token', async () => {
    const res = await requestWithHeaders(ctx.baseUrl, 'GET', '/api/reports/by-user', null, {
      authorization: adminToken,
    });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
  });

  test('GET /api/user/profile/<natNum> — profile router, admin token (after guest login)', async () => {
    // The guest login above created a user with a server-generated national
    // number (GUEST_<timestamp>_<rand>). Fetch the live list via the dev
    // surface, then GET the profile for the first guest we find. This
    // exercises the cross-store path: writes via auth → reads via profile.
    const usersRes = await requestWithHeaders(ctx.baseUrl, 'GET', '/api/dev/users', null, {
      authorization: devToken,
    });
    expect(usersRes.status).toBe(200);
    const guest = Array.isArray(usersRes.body)
      ? usersRes.body.find((u) => u.role === 'guest')
      : null;
    expect(guest).toBeTruthy();
    expect(typeof guest.nationalNumber).toBe('string');

    const res = await requestWithHeaders(
      ctx.baseUrl,
      'GET',
      `/api/user/profile/${encodeURIComponent(guest.nationalNumber)}`,
      null,
      { authorization: adminToken }
    );
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.data.nationalNumber).toBe(guest.nationalNumber);
    expect(res.body.data.role).toBe('guest');
    expect(typeof res.body.data.totalLogins).toBe('number');
  });
});
