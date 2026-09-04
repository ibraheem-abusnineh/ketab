/**
 * Tests for store.bootstrap() (ticket #9).
 *
 * The boot sync is the single seam the composer calls at process start.
 * It encapsulates the legacy `ensureRuntimeDataFiles` + `syncFromS3` block:
 *   1. ensure visits and notifications have local files with declared defaults
 *   2. if remote is configured, pull remote → local for users/visits/notifications
 *   3. when remote returns null, seed via the store's write (dual-writes
 *      to preserve legacy behaviour for users with no declared default)
 */

const { createStore } = require('../storage/store');
const {
  DEFAULT_VISITS_DATA,
  DEFAULT_NOTIFICATIONS,
} = require('../storage/defaults');

function makeStubAdapters({ remoteConfigured = true, remoteReads = {} } = {}) {
  const local = {
    read: jest.fn(async () => null),
    write: jest.fn(async () => ({ ok: true })),
    ensure: jest.fn(async (name, defaultValue) => {
      const existing = await local.read(name);
      if (existing !== null && existing !== undefined) {
        return { ok: true, created: false };
      }
      const w = await local.write(name, defaultValue);
      return { ok: w.ok, created: !!w.ok, error: w.error };
    }),
  };
  const remote = {
    read: jest.fn(async (name) => {
      if (Object.prototype.hasOwnProperty.call(remoteReads, name)) {
        return remoteReads[name];
      }
      return null;
    }),
    write: jest.fn(async () => ({ ok: true })),
    isConfigured: jest.fn(() => remoteConfigured),
  };
  return { local, remote };
}

describe('store.bootstrap()', () => {
  test('calls local.ensure("visits", defaultVisits) once', async () => {
    const { local, remote } = makeStubAdapters({ remoteConfigured: false });
    const store = createStore({ local, remote });
    await store.bootstrap();
    expect(local.ensure).toHaveBeenCalledWith('visits', DEFAULT_VISITS_DATA);
  });

  test('calls local.ensure("notifications", defaultNotifications) once', async () => {
    const { local, remote } = makeStubAdapters({ remoteConfigured: false });
    const store = createStore({ local, remote });
    await store.bootstrap();
    expect(local.ensure).toHaveBeenCalledWith('notifications', DEFAULT_NOTIFICATIONS);
  });

  test('does NOT call remote adapter for any entity when remote is not configured', async () => {
    const { local, remote } = makeStubAdapters({ remoteConfigured: false });
    const store = createStore({ local, remote });
    await store.bootstrap();
    expect(remote.read).not.toHaveBeenCalled();
    expect(remote.write).not.toHaveBeenCalled();
  });

  test('pulls remote payload to local when remote is configured and returns a value for users', async () => {
    const remoteUsers = [{ nationalNumber: 'X1', name: 'A' }];
    // visits and notifications default to remote→null → seed branch fires
    // (with declared defaults). users returns the payload → pull branch.
    const { local, remote } = makeStubAdapters({
      remoteConfigured: true,
      remoteReads: { users: remoteUsers },
    });
    const store = createStore({ local, remote });
    await store.bootstrap();
    // Filter to only the users-related calls so the assertion is robust
    // against visits/notifications seed-branch calls in the same bootstrap.
    const userWrites = local.write.mock.calls.filter(([name]) => name === 'users');
    expect(userWrites).toEqual([['users', remoteUsers]]);
    expect(remote.read).toHaveBeenCalledWith('users');
    // Visits/notifications seed-branch is also expected.
    expect(local.write).toHaveBeenCalledWith('visits', DEFAULT_VISITS_DATA);
    expect(local.write).toHaveBeenCalledWith('notifications', DEFAULT_NOTIFICATIONS);
  });

  test('seeds remote with local default when remote returns null for visits', async () => {
    const { local, remote } = makeStubAdapters({
      remoteConfigured: true,
      remoteReads: { visits: null },
    });
    const store = createStore({ local, remote });
    await store.bootstrap();
    // Bootstrap uses entity.write() (which dual-writes) so the local file
    // is also rewritten with the default — matching legacy syncFromS3.
    expect(local.write).toHaveBeenCalledWith('visits', DEFAULT_VISITS_DATA);
    expect(remote.write).toHaveBeenCalledWith('visits', DEFAULT_VISITS_DATA);
  });

  test('seeds remote with [] for users when local users.json is absent and remote returns null', async () => {
    const { local, remote } = makeStubAdapters({
      remoteConfigured: true,
      remoteReads: { users: null },
    });
    // local.read returns null by default → user seed should be [].
    const store = createStore({ local, remote });
    await store.bootstrap();
    expect(local.write).toHaveBeenCalledWith('users', []);
    expect(remote.write).toHaveBeenCalledWith('users', []);
  });

  test('does not call remote adapter for courses or admin (only the three remote-synced entities)', async () => {
    const { local, remote } = makeStubAdapters({ remoteConfigured: true });
    const store = createStore({ local, remote });
    await store.bootstrap();
    const names = remote.read.mock.calls.map((c) => c[0]);
    expect(names.sort()).toEqual(['notifications', 'users', 'visits']);
  });

  test('is idempotent — second call also completes successfully', async () => {
    const { local, remote } = makeStubAdapters({ remoteConfigured: false });
    const store = createStore({ local, remote });
    await store.bootstrap();
    await store.bootstrap();
    // Two ensures per entity, two calls total.
    expect(local.ensure).toHaveBeenCalledTimes(4);
  });
});

describe('composer wiring: store.bootstrap() called once at module load', () => {
  // This is the behavioural assertion from ticket #9:
  // the legacy ensureRuntimeDataFiles + syncFromS3 block in server/index.js
  // is replaced with a single store.bootstrap() call. We assert by spying
  // on the store's bootstrap method while requiring the composer.

  test('server/index.js invokes syncStore.bootstrap() exactly once on load', () => {
    jest.resetModules();

    // Note: the composer's app.listen binds to PORT (or 5000 as fallback).
    // The Jest runner is invoked with --forceExit in CI; the open handle
    // is the price of asserting a real module-load side effect.
    const fs = require('fs');
    const path = require('path');
    const os = require('os');
    const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'ketab-bootstrap-wiring-'));

    // Paths are resolved relative to THIS test file
    // (server/__tests__/bootstrap.test.js).
    jest.doMock('../storage/localAdapter', () => {
      const real = jest.requireActual('../storage/localAdapter');
      return {
        createLocalAdapter: ({ baseDir }) => real.createLocalAdapter({ baseDir: tmpRoot }),
      };
    });
    jest.doMock('../storage/remoteAdapter', () => ({
      createRemoteAdapter: () => ({
        read: jest.fn(async () => null),
        write: jest.fn(async () => ({ ok: true })),
        isConfigured: () => false,
      }),
    }));
    jest.doMock('../storage/store', () => {
      const real = jest.requireActual('../storage/store');
      const wrapped = jest.fn((deps) => {
        const s = real.createStore(deps);
        const original = s.bootstrap.bind(s);
        let calls = 0;
        s.bootstrap = () => {
          calls += 1;
          wrapped.bootstrapCalls = calls;
          return original();
        };
        return s;
      });
      wrapped.bootstrapCalls = 0;
      return { createStore: wrapped };
    });
    let bootstrapSeen = 0;
    let serverRef;
    try {
      const storeModule = require('../storage/store');
      const express = require('express');
      // Spy on app.listen to capture the server reference so we can
      // close it before the test ends. Avoids the "Jest did not exit"
      // warning on every test:server run.
      const origListen = express.application.listen;
      express.application.listen = function (...args) {
        const srv = origListen.apply(this, args);
        serverRef = srv;
        return srv;
      };
      require('../index.js');
      express.application.listen = origListen;
      bootstrapSeen = storeModule.createStore.bootstrapCalls || 0;
    } catch (_) {
      // Module-load side effects (port bind, etc.) may surface in the test
      // process; the assertion below only cares about the bootstrap count.
    }

    expect(bootstrapSeen).toBe(1);
    if (serverRef && typeof serverRef.close === 'function') {
      serverRef.close();
    }
    fs.rmSync(tmpRoot, { recursive: true, force: true });
  });
});
