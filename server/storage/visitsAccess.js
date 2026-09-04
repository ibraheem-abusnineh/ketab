/**
 * Visits access seam — ticket #8, ticket #14.
 *
 * Thin async wrappers around `store.visits.read()` /
 * `store.visits.write(record)` that preserve the legacy
 * `readVisitsData()` / `writeVisitsData(visitsData)` contract shape.
 *
 * - readVisitsData()  → visitsData object ({totalVisits, loginHistory})
 * - writeVisitsData(v, opts?) → boolean (true = local success; remote is
 *                              best-effort and silent per ADR-0002)
 *     opts.strict (ticket #11): when true, the wrapper re-throws
 *     StrictRemoteWriteError on remote failure so the strict-mode
 *     middleware can convert it into HTTP 502. Default behavior
 *     (no opts) is unchanged.
 *
 * Factory style matches `server/storage/usersAccess.js`. Tests build
 * their own with a stub store; the legacy server file calls
 * `createVisitsAccess()` once at module scope and uses the returned
 * {readVisitsData, writeVisitsData} directly.
 *
 * Ticket #14 also adds the per-day aggregate helpers
 * (`findOrCreateDayRecord`, `incrementLoginCount`, `incrementPageViews`,
 * `asiaAmmanDate`) used by the login and page-load writers to maintain
 * `loginHistory` as the per-user, per-day aggregate per ADR-0004. The
 * storage seam signature is unchanged — `writeVisitsData` is shape-agnostic.
 *
 * ADR-0001 (storage seam), ADR-0002 (best-effort error policy), ADR-0004
 * (loginHistory grain).
 */

const path = require('path');
const { createStore } = require('./store');
const { createLocalAdapter } = require('./localAdapter');
const { createRemoteAdapter } = require('./remoteAdapter');

/**
 * Default visits data (ticket #14).
 *
 * `loginHistory` is a per-user, per-day aggregate per ADR-0004. The
 * empty array is the empty day-record list — semantically unchanged
 * from the legacy shape, but the meaning of each element is now
 * `{ nationalNumber, name, school, date, loginCount, pageViews, lastSeenAt }`.
 */
const DEFAULT_VISITS_DATA = { totalVisits: 0, loginHistory: [] };

/**
 * Asia/Amman calendar day for a given instant. Accepts a `Date`
 * instance, an ISO 8601 string, or `undefined` (default: now).
 * Returns `YYYY-MM-DD`. Pure function. Ticket #14.
 */
function asiaAmmanDate(instant) {
  const d = instant === undefined ? new Date() : new Date(instant);
  return d.toLocaleDateString('en-CA', { timeZone: 'Asia/Amman' });
}

/**
 * Find or create the day-record for `(nationalNumber, date)`. Mutates
 * the `visitsData` array only when no matching record exists; returns
 * the existing record if found, or appends and returns a new one.
 *
 * `date` is a calendar day string in `YYYY-MM-DD` form (Asia/Amman
 * per ADR-0004). The caller is responsible for computing it from the
 * `lastSeenAt` instant — `asiaAmmanDate(lastSeenAt)` does the right thing.
 *
 * Ticket #14.
 */
function findOrCreateDayRecord(visitsData, partial) {
  const { nationalNumber, name, school, date } = partial || {};
  if (!visitsData || !Array.isArray(visitsData.loginHistory)) {
    visitsData.loginHistory = [];
  }
  const existing = visitsData.loginHistory.find(
    (r) => r && r.nationalNumber === nationalNumber && r.date === date
  );
  if (existing) return existing;
  const fresh = {
    nationalNumber,
    name: name || '',
    school: school || '',
    date,
    loginCount: 0,
    pageViews: 0,
    lastSeenAt: null,
  };
  visitsData.loginHistory.push(fresh);
  return fresh;
}

/**
 * Find-or-create the day-record for `(nationalNumber, date)` and
 * increment `loginCount`. Updates `lastSeenAt` to `at` (default: now).
 * Returns the day-record. Ticket #14.
 */
function incrementLoginCount(visitsData, partial) {
  const { nationalNumber, name, school, date, at } = partial || {};
  const record = findOrCreateDayRecord(visitsData, { nationalNumber, name, school, date });
  record.loginCount += 1;
  record.lastSeenAt = at || new Date().toISOString();
  return record;
}

/**
 * Find-or-create the day-record for `(nationalNumber, date)` and
 * increment `pageViews`. Updates `lastSeenAt` to `at` (default: now).
 * Returns the day-record. Ticket #14.
 */
function incrementPageViews(visitsData, partial) {
  const { nationalNumber, name, school, date, at } = partial || {};
  const record = findOrCreateDayRecord(visitsData, { nationalNumber, name, school, date });
  record.pageViews += 1;
  record.lastSeenAt = at || new Date().toISOString();
  return record;
}

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
      // Copy the default's array too: spreading `defaultValue` only shallow-
      // copies, so `loginHistory` would be shared across every caller that
      // falls back to the default and any push() would leak into the other
      // callers (observable in tests and before the visits file exists).
      return {
        ...defaultValue,
        loginHistory: Array.isArray(defaultValue.loginHistory)
          ? [...defaultValue.loginHistory]
          : [],
      };
    },

    async writeVisitsData(visitsData, opts = {}) {
      const result = await getStore().visits.write(visitsData, opts);
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

module.exports = {
  createVisitsAccess,
  DEFAULT_VISITS_DATA,
  findOrCreateDayRecord,
  incrementLoginCount,
  incrementPageViews,
  asiaAmmanDate,
};
