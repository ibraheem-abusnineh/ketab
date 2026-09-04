/**
 * Visits access seam — ticket #8.
 *
 * Thin async wrappers around `store.visits.read()` /
 * `store.visits.write(record)` that preserve the legacy
 * `readVisitsData()` / `writeVisitsData(visitsData)` contract shape.
 *
 * - readVisitsData()  → visitsData object ({totalVisits, loginHistory})
 * - writeVisitsData(v) → boolean (true = local success; remote is
 *                        best-effort and silent per ADR-0002)
 *
 * Default value semantics: the legacy `readJSON(path, DEFAULT_VISITS_DATA)`
 * returns the default when the file is missing. The store returns null in
 * that case, so the wrapper coerces null → DEFAULT_VISITS_DATA. This keeps
 * route handlers (e.g. /api/track-visit, /api/login/guest) unchanged.
 *
 * loginHistory shape (per-login events array) is unchanged — that migration
 * lives in #14 (per-day aggregate). This wrapper is opaque over the array.
 *
 * Factory style matches `server/storage/usersAccess.js`. Tests build
 * their own with a stub store; the legacy server file calls
 * `createVisitsAccess()` once at module scope and uses the returned
 * {readVisitsData, writeVisitsData} directly.
 *
 * ADR-0001 (storage seam) and ADR-0002 (best-effort error policy).
 */

const path = require('path');
const { createStore } = require('./store');
const { createLocalAdapter } = require('./localAdapter');
const { createRemoteAdapter } = require('./remoteAdapter');

const DEFAULT_VISITS_DATA = { totalVisits: 0, loginHistory: [] };

function defaultStore() {
  const baseDir = path.join(__dirname, '..', 'data');
  const local = createLocalAdapter({ baseDir });
  const remote = createRemoteAdapter();
  return createStore({ local, remote });
}

function createVisitsAccess({ store: providedStore, storeFactory = defaultStore, defaultValue = DEFAULT_VISITS_DATA } = {}) {
  if (!providedStore && !storeFactory) {
    throw new Error('createVisitsAccess requires either store or storeFactory');
  }
  let store = providedStore || null;

  function getStore() {
    if (!store) store = storeFactory();
    return store;
  }

  return {
    async readVisitsData() {
      const data = await getStore().visits.read();
      if (data && typeof data === 'object' && !Array.isArray(data)) {
        return data;
      }
      return { ...defaultValue };
    },

    async writeVisitsData(visitsData) {
      const result = await getStore().visits.write(visitsData);
      if (!result || !result.ok) {
        if (result && result.error) {
          console.error('Visits store write failed:', result.error);
        }
        return false;
      }
      if (result.error) {
        // Remote write failed but local succeeded — log it, return true
        // (best-effort per ADR-0002; matches legacy behavior).
        console.error('GitHub write error (visits):', result.error);
      }
      return true;
    },
  };
}

module.exports = { createVisitsAccess, DEFAULT_VISITS_DATA };
