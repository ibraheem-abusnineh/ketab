/**
 * Storage seam (ADR-0001, ADR-0002).
 *
 * Exposes one read+write method per entity. Hides the dual-write,
 * the seeding, and the boot sync from the route handlers.
 *
 * Write contract:
 *   { ok: boolean, source: 'local' | 'remote' | 'both' | 'none', error?: Error }
 *
 * Read contract:
 *   null | <entity payload>
 *
 * Source precedence (write):
 *   - local fails  → source: 'none', ok: false
 *   - local ok, remote not configured → source: 'local'
 *   - local ok, remote ok → source: 'both'
 *   - local ok, remote failed → source: 'local', error attached (best-effort)
 *
 * readFromRemote() is used by the boot sync (ticket #8) to fetch the
 * canonical GitHub copy of an entity. It is intentionally NOT the default
 * read path — local is the runtime source of truth (ADR-0001).
 *
 * bootstrap() is the single seam the composer calls at process start
 * (ticket #9). It encapsulates the legacy `ensureRuntimeDataFiles` +
 * `syncFromS3` block:
 *   1. ensure local files exist with their declared defaults
 *      (visits and notifications; users is intentionally left absent so
 *      the remote pull can seed an empty list when remote is empty)
 *   2. if remote is configured, pull remote → local for users, visits,
 *      notifications; on null payload from remote, seed remote with the
 *      local default
 */

const {
  DEFAULT_VISITS_DATA,
  DEFAULT_NOTIFICATIONS,
} = require('./defaults');

const REMOTE_BOOT_ENTITIES = ['visits', 'notifications', 'users'];
const DEFAULT_FOR_ENTITY = {
  visits: DEFAULT_VISITS_DATA,
  notifications: DEFAULT_NOTIFICATIONS,
  // users has no declared default; the legacy behaviour lets the file be
  // absent and treats the missing local value as [] when seeding remote.
};

function buildEntity(name, local, remote, opts = {}) {
  const remoteEligible = opts.remoteEligible !== false;
  return {
    async read() {
      return local.read(name);
    },
    async readFromRemote() {
      if (!remoteEligible || !remote || !remote.isConfigured || !remote.isConfigured()) {
        return null;
      }
      try {
        return await remote.read(name);
      } catch (err) {
        console.error(`Remote read failed for ${name}:`, err);
        return null;
      }
    },
    async write(data) {
      const localResult = await local.write(name, data);
      if (!localResult || !localResult.ok) {
        const error = (localResult && localResult.error) || new Error(`local write failed for ${name}`);
        return { ok: false, source: 'none', error };
      }
      if (!remoteEligible || !remote || !remote.isConfigured || !remote.isConfigured()) {
        return { ok: true, source: 'local' };
      }
      try {
        const remoteResult = await remote.write(name, data);
        if (remoteResult && remoteResult.ok) {
          return { ok: true, source: 'both' };
        }
        return {
          ok: true,
          source: 'local',
          error: (remoteResult && remoteResult.error) || new Error('remote write failed'),
        };
      } catch (err) {
        return { ok: true, source: 'local', error: err };
      }
    },
  };
}

/**
 * Construct the store.
 *
 * @param {object} deps
 * @param {object} deps.local  local adapter {read, write, ensure}
 * @param {object} deps.remote remote adapter {read, write, isConfigured}
 */
function createStore({ local, remote }) {
  if (!local) throw new Error('store requires a local adapter');
  if (!remote) throw new Error('store requires a remote adapter');

  // Entity list. courses is local-only (ADR-0001, CourseLock is never
  // remote-synced); the others dual-write to GitHub when configured.
  const entityNames = ['users', 'visits', 'notifications', 'courses', 'admin'];
  const store = {};
  for (const name of entityNames) {
    store[name] = buildEntity(name, local, remote, {
      remoteEligible: name !== 'courses',
    });
  }

  /**
   * Bootstrap the storage layer at process start (ticket #9).
   *
   * - Ensures visits and notifications have local files (with defaults).
   *   users is intentionally NOT pre-seeded: the legacy behaviour lets
   *   users.json be absent until the remote pull seeds it.
   * - If remote is configured, pulls remote → local for users, visits,
   *   notifications. When remote returns null, seeds remote with the
   *   declared default (or `[]` for users when local is absent).
   *
   * Idempotent. Safe to call once at module load.
   */
  async function bootstrap() {
    // 1. Local ensures for visits and notifications.
    await local.ensure('visits', DEFAULT_VISITS_DATA);
    await local.ensure('notifications', DEFAULT_NOTIFICATIONS);

    // 2. Remote pull for each remote-synced entity.
    if (!remote || !remote.isConfigured || !remote.isConfigured()) {
      return;
    }

    for (const name of REMOTE_BOOT_ENTITIES) {
      const entity = store[name];
      let payload = null;
      try {
        payload = await entity.readFromRemote();
      } catch (err) {
        console.error(`Bootstrap remote read failed for ${name}:`, err);
        payload = null;
      }

      if (payload !== null && payload !== undefined) {
        // Pull branch: remote has the canonical copy → write it to local
        // (entity.write dual-writes to local+remote, so remote stays in
        // sync too).
        await entity.write(payload);
        console.log(`Bootstrap: loaded ${name} from remote`);
        continue;
      }

      // Seed branch: remote returned null → seed the entity with its
      // default. Use entity.write() (not a direct remote.write) so the
      // dual-write semantics are preserved: the local file is rewritten
      // with the default AND remote gets the same payload. This matches
      // the legacy syncFromS3 behaviour for users/visits/notifications.
      let seedValue;
      if (name === 'users') {
        seedValue = (await local.read('users')) || [];
      } else {
        seedValue = DEFAULT_FOR_ENTITY[name];
      }
      try {
        await entity.write(seedValue);
        console.log(`Bootstrap: seeded remote with default for ${name}`);
      } catch (err) {
        console.error(`Bootstrap seed failed for ${name}:`, err);
      }
    }
  }

  store.bootstrap = bootstrap;
  return store;
}

module.exports = { createStore };
