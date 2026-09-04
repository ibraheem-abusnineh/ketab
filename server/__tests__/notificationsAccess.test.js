/**
 * notificationsAccess seam tests — ticket #8.
 *
 * Verifies:
 *   - readNotifications() / writeNotifications(arr) call the store seam
 *     (store.notifications.read() / store.notifications.write()),
 *     satisfying the "every notifications read/write goes through
 *     `store.notifications.*`" criterion.
 *   - The legacy return shape is preserved:
 *       read → array (defaults to [] when missing)
 *       write → true on local success, false on local failure.
 *   - Local-failed writes return false; remote-failed writes still return
 *     true (best-effort per ADR-0002 — legacy semantics).
 *   - The default store construction wires the real local adapter against
 *     a temp directory (so we never read the live notifications.json).
 *
 * Two test styles (mirroring usersAccess.test.js and visitsAccess.test.js):
 *   1. Stubbed store via { store } dependency — pure unit tests.
 *   2. Real store + temp local adapter via { storeFactory } dependency —
 *      round-trip and "real adapter" integration tests.
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

const { createStore } = require('../storage/store');
const { createLocalAdapter } = require('../storage/localAdapter');
const { createNotificationsAccess } = require('../storage/notificationsAccess');

function makeStubStore() {
  return {
    users: { read: jest.fn(), write: jest.fn() },
    visits: { read: jest.fn(), write: jest.fn() },
    notifications: {
      read: jest.fn(async () => []),
      write: jest.fn(async () => ({ ok: true, source: 'local' })),
    },
    courses: { read: jest.fn(), write: jest.fn() },
    admin: { read: jest.fn(), write: jest.fn() },
  };
}

describe('createNotificationsAccess — stubbed store', () => {
  test('readNotifications() calls store.notifications.read() and returns its data', async () => {
    const stub = makeStubStore();
    stub.notifications.read.mockResolvedValueOnce([{ id: 'N1', type: 'profile_update' }]);
    const { readNotifications } = createNotificationsAccess({ store: stub });

    const out = await readNotifications();

    expect(stub.notifications.read).toHaveBeenCalledTimes(1);
    expect(out).toEqual([{ id: 'N1', type: 'profile_update' }]);
  });

  test('readNotifications() returns [] when the store returns null (legacy default)', async () => {
    const stub = makeStubStore();
    stub.notifications.read.mockResolvedValueOnce(null);
    const { readNotifications } = createNotificationsAccess({ store: stub });

    const out = await readNotifications();

    expect(out).toEqual([]);
  });

  test('readNotifications() returns [] when the store returns a non-array (corrupt file)', async () => {
    const stub = makeStubStore();
    stub.notifications.read.mockResolvedValueOnce({ id: 'N1' });
    const { readNotifications } = createNotificationsAccess({ store: stub });

    const out = await readNotifications();

    expect(out).toEqual([]);
  });

  test('writeNotifications(arr) calls store.notifications.write() with the array', async () => {
    const stub = makeStubStore();
    const arr = [{ id: 'N1', type: 'profile_update', read: false }];
    const { writeNotifications } = createNotificationsAccess({ store: stub });

    const ok = await writeNotifications(arr);

    expect(stub.notifications.write).toHaveBeenCalledTimes(1);
    expect(stub.notifications.write).toHaveBeenCalledWith(arr);
    expect(ok).toBe(true);
  });

  test('writeNotifications() returns false when the local write fails', async () => {
    const stub = makeStubStore();
    stub.notifications.write.mockResolvedValueOnce({ ok: false, source: 'none', error: new Error('disk full') });
    const { writeNotifications } = createNotificationsAccess({ store: stub });

    const ok = await writeNotifications([{ id: 'N1' }]);

    expect(ok).toBe(false);
  });

  test('writeNotifications() returns true when the local write succeeds but the remote write fails (best-effort)', async () => {
    const stub = makeStubStore();
    stub.notifications.write.mockResolvedValueOnce({
      ok: true,
      source: 'local',
      error: new Error('GH 500'),
    });
    const { writeNotifications } = createNotificationsAccess({ store: stub });

    const ok = await writeNotifications([{ id: 'N1' }]);

    expect(ok).toBe(true);
  });
});

describe('createNotificationsAccess — real store + temp local adapter', () => {
  let tmpRoot;

  beforeEach(() => {
    tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'ketab-notifsaccess-'));
  });

  afterEach(() => {
    fs.rmSync(tmpRoot, { recursive: true, force: true });
  });

  function realStoreFactory() {
    return createStore({
      local: createLocalAdapter({ baseDir: tmpRoot }),
      // No remote adapter configured; tests only care about local round-trip
      remote: { isConfigured: () => false, read: async () => null, write: async () => ({ ok: true }) },
    });
  }

  test('round-trip: writeNotifications → readNotifications returns the same array', async () => {
    const { writeNotifications, readNotifications } = createNotificationsAccess({ storeFactory: realStoreFactory });
    const arr = [
      { id: 'N1', type: 'profile_update', read: false },
      { id: 'N2', type: 'profile_edit_request', status: 'pending', read: false },
    ];

    const ok = await writeNotifications(arr);
    expect(ok).toBe(true);

    const back = await readNotifications();
    expect(back).toEqual(arr);
  });

  test('readNotifications() returns [] when the local file does not exist', async () => {
    const { readNotifications } = createNotificationsAccess({ storeFactory: realStoreFactory });

    const out = await readNotifications();

    expect(out).toEqual([]);
  });

  test('writeNotifications() returns false when the local adapter fails', async () => {
    const failLocal = {
      read: async () => null,
      write: async () => ({ ok: false, error: new Error('disk full') }),
    };
    const failStore = createStore({
      local: failLocal,
      remote: { isConfigured: () => false, read: async () => null, write: async () => ({ ok: true }) },
    });
    const { writeNotifications } = createNotificationsAccess({ store: failStore });

    const ok = await writeNotifications([{ id: 'N1' }]);

    expect(ok).toBe(false);
  });
});

describe('createNotificationsAccess — storeFactory used when store is omitted', () => {
  test('throws when neither store nor storeFactory is provided', () => {
    expect(() => createNotificationsAccess({ storeFactory: null })).toThrow(/requires either store or storeFactory/);
  });
});
