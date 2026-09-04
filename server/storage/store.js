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
 */

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
 * @param {object} deps.local  local adapter {read(name), write(name, data)}
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
  return store;
}

module.exports = { createStore };
