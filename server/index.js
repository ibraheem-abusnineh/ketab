/**
 * Compatibility entry point (ADR-0001 seam).
 *
 * The real runtime entry is server/composer.js (see its header). This
 * shim exists so any deployment configuration still targeting
 * `server/index.js` (apprunner.yaml, EC2 systemd units, old PM2
 * configs) keeps working regardless of which name they invoke —
 * defense in depth against deployment-timeout rot, the exact failure
 * mode that pinned production to a stale revision in Sep 2026.
 */
const composer = require('./composer');

// composer.js guards its startup with `require.main === module`, which
// is false when reached through this shim. Detect here whether THIS
// file was the process entry (its require.main is this module itself,
// by definition of `node index.js`), and if so, start the server.
if (require.main === module) {
  composer.startServer();
}

module.exports = composer;
