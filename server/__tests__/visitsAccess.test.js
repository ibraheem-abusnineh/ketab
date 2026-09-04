/**
 * visitsAccess seam tests — ticket #8.
 *
 * Verifies:
 *   - readVisitsData() / writeVisitsData() call the store seam
 *     (store.visits.read() / store.visits.write()), satisfying the
 *     "every visits read/write goes through `store.visits.*`" criterion.
 *   - The legacy return shape is preserved:
 *       read → visitsData object {totalVisits, loginHistory} (default
 *               when missing)
 *       write → true on local success, false on local failure.
 *   - Local-failed writes return false; remote-failed writes still return
 *     true (best-effort per ADR-0002 — legacy semantics).
 *   - The default store construction wires the real local adapter against
 *     a temp directory (so we never read the live visits.json).
 *
 * Two test styles (mirroring usersAccess.test.js):
 *   1. Stubbed store via { store } dependency — pure unit tests.
 *   2. Real store + temp local adapter via { storeFactory } dependency —
 *      round-trip and "real adapter" integration tests.
 */

const fs = require('fs');
const path = require('path');
const os = require('os');

const { createStore } = require('../storage/store');
const { createLocalAdapter } = require('../storage/localAdapter');
const { createVisitsAccess, DEFAULT_VISITS_DATA } = require('../storage/visitsAccess');

function makeStubStore() {
  return {
    users: { read: jest.fn(), write: jest.fn() },
    visits: {
      read: jest.fn(async () => ({ totalVisits: 0, loginHistory: [] })),
      write: jest.fn(async () => ({ ok: true, source: 'local' })),
    },
    notifications: { read: jest.fn(), write: jest.fn() },
    courses: { read: jest.fn(), write: jest.fn() },
    admin: { read: jest.fn(), write: jest.fn() },
  };
}

describe('createVisitsAccess — stubbed store', () => {
  test('readVisitsData() calls store.visits.read() and returns its data', async () => {
    const stub = makeStubStore();
    stub.visits.read.mockResolvedValueOnce({ totalVisits: 7, loginHistory: [{ nationalNumber: 'A' }] });
    const { readVisitsData } = createVisitsAccess({ store: stub });

    const out = await readVisitsData();

    expect(stub.visits.read).toHaveBeenCalledTimes(1);
    expect(out).toEqual({ totalVisits: 7, loginHistory: [{ nationalNumber: 'A' }] });
  });

  test('readVisitsData() returns the default when the store returns null (legacy default)', async () => {
    const stub = makeStubStore();
    stub.visits.read.mockResolvedValueOnce(null);
    const { readVisitsData } = createVisitsAccess({ store: stub });

    const out = await readVisitsData();

    expect(out).toEqual(DEFAULT_VISITS_DATA);
  });

  test('readVisitsData() returns the default when the store returns a non-object (corrupt file)', async () => {
    const stub = makeStubStore();
    stub.visits.read.mockResolvedValueOnce('garbage');
    const { readVisitsData } = createVisitsAccess({ store: stub });

    const out = await readVisitsData();

    expect(out).toEqual(DEFAULT_VISITS_DATA);
  });

  test('writeVisitsData(record) calls store.visits.write() with the record', async () => {
    const stub = makeStubStore();
    const record = { totalVisits: 5, loginHistory: [{ nationalNumber: 'B' }] };
    const { writeVisitsData } = createVisitsAccess({ store: stub });

    const ok = await writeVisitsData(record);

    expect(stub.visits.write).toHaveBeenCalledTimes(1);
    expect(stub.visits.write).toHaveBeenCalledWith(record);
    expect(ok).toBe(true);
  });

  test('writeVisitsData() returns false when the local write fails', async () => {
    const stub = makeStubStore();
    stub.visits.write.mockResolvedValueOnce({ ok: false, source: 'none', error: new Error('disk full') });
    const { writeVisitsData } = createVisitsAccess({ store: stub });

    const ok = await writeVisitsData({ totalVisits: 1, loginHistory: [] });

    expect(ok).toBe(false);
  });

  test('writeVisitsData() returns true when the local write succeeds but the remote write fails (best-effort)', async () => {
    const stub = makeStubStore();
    stub.visits.write.mockResolvedValueOnce({
      ok: true,
      source: 'local',
      error: new Error('GH 500'),
    });
    const { writeVisitsData } = createVisitsAccess({ store: stub });

    const ok = await writeVisitsData({ totalVisits: 1, loginHistory: [] });

    expect(ok).toBe(true);
  });
});

describe('createVisitsAccess — real store + temp local adapter', () => {
  let tmpRoot;

  beforeEach(() => {
    tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'ketab-visitsaccess-'));
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

  test('round-trip: writeVisitsData → readVisitsData returns the same record', async () => {
    const { writeVisitsData, readVisitsData } = createVisitsAccess({ storeFactory: realStoreFactory });
    const record = { totalVisits: 12, loginHistory: [{ nationalNumber: 'X', timestamp: 't' }] };

    const ok = await writeVisitsData(record);
    expect(ok).toBe(true);

    const back = await readVisitsData();
    expect(back).toEqual(record);
  });

  test('readVisitsData() returns the default when the local file does not exist', async () => {
    const { readVisitsData } = createVisitsAccess({ storeFactory: realStoreFactory });

    const out = await readVisitsData();

    expect(out).toEqual(DEFAULT_VISITS_DATA);
  });

  test('writeVisitsData() returns false when the local adapter fails', async () => {
    const failLocal = {
      read: async () => null,
      write: async () => ({ ok: false, error: new Error('disk full') }),
    };
    const failStore = createStore({
      local: failLocal,
      remote: { isConfigured: () => false, read: async () => null, write: async () => ({ ok: true }) },
    });
    const { writeVisitsData } = createVisitsAccess({ store: failStore });

    const ok = await writeVisitsData({ totalVisits: 1, loginHistory: [] });

    expect(ok).toBe(false);
  });
});

describe('createVisitsAccess — storeFactory used when store is omitted', () => {
  test('throws when neither store nor storeFactory is provided', () => {
    expect(() => createVisitsAccess({ storeFactory: null })).toThrow(/requires either store or storeFactory/);
  });
});
