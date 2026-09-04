/**
 * Local adapter tests.
 *
 * Tests against a per-test temp directory (isolated, order-independent).
 * The adapter absorbs:
 *  - the atomic write from server/utils/fileStorage.js (writeJSON)
 *  - the courses raw-write path (currently fs.writeFileSync in server/index.js)
 *
 * The contract (ADR-0001, ADR-0002):
 *  - read(name) → null | data
 *  - write(name, data) → {ok: boolean, error?: Error}
 *  - the local file is the source of truth at runtime
 *  - missing file with no default returns null (caller knows to use its own default)
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const { createLocalAdapter } = require('../storage/localAdapter');

let tmpRoot;
beforeEach(() => {
  tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'ketab-local-'));
});

afterEach(() => {
  fs.rmSync(tmpRoot, { recursive: true, force: true });
});

describe('createLocalAdapter', () => {
  test('read returns null when file does not exist', async () => {
    const adapter = createLocalAdapter({ baseDir: tmpRoot });
    expect(await adapter.read('users')).toBeNull();
  });

  test('write then read round-trips an array entity', async () => {
    const adapter = createLocalAdapter({ baseDir: tmpRoot });
    const data = [{ nationalNumber: 'X1', role: 'parent' }];
    const writeResult = await adapter.write('users', data);
    expect(writeResult.ok).toBe(true);
    expect(await adapter.read('users')).toEqual(data);
  });

  test('write then read round-trips an object entity (courses)', async () => {
    const adapter = createLocalAdapter({ baseDir: tmpRoot });
    const data = { arabic: { locked: true, label: 'Arabic' } };
    const result = await adapter.write('courses', data);
    expect(result.ok).toBe(true);
    expect(await adapter.read('courses')).toEqual(data);
  });

  test('write creates the data directory if missing', async () => {
    const nested = path.join(tmpRoot, 'deep', 'nested');
    const adapter = createLocalAdapter({ baseDir: nested });
    await adapter.write('users', [{ x: 1 }]);
    expect(fs.existsSync(path.join(nested, 'users.json'))).toBe(true);
  });

  test('write is atomic: no .tmp file is left behind on success', async () => {
    const adapter = createLocalAdapter({ baseDir: tmpRoot });
    await adapter.write('users', [{ x: 1 }]);
    const stray = fs.readdirSync(tmpRoot).filter((f) => f.endsWith('.tmp'));
    expect(stray).toEqual([]);
  });

  test('write replaces existing file contents', async () => {
    const adapter = createLocalAdapter({ baseDir: tmpRoot });
    await adapter.write('users', [{ x: 1 }]);
    await adapter.write('users', [{ x: 2 }]);
    expect(await adapter.read('users')).toEqual([{ x: 2 }]);
  });

  test('write returns {ok: false, error} when JSON.stringify throws', async () => {
    const adapter = createLocalAdapter({ baseDir: tmpRoot });
    const circular = {};
    circular.self = circular; // JSON.stringify will throw
    const result = await adapter.write('users', circular);
    expect(result.ok).toBe(false);
    expect(result.error).toBeInstanceOf(Error);
  });

  test('read returns null for corrupt JSON', async () => {
    fs.writeFileSync(path.join(tmpRoot, 'users.json'), 'not-json', 'utf8');
    const adapter = createLocalAdapter({ baseDir: tmpRoot });
    expect(await adapter.read('users')).toBeNull();
  });

  test('each entity name maps to <name>.json under the base dir', async () => {
    const adapter = createLocalAdapter({ baseDir: tmpRoot });
    await adapter.write('visits', { totalVisits: 5, loginHistory: [] });
    expect(fs.existsSync(path.join(tmpRoot, 'visits.json'))).toBe(true);
    expect(await adapter.read('visits')).toEqual({ totalVisits: 5, loginHistory: [] });
  });

  test('write accepts {strict: true} without observable effect (local never fails)', async () => {
    const adapter = createLocalAdapter({ baseDir: tmpRoot });
    // strict: true must succeed and behave identically to strict: false.
    const data = [{ nationalNumber: 'STRICT', role: 'parent' }];
    const result = await adapter.write('users', data, { strict: true });
    expect(result.ok).toBe(true);
    expect(await adapter.read('users')).toEqual(data);
  });

  test('write forwards opts.strict as the third argument (smoke for store seam wiring)', async () => {
    const adapter = createLocalAdapter({ baseDir: tmpRoot });
    // Confirm opts is the third arg position by passing extra flags.
    const result = await adapter.write('users', [{ x: 1 }], { strict: true, custom: 'flag' });
    expect(result.ok).toBe(true);
  });
});
