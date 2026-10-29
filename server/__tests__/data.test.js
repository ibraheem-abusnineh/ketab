/**
 * Tests for the data backup router.
 *
 * Covers the pure parsing/validation helpers plus the admin-gated
 * summary / export / import routes, using the shared stub store so the
 * filesystem is never touched.
 */
const express = require('express');
const {
  createDataRouter,
  entityFromFilename,
  validateEntity,
  parseUploadedFile,
  mergeByKey,
} = require('../routes/data');
const { startApp, request, requestWithHeaders, makeStubStore } = require('./__httpHelper');

const ADMIN_TOKEN = 'admin_' + 'a'.repeat(40);

describe('data router helpers', () => {
  test('entityFromFilename recognises entity names and noisy names', () => {
    expect(entityFromFilename('users.json')).toBe('users');
    expect(entityFromFilename('Users (1).JSON')).toBe('users');
    expect(entityFromFilename('visits.json')).toBe('visits');
    expect(entityFromFilename('notifications.json')).toBe('notifications');
    expect(entityFromFilename('courses.json')).toBe('courses');
    expect(entityFromFilename('admin.json')).toBe('admin');
    expect(entityFromFilename('something-else.txt')).toBeNull();
  });

  test('validateEntity accepts a users array', () => {
    const res = validateEntity('users', [{ nationalNumber: '1', name: 'A' }]);
    expect(res.ok).toBe(true);
    expect(res.value).toHaveLength(1);
  });

  test('validateEntity rejects a user without a nationalNumber', () => {
    const res = validateEntity('users', [{ name: 'A' }]);
    expect(res.ok).toBe(false);
  });

  test('validateEntity normalises visits and recomputes a missing total', () => {
    const res = validateEntity('visits', {
      loginHistory: [{ loginCount: 3 }, { loginCount: 4 }],
    });
    expect(res.ok).toBe(true);
    expect(res.value.totalVisits).toBe(7);
  });

  test('validateEntity keeps only recognized courses', () => {
    const res = validateEntity('courses', {
      arabic: { locked: true, label: 'AR' },
      nope: { locked: true },
    });
    expect(res.ok).toBe(true);
    expect(res.value).toEqual({ arabic: { locked: true, label: 'AR' } });
  });

  test('validateEntity refuses a non-bcrypt admin hash', () => {
    expect(validateEntity('admin', { username: 'admin', passwordHash: 'plain' }).ok).toBe(false);
    expect(
      validateEntity('admin', { username: 'admin', passwordHash: '$2a$10$abcdefghijklmnopqrstuv' }).ok
    ).toBe(true);
  });

  test('parseUploadedFile reads a full backup file', () => {
    const text = JSON.stringify({
      format: 'ketab-backup',
      data: { users: [{ nationalNumber: '1' }], notifications: [] },
    });
    const parsed = parseUploadedFile({ filename: 'ketab-backup.json', text });
    expect(parsed.entities.users).toEqual([{ nationalNumber: '1' }]);
    expect(parsed.entities.notifications).toEqual([]);
  });

  test('parseUploadedFile unwraps a raw API export response', () => {
    const text = JSON.stringify({
      success: true,
      backup: {
        format: 'ketab-backup',
        data: { users: [{ nationalNumber: '1' }], courses: { math: { locked: true } } },
      },
    });
    const parsed = parseUploadedFile({ filename: 'backup.json', text });
    expect(parsed.entities.users).toEqual([{ nationalNumber: '1' }]);
    expect(parsed.entities.courses).toEqual({ math: { locked: true } });
  });

  test('parseUploadedFile reads a single-entity file', () => {
    const parsed = parseUploadedFile({
      filename: 'visits.json',
      text: JSON.stringify({ totalVisits: 2, loginHistory: [] }),
    });
    expect(parsed.entities.visits).toEqual({ totalVisits: 2, loginHistory: [] });
  });

  test('parseUploadedFile reads a seed SQL file via its header', () => {
    const row = JSON.stringify({ nationalNumber: '9', name: 'SQL User' });
    const sql = [
      '-- ketab data seed: users',
      '-- rows: 1',
      '',
      `INSERT INTO users (payload) VALUES ('${row}');`,
      '',
    ].join('\n');
    const parsed = parseUploadedFile({ filename: 'users.sql', text: sql });
    expect(parsed.entities.users).toEqual([{ nationalNumber: '9', name: 'SQL User' }]);
  });

  test('mergeByKey adds new records and updates existing ones', () => {
    const existing = [
      { id: 'a', v: 1 },
      { id: 'b', v: 1 },
    ];
    const merged = mergeByKey(existing, [{ id: 'b', v: 2 }, { id: 'c', v: 3 }], 'id');
    expect(merged.added).toBe(1);
    expect(merged.updated).toBe(1);
    expect(merged.value).toEqual([
      { id: 'a', v: 1 },
      { id: 'b', v: 2 },
      { id: 'c', v: 3 },
    ]);
  });
});

describe('data router HTTP', () => {
  let ctx;
  afterEach(() => {
    if (ctx && ctx.server) ctx.server.close();
    ctx = null;
  });

  function mount(store) {
    const app = express();
    app.use(express.json());
    app.use(createDataRouter(store));
    return app;
  }

  const seedStore = () =>
    makeStubStore({
      users: [{ nationalNumber: '1', name: 'A' }],
      visits: { totalVisits: 5, loginHistory: [{ nationalNumber: '1', date: '2026-10-01', loginCount: 5 }] },
      notifications: [
        { id: 'n1', type: 'profile_update', read: true },
        { id: 'n2', type: 'profile_edit_request', status: 'pending' },
      ],
      courses: { arabic: { locked: false, label: 'Arabic Language' } },
      admin: { username: 'admin', passwordHash: '$2a$10$xxxxxxxxxxxxxxxxxxxxxx' },
    });

  test('rejects unauthenticated requests', async () => {
    ctx = await startApp(mount(seedStore()));
    const res = await request(ctx.baseUrl, 'GET', '/api/admin/data/summary');
    expect(res.status).toBe(401);
  });

  test('GET /api/admin/data/summary reports counts', async () => {
    ctx = await startApp(mount(seedStore()));
    const res = await requestWithHeaders(
      ctx.baseUrl,
      'GET',
      '/api/admin/data/summary',
      undefined,
      { authorization: ADMIN_TOKEN }
    );
    expect(res.status).toBe(200);
    expect(res.body.summary).toMatchObject({
      users: 1,
      totalVisits: 5,
      daysRecorded: 1,
      notifications: 2,
      pendingRequests: 1,
      coursesLocked: 0,
      coursesTotal: 4,
      adminUsername: 'admin',
    });
  });

  test('GET /api/admin/data/export omits admin unless asked', async () => {
    ctx = await startApp(mount(seedStore()));
    const withoutAdmin = await requestWithHeaders(
      ctx.baseUrl,
      'GET',
      '/api/admin/data/export',
      undefined,
      { authorization: ADMIN_TOKEN }
    );
    expect(withoutAdmin.body.backup.data.admin).toBeUndefined();
    expect(withoutAdmin.body.backup.data.users).toHaveLength(1);

    const withAdmin = await requestWithHeaders(
      ctx.baseUrl,
      'GET',
      '/api/admin/data/export?includeAdmin=1',
      undefined,
      { authorization: ADMIN_TOKEN }
    );
    expect(withAdmin.body.backup.data.admin.username).toBe('admin');
    expect(withAdmin.body.backup.counts.admin).toBe(1);
  });

  test('POST import replaces users from an inline backup', async () => {
    const store = seedStore();
    ctx = await startApp(mount(store));
    const res = await requestWithHeaders(
      ctx.baseUrl,
      'POST',
      '/api/admin/data/import',
      { mode: 'replace', dryRun: false, data: { users: [{ nationalNumber: '2', name: 'B' }] } },
      { authorization: ADMIN_TOKEN }
    );
    expect(res.status).toBe(200);
    expect(res.body.applied[0]).toMatchObject({ entity: 'users', action: 'replace', total: 1 });
    const written = await store.users.read();
    expect(written).toEqual([{ nationalNumber: '2', name: 'B' }]);
  });

  test('POST import merges users by national number', async () => {
    const store = seedStore();
    ctx = await startApp(mount(store));
    const res = await requestWithHeaders(
      ctx.baseUrl,
      'POST',
      '/api/admin/data/import',
      {
        mode: 'merge',
        data: { users: [{ nationalNumber: '1', name: 'A2' }, { nationalNumber: '3', name: 'C' }] },
      },
      { authorization: ADMIN_TOKEN }
    );
    expect(res.status).toBe(200);
    expect(res.body.applied[0]).toMatchObject({ entity: 'users', action: 'merge', added: 1, updated: 1 });
    const written = await store.users.read();
    expect(written).toHaveLength(2);
    expect(written.find((u) => u.nationalNumber === '1').name).toBe('A2');
  });

  test('POST import dry-run does not write', async () => {
    const store = seedStore();
    ctx = await startApp(mount(store));
    const res = await requestWithHeaders(
      ctx.baseUrl,
      'POST',
      '/api/admin/data/import',
      { dryRun: true, data: { users: [{ nationalNumber: '9', name: 'Z' }] } },
      { authorization: ADMIN_TOKEN }
    );
    expect(res.status).toBe(200);
    expect(res.body.dryRun).toBe(true);
    const written = await store.users.read();
    expect(written).toHaveLength(1);
    expect(written[0].nationalNumber).toBe('1');
  });

  test('POST import rejects an empty upload', async () => {
    ctx = await startApp(mount(seedStore()));
    const res = await requestWithHeaders(
      ctx.baseUrl,
      'POST',
      '/api/admin/data/import',
      { mode: 'replace' },
      { authorization: ADMIN_TOKEN }
    );
    expect(res.status).toBe(400);
  });

  test('POST import reports an invalid payload', async () => {
    ctx = await startApp(mount(seedStore()));
    const res = await requestWithHeaders(
      ctx.baseUrl,
      'POST',
      '/api/admin/data/import',
      { data: { users: [{ name: 'no number' }] } },
      { authorization: ADMIN_TOKEN }
    );
    expect(res.status).toBe(400);
    expect(res.body.validationErrors.join(' ')).toMatch(/nationalNumber/);
  });
});
