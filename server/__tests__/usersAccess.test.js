/**
 * usersAccess seam tests — ticket #7.
 *
 * Verifies:
 *   - readUsersData() / writeUsersData() call the store seam
 *     (store.users.read() / store.users.write()), satisfying the
 *     "every users read/write goes through `store.users.*`" criterion.
 *   - The legacy return shape is preserved (read → array, write → true|false).
 *   - Local-failed writes return false; remote-failed writes return true
 *     (best-effort per ADR-0002 — the legacy semantics).
 *   - The default store construction wires the real local adapter against
 *     a temp directory (so we never read the live users.json).
 *
 * Two test styles:
 *   1. Stubbed store via { store } dependency — pure unit tests.
 *   2. Real store + temp local adapter via { storeFactory } dependency —
 *      round-trip and "real adapter" integration tests, mirroring
 *      storeInteg.test.js.
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

const { createStore } = require('../storage/store');
const { createLocalAdapter } = require('../storage/localAdapter');
const { createUsersAccess } = require('../storage/usersAccess');

function makeStubStore() {
  return {
    users: {
      read: jest.fn(async () => [{ nationalNumber: 'X1', name: 'Stub User' }]),
      write: jest.fn(async () => ({ ok: true, source: 'local' })),
    },
    visits: { read: jest.fn(), write: jest.fn() },
    notifications: { read: jest.fn(), write: jest.fn() },
    courses: { read: jest.fn(), write: jest.fn() },
    admin: { read: jest.fn(), write: jest.fn() },
  };
}

describe('createUsersAccess — stubbed store', () => {
  test('readUsersData() calls store.users.read() and returns its data', async () => {
    const stub = makeStubStore();
    stub.users.read.mockResolvedValueOnce([{ nationalNumber: 'A' }, { nationalNumber: 'B' }]);
    const { readUsersData } = createUsersAccess({ store: stub });

    const out = await readUsersData();

    expect(stub.users.read).toHaveBeenCalledTimes(1);
    expect(out).toEqual([{ nationalNumber: 'A' }, { nationalNumber: 'B' }]);
  });

  test('readUsersData() returns [] when the store returns null (legacy default)', async () => {
    const stub = makeStubStore();
    stub.users.read.mockResolvedValueOnce(null);
    const { readUsersData } = createUsersAccess({ store: stub });

    const out = await readUsersData();

    expect(out).toEqual([]);
  });

  test('writeUsersData(users) calls store.users.write() with the array', async () => {
    const stub = makeStubStore();
    stub.users.write.mockResolvedValueOnce({ ok: true, source: 'both' });
    const { writeUsersData } = createUsersAccess({ store: stub });

    const users = [{ nationalNumber: 'Z9', name: 'Z Nine' }];
    const ok = await writeUsersData(users);

    expect(stub.users.write).toHaveBeenCalledTimes(1);
    expect(stub.users.write).toHaveBeenCalledWith(users);
    expect(ok).toBe(true);
  });

  test('writeUsersData() returns false when the local write fails', async () => {
    const stub = makeStubStore();
    stub.users.write.mockResolvedValueOnce({
      ok: false,
      source: 'none',
      error: new Error('disk full'),
    });
    const { writeUsersData } = createUsersAccess({ store: stub });

    const ok = await writeUsersData([{ nationalNumber: 'X' }]);

    expect(ok).toBe(false);
  });

  test('writeUsersData() returns true when the local write succeeds but the remote write fails (best-effort)', async () => {
    const stub = makeStubStore();
    stub.users.write.mockResolvedValueOnce({
      ok: true,
      source: 'local',
      error: new Error('GH 500'),
    });
    const { writeUsersData } = createUsersAccess({ store: stub });

    const ok = await writeUsersData([{ nationalNumber: 'X' }]);

    expect(ok).toBe(true);
  });
});

describe('createUsersAccess — real store + temp local adapter', () => {
  let tmpRoot;

  beforeEach(() => {
    tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'ketab-usersaccess-'));
  });

  afterEach(() => {
    fs.rmSync(tmpRoot, { recursive: true, force: true });
  });

  function buildAccess() {
    const local = createLocalAdapter({ baseDir: tmpRoot });
    const remote = {
      read: jest.fn(),
      write: jest.fn(),
      isConfigured: () => false,
    };
    const store = createStore({ local, remote });
    return { access: createUsersAccess({ store }), store };
  }

  test('read after write returns the array we wrote (round-trip via real local adapter)', async () => {
    const { access } = buildAccess();
    const written = [{ nationalNumber: 'A1', name: 'Alpha' }, { nationalNumber: 'B2', name: 'Beta' }];
    const ok = await access.writeUsersData(written);
    expect(ok).toBe(true);

    const back = await access.readUsersData();
    expect(back).toEqual(written);
  });

  test('writeUsersData() return value mirrors store result on real store (source=local when remote not configured)', async () => {
    const { access, store } = buildAccess();
    const result = await store.users.write([{ nationalNumber: 'X' }]);
    expect(result).toEqual({ ok: true, source: 'local' });

    const ok = await access.writeUsersData([{ nationalNumber: 'X' }]);
    expect(ok).toBe(true);
  });

  test('readUsersData() against an empty temp dir returns [] (sanity: we are not reading the live users.json)', async () => {
    const { access } = buildAccess();
    const back = await access.readUsersData();
    expect(back).toEqual([]);
  });
});

describe('createUsersAccess — storeFactory used when store is omitted', () => {
  test('storeFactory is called lazily on first access', () => {
    const factory = jest.fn(() => makeStubStore());
    createUsersAccess({ storeFactory: factory });
    expect(factory).not.toHaveBeenCalled();

    // Trigger lazy init by calling the wrapper.
    const access = createUsersAccess({ storeFactory: factory });
    return access.readUsersData().then(() => {
      expect(factory).toHaveBeenCalledTimes(1);
    });
  });
});
