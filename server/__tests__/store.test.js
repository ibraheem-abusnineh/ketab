/**
 * Store skeleton tests.
 *
 * The store is a thin facade over two adapters (local + remote).
 * These tests stub both adapters and assert the seam's contract:
 *  - one read+write method per entity
 *  - writes return {ok, source, error?}
 *  - reads return null or data
 *  - source is derived from which adapters succeeded
 */

const { createStore } = require('../storage/store');

function makeStubAdapters(overrides = {}) {
  const local = {
    read: jest.fn(async () => null),
    write: jest.fn(async () => ({ ok: true })),
    ...(overrides.local || {}),
  };
  const remote = {
    read: jest.fn(async () => null),
    write: jest.fn(async () => ({ ok: true })),
    isConfigured: jest.fn(() => true),
    ...(overrides.remote || {}),
  };
  return { local, remote };
}

describe('createStore', () => {
  test('exposes one read+write pair per entity', () => {
    const store = createStore({ local: {}, remote: { isConfigured: () => false } });
    expect(typeof store.users.read).toBe('function');
    expect(typeof store.users.write).toBe('function');
    expect(typeof store.visits.read).toBe('function');
    expect(typeof store.visits.write).toBe('function');
    expect(typeof store.notifications.read).toBe('function');
    expect(typeof store.notifications.write).toBe('function');
    expect(typeof store.courses.read).toBe('function');
    expect(typeof store.courses.write).toBe('function');
    expect(typeof store.admin.read).toBe('function');
    expect(typeof store.admin.write).toBe('function');
  });

  test('users.read returns whatever the local adapter returns', async () => {
    const { local, remote } = makeStubAdapters({ local: { read: jest.fn(async () => [{ nationalNumber: 'X1' }]) } });
    const store = createStore({ local, remote });
    const out = await store.users.read();
    expect(out).toEqual([{ nationalNumber: 'X1' }]);
    expect(local.read).toHaveBeenCalledWith('users');
    expect(remote.read).not.toHaveBeenCalled();
  });

  test('users.read returns null when local returns null', async () => {
    const { local, remote } = makeStubAdapters({ local: { read: jest.fn(async () => null) } });
    const store = createStore({ local, remote });
    expect(await store.users.read()).toBeNull();
  });

  test('notifications.write returns {ok, source: "local"} when only local succeeds', async () => {
    const { local, remote } = makeStubAdapters();
    remote.write.mockResolvedValue({ ok: false, error: new Error('GH 500') });
    const store = createStore({ local, remote });
    const result = await store.notifications.write([{ id: 1 }]);
    expect(result.ok).toBe(true);
    expect(result.source).toBe('local');
    expect(local.write).toHaveBeenCalledWith('notifications', [{ id: 1 }], {});
    expect(remote.write).toHaveBeenCalledWith('notifications', [{ id: 1 }], {});
  });

  test('users.write returns {ok, source: "both"} when both adapters succeed', async () => {
    const { local, remote } = makeStubAdapters();
    const store = createStore({ local, remote });
    const result = await store.users.write([{ nationalNumber: 'X1' }]);
    expect(result).toEqual({ ok: true, source: 'both' });
  });

  test('visits.write returns {ok: false, source: "none"} when local fails', async () => {
    const { local, remote } = makeStubAdapters();
    local.write.mockResolvedValue({ ok: false, error: new Error('disk full') });
    const store = createStore({ local, remote });
    const result = await store.visits.write({ totalVisits: 1, loginHistory: [] });
    expect(result.ok).toBe(false);
    expect(result.source).toBe('none');
    expect(result.error).toBeInstanceOf(Error);
  });

  test('admin.write returns {ok, source: "local"} when remote is not configured', async () => {
    const { local, remote } = makeStubAdapters({ remote: { isConfigured: () => false } });
    const store = createStore({ local, remote });
    const result = await store.admin.write({ username: 'a' });
    expect(result).toEqual({ ok: true, source: 'local' });
    expect(remote.write).not.toHaveBeenCalled();
  });

  test('courses.write returns the same shape (object write)', async () => {
    const { local, remote } = makeStubAdapters();
    const store = createStore({ local, remote });
    const result = await store.courses.write({ arabic: { locked: true } });
    expect(result.ok).toBe(true);
    expect(['local', 'both']).toContain(result.source);
    expect(local.write).toHaveBeenCalledWith('courses', { arabic: { locked: true } }, {});
  });

  test('does not call remote write when remote is not configured', async () => {
    const { local, remote } = makeStubAdapters({ remote: { isConfigured: () => false } });
    const store = createStore({ local, remote });
    await store.users.write([]);
    expect(remote.write).not.toHaveBeenCalled();
  });

  test('strict write forwards {strict: true} to local and remote adapters', async () => {
    const { local, remote } = makeStubAdapters();
    const store = createStore({ local, remote });
    await store.users.write([{ nationalNumber: 'X1' }], { strict: true });
    expect(local.write).toHaveBeenCalledWith('users', [{ nationalNumber: 'X1' }], { strict: true });
    expect(remote.write).toHaveBeenCalledWith('users', [{ nationalNumber: 'X1' }], { strict: true });
  });

  test('strict write re-throws StrictRemoteWriteError when remote fails', async () => {
    const { local, remote } = makeStubAdapters();
    const { StrictRemoteWriteError } = require('../storage/remoteAdapter');
    remote.write.mockRejectedValue(new StrictRemoteWriteError(new Error('GH 500')));
    const store = createStore({ local, remote });
    await expect(store.users.write([{ x: 1 }], { strict: true }))
      .rejects.toBeInstanceOf(StrictRemoteWriteError);
  });

  test('strict write still returns best-effort {ok: true, source: "local"} when local succeeds and remote throws a non-strict error', async () => {
    // Sanity: strict only re-throws the typed StrictRemoteWriteError. Any
    // other thrown error (e.g. a raw network throw without the typed
    // wrapper) keeps the legacy best-effort behavior.
    const { local, remote } = makeStubAdapters();
    remote.write.mockRejectedValue(new Error('ECONNRESET (raw)'));
    const store = createStore({ local, remote });
    const result = await store.users.write([{ x: 1 }], { strict: true });
    expect(result.ok).toBe(true);
    expect(result.source).toBe('local');
    expect(result.error).toBeInstanceOf(Error);
  });
});
