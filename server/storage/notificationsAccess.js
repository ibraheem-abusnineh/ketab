/**
 * Notifications access seam — ticket #8.
 *
 * Thin async wrappers around `store.notifications.read()` /
 * `store.notifications.write(arr)` that preserve the legacy
 * `readNotifications()` / `writeNotifications(notifications)` contract
 * shape.
 *
 * - readNotifications() → array (defaults to [] when missing)
 * - writeNotifications(arr) → boolean (true = local success; remote is
 *                              best-effort and silent per ADR-0002)
 *
 * Default value semantics: the legacy `readJSON(path, [])` returns [] when
 * the file is missing. The store returns null in that case, so the wrapper
 * coerces null → []. This keeps the internal helpers
 * `createNotification` and `createProfileEditRequest` (which call
 * readNotifications / writeNotifications and push to the array) unchanged.
 *
 * Factory style matches `server/storage/usersAccess.js` and
 * `visitsAccess.js`. Tests build their own with a stub store; the legacy
 * server file calls `createNotificationsAccess()` once at module scope
 * and uses the returned {readNotifications, writeNotifications} directly.
 *
 * ADR-0001 (storage seam) and ADR-0002 (best-effort error policy).
 */

const path = require('path');
const { createStore } = require('./store');
const { createLocalAdapter } = require('./localAdapter');
const { createRemoteAdapter } = require('./remoteAdapter');

const DEFAULT_NOTIFICATIONS = [];

function defaultStore() {
  const baseDir = path.join(__dirname, '..', 'data');
  const local = createLocalAdapter({ baseDir });
  const remote = createRemoteAdapter();
  return createStore({ local, remote });
}

function createNotificationsAccess({ store: providedStore, storeFactory = defaultStore, defaultValue = DEFAULT_NOTIFICATIONS } = {}) {
  if (!providedStore && !storeFactory) {
    throw new Error('createNotificationsAccess requires either store or storeFactory');
  }
  let store = providedStore || null;

  function getStore() {
    if (!store) store = storeFactory();
    return store;
  }

  return {
    async readNotifications() {
      const data = await getStore().notifications.read();
      return Array.isArray(data) ? data : [];
    },

    async writeNotifications(notifications) {
      const result = await getStore().notifications.write(notifications);
      if (!result || !result.ok) {
        if (result && result.error) {
          console.error('Notifications store write failed:', result.error);
        }
        return false;
      }
      if (result.error) {
        // Remote write failed but local succeeded — log it, return true
        // (best-effort per ADR-0002; matches legacy behavior).
        console.error('GitHub write error (notifications):', result.error);
      }
      return true;
    },
  };
}

module.exports = { createNotificationsAccess, DEFAULT_NOTIFICATIONS };
