/**
 * Default values for runtime data files (ADR-0001, ticket #9, ticket #14).
 *
 * Lives in the storage layer so the boot sync (`store.bootstrap()`) can
 * reference these defaults without reaching back into the composer.
 *
 * users is intentionally absent: the legacy behaviour lets users.json be
 * an empty array when missing — `bootstrap()` reads the (possibly absent)
 * local file and, if absent, treats the local value as `[]`.
 *
 * `DEFAULT_VISITS_DATA` (ADR-0004): the empty `loginHistory` is now the
 * empty day-record list per `(nationalNumber, date)`. See
 * `server/storage/visitsAccess.js` for the canonical helper functions.
 */
const DEFAULT_VISITS_DATA = { totalVisits: 0, loginHistory: [] };
const DEFAULT_NOTIFICATIONS = [];

module.exports = {
  DEFAULT_VISITS_DATA,
  DEFAULT_NOTIFICATIONS,
};
