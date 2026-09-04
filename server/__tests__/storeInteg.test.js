/**
 * Integration: real local adapter + stubbed remote adapter, wired through
 * the real store. Verifies the seam composes end-to-end without touching
 * the legacy server file or GitHub.
 */

const fs = require('fs');
const path = require('path');
const os = require('os');
const { createStore } = require('../storage/store');
const { createLocalAdapter } = require('../storage/localAdapter');

let tmpRoot;
beforeEach(() => {
  tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'ketab-integ-'));
});
afterEach(() => {
  fs.rmSync(tmpRoot, { recursive: true, force: true });
});

describe('store + local adapter integration', () => {
  test('a real local write is observable on the next read', async () => {
    const local = createLocalAdapter({ baseDir: tmpRoot });
    const remote = { read: jest.fn(), write: jest.fn(), isConfigured: () => false };
    const store = createStore({ local, remote });

    const result = await store.users.write([{ nationalNumber: 'X1' }]);
    expect(result.ok).toBe(true);

    expect(await store.users.read()).toEqual([{ nationalNumber: 'X1' }]);
  });

  test('visits write round-trips through the real local file', async () => {
    const local = createLocalAdapter({ baseDir: tmpRoot });
    const remote = { read: jest.fn(), write: jest.fn(), isConfigured: () => false };
    const store = createStore({ local, remote });

    await store.visits.write({ totalVisits: 7, loginHistory: [{ nationalNumber: 'X1' }] });
    const read = await store.visits.read();
    expect(read.totalVisits).toBe(7);
    expect(read.loginHistory).toHaveLength(1);
  });

  test('remote write is attempted with the same data when configured', async () => {
    const local = createLocalAdapter({ baseDir: tmpRoot });
    const remoteWrite = jest.fn(async () => ({ ok: true }));
    const remote = { read: jest.fn(), write: remoteWrite, isConfigured: () => true };
    const store = createStore({ local, remote });

    const result = await store.users.write([{ nationalNumber: 'X1' }]);
    expect(result).toEqual({ ok: true, source: 'both' });
    expect(remoteWrite).toHaveBeenCalledWith('users', [{ nationalNumber: 'X1' }]);
  });

  test('remote write failure still leaves the local file written', async () => {
    const local = createLocalAdapter({ baseDir: tmpRoot });
    const remoteWrite = jest.fn(async () => ({ ok: false, error: new Error('GH 500') }));
    const remote = { read: jest.fn(), write: remoteWrite, isConfigured: () => true };
    const store = createStore({ local, remote });

    const result = await store.users.write([{ nationalNumber: 'X1' }]);
    expect(result.ok).toBe(true);
    expect(result.source).toBe('local');
    expect(result.error).toBeInstanceOf(Error);
    expect(await store.users.read()).toEqual([{ nationalNumber: 'X1' }]);
  });

  test('courses is local-only (no remote write even when configured)', async () => {
    const local = createLocalAdapter({ baseDir: tmpRoot });
    const remoteWrite = jest.fn(async () => ({ ok: true }));
    const remote = { read: jest.fn(), write: remoteWrite, isConfigured: () => true };
    const store = createStore({ local, remote });

    const result = await store.courses.write({ arabic: { locked: true } });
    expect(result.ok).toBe(true);
    expect(remoteWrite).not.toHaveBeenCalled();
    expect(await store.courses.read()).toEqual({ arabic: { locked: true } });
  });
});
