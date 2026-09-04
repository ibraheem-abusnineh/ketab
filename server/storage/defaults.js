/**
 * Default values for runtime data files (ADR-0001, ticket #9).
 *
 * Lives in the storage layer so the boot sync (`store.bootstrap()`) can
 * reference these defaults without reaching back into the composer.
 *
 * users is intentionally absent: the legacy behaviour lets users.json be
 * an empty array when missing — `bootstrap()` reads the (possibly absent)
 * local file and, if absent, treats the local value as `[]`.
 */
const DEFAULT_VISITS_DATA = { totalVisits: 0, loginHistory: [] };
const DEFAULT_NOTIFICATIONS = [];

module.exports = {
  DEFAULT_VISITS_DATA,
  DEFAULT_NOTIFICATIONS,
};
