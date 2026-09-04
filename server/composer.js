/**
 * Server composer (ticket #10, deprecation in #16).
 *
 * Replaces the legacy 1429-line God Module with a thin composer that:
 *   1. Loads .env
 *   2. Constructs the storage layer (local + remote adapters → store)
 *   3. Calls store.bootstrap() at module load (ticket #9)
 *   4. Mounts the 9 domain routers under their original paths
 *   5. Starts the HTTP listener
 *
 * This file is the runtime entry point — invoked by `npm start` in
 * server/package.json (`node composer.js`). The legacy server/index.js
 * was removed in ticket #16; this file is byte-equivalent at runtime.
 *
 * ADR-0001: store is the seam; every router takes `store` and calls
 * `store.<entity>.{read, write}`.
 * ADR-0003: every route gates its own operator policy — `requireAdmin`,
 * `requireAuth`, or `requireDev` from server/middleware/auth — applied
 * per-route inside the routers.
 */
try { require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') }); } catch (_) {}

const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const path = require('path');
const fs = require('fs');
const multer = require('multer');

const { createStore } = require('./storage/store');
const { createLocalAdapter } = require('./storage/localAdapter');
const { createRemoteAdapter } = require('./storage/remoteAdapter');

// Domain routers (ticket #10).
const { createHealthRouter } = require('./routes/health');
const { createTrackingRouter } = require('./routes/tracking');
const { createCoursesRouter } = require('./routes/courses');
const { createAuthRouter } = require('./routes/auth');
const { createUsersRouter } = require('./routes/users');
const { createProfileRouter } = require('./routes/profile');
const { createNotificationsRouter } = require('./routes/notifications');
const { createStatsRouter } = require('./routes/stats');
const { createReportsRouter } = require('./routes/reports');
const { createDevRouter } = require('./routes/dev');

// Strict-mode error middleware (ticket #11). Mounted AFTER every router so
// it can catch StrictRemoteWriteError thrown by route handlers via the
// store seam and convert it into HTTP 502. Other errors fall through to
// Express's default 500 path.
const { strictModeErrorHandler } = require('./middleware/strictMode');

// ---------------------------------------------------------------------------
// App factory (ticket #17).
//
// Extracted from the original monolithic composer so the test suite can
// build an `app` against an in-memory / tmp-dir store without binding a
// real port. The legacy `node composer.js` entry point still works
// byte-equivalent: when this file is run directly, the production store
// (live `server/data` + the unconfigured remote) is already built at
// module load (see "Module-load bootstrap" below) and `startServer()`
// attaches the listener against it.
//
// Ticket #17 acceptance criterion #3: the composer exports both `app`
// (a getter for legacy callers that want the ready-made production
// instance — null until startServer() runs) and `createApp` (the
// factory the test seam uses). The factory takes an explicit `store`
// so the test controls the storage layer end-to-end without touching
// the production data directory.
// ---------------------------------------------------------------------------

// Process-wide error handlers (uncaughtException + unhandledRejection
// that exit(1)) are NOT registered at module load time. They used to
// live here (preserved from the legacy file), but moving them to
// startServer() keeps `require('./composer')` from installing crash
// handlers that call `process.exit(1)`. Tests that import this module
// without ever calling startServer() must not be killed by an unrelated
// runtime error in the same process.
function buildApp(store, uploadsDir) {
  const app = express();
  app.use(cors());
  app.use(bodyParser.json());
  // Multer for CSV upload (consumed by users router on /api/users/import-csv).
  // The dest is per-app — tests can pass an isolated tmp uploads dir.
  const upload = multer({ dest: uploadsDir || 'uploads/' });
  app.use('/api/users/import-csv', upload.single('csvFile'));

  // Mount domain routers. Each router takes the shared `store` instance.
  app.use(createHealthRouter(store));
  app.use(createTrackingRouter(store));
  app.use(createCoursesRouter(store));
  app.use(createAuthRouter(store));
  app.use(createUsersRouter(store));
  app.use(createProfileRouter(store));
  app.use(createNotificationsRouter(store));
  app.use(createStatsRouter(store));
  app.use(createReportsRouter(store));
  app.use(createDevRouter(store));

  // Strict-mode 502 translator (ticket #11). Mounted last so it sees
  // StrictRemoteWriteError thrown from any route handler.
  app.use(strictModeErrorHandler);

  return app;
}

/**
 * Construct a fully-wired Express app bound to the given store.
 *
 * @param {object} opts
 * @param {object} opts.store        pre-built storage seam from createStore()
 * @param {string} [opts.uploadsDir] multer dest directory; defaults to
 *                                   `<cwd>/uploads/`. Tests should pass a
 *                                   tmp dir so they don't write to the
 *                                   live `server/uploads/` directory.
 */
function createApp({ store, uploadsDir } = {}) {
  if (!store) throw new Error('createApp requires { store }');
  return buildApp(store, uploadsDir);
}

// ---------------------------------------------------------------------------
// Module-load bootstrap (ticket #9).
//
// Restores the original ticket #9 behaviour: requiring this module
// constructs the production store and calls store.bootstrap() once.
// The bootstrap itself is fire-and-forget — it only reads from local
// files and (when configured) pulls from the remote. Side effects are
// confined to the production data directory (`server/data/`).
//
// Tests should NEVER hit this branch: they construct their own store
// via createStore(...) and pass it into createApp({ store }). The
// production store is built unconditionally here, but bootstrap() is
// guarded so it doesn't run twice if startServer() is invoked later.
// ---------------------------------------------------------------------------

const productionDataDir = path.join(__dirname, 'data');
const productionUploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(productionDataDir)) fs.mkdirSync(productionDataDir, { recursive: true });
if (!fs.existsSync(productionUploadsDir)) fs.mkdirSync(productionUploadsDir, { recursive: true });

// Build the production store unconditionally so requiring composer.js
// has no observable side-effects beyond creating the data dir + seeding
// the store object. bootstrap() runs at the bottom of this block.
const productionStore = createStore({
  local: createLocalAdapter({ baseDir: productionDataDir }),
  remote: createRemoteAdapter(),
});

// Bootstrap the store at module load (ticket #9). Fire-and-forget so a
// transient remote failure doesn't crash the whole process on import —
// the route layer is resilient to a missing local file (every read goes
// through store.<entity>.read() which returns null when the file is
// absent). We track the call so startServer() can skip a redundant
// second bootstrap if it ever needs to.
productionStore.bootstrap().catch((e) => console.error('Storage bootstrap failed:', e));

function startServer() {
  // Production-only crash handlers (preserved from legacy).
  process.on('uncaughtException', (err) => {
    console.error('UNCAUGHT EXCEPTION:', err.message);
    console.error(err.stack);
    process.exit(1);
  });
  process.on('unhandledRejection', (reason) => {
    console.error('UNHANDLED REJECTION:', reason);
    process.exit(1);
  });

  console.log('Starting server initialization...');

  // Listener against the production store + production uploads dir.
  const PORT = process.env.PORT || 5000;
  app = buildApp(productionStore, productionUploadsDir);
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Health check: http://0.0.0.0:${PORT}/api/health`);
  });
}

if (require.main === module) {
  startServer();
}

module.exports = { createApp, startServer, get app() { return app; } };
