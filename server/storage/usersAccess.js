/**
 * Users access seam — ticket #7.
 *
 * Thin async wrappers around `store.users.read()` / `store.users.write()`
 * that preserve the legacy `readUsersData()` / `writeUsersData()` contract
 * shape (read returns the data or []; write returns true/false). Migrating
 * the route handlers to call the store directly would have rippled `await`
 * into 10 sync handlers; keeping the wrappers concentrates the async seam
 * at one place, satisfies the "every users read/write goes through
 * `store.users.{read,write}`" acceptance criterion (#7), and is testable
 * in isolation.
 *
 * Factory style matches `server/storage/store.js` / `localAdapter.js`:
 * callers pass `{ store }` (and optionally `{ defaultStore: () => store }`).
 * The legacy server file calls `createUsersAccess()` once at module scope
 * and uses the returned `{readUsersData, writeUsersData}` directly; tests
 * build their own with a stub store.
 *
 * Write contract preserved from the legacy `writeUsersData`:
 *   - local success + remote success → true, source 'both'
 *   - local success + remote failure (best-effort) → true, error logged
 *   - local failure → false
 *
 * ADR-0001 (storage seam) and ADR-0002 (best-effort error policy).
 */

const path = require('path');
const { createStore } = require('./store');
const { createLocalAdapter } = require('./localAdapter');
const { createRemoteAdapter } = require('./remoteAdapter');

function defaultStore() {
  const baseDir = path.join(__dirname, '..', 'data');
  const local = createLocalAdapter({ baseDir });
  const remote = createRemoteAdapter();
  return createStore({ local, remote });
}

function createUsersAccess({ store: providedStore, storeFactory = defaultStore } = {}) {
  if (!providedStore && !storeFactory) {
    throw new Error('createUsersAccess requires either store or storeFactory');
  }
  let store = providedStore || null;

  function getStore() {
    if (!store) store = storeFactory();
    return store;
  }

  return {
    async readUsersData() {
      const data = await getStore().users.read();
      return Array.isArray(data) ? data : [];
    },

    async writeUsersData(users) {
      const result = await getStore().users.write(users);
      if (!result || !result.ok) {
        if (result && result.error) {
          console.error('Users store write failed:', result.error);
        }
        return false;
      }
      if (result.error) {
        // Remote write failed but local succeeded — log it, return true
        // (best-effort per ADR-0002; today's behavior is identical).
        console.error('GitHub write error (users):', result.error);
      }
      return true;
    },
  };
}

module.exports = { createUsersAccess };
