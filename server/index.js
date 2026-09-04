/**
 * Server composer (ticket #10).
 *
 * Replaces the legacy 1429-line God Module with a thin composer that:
 *   1. Loads .env
 *   2. Constructs the storage layer (local + remote adapters → store)
 *   3. Calls store.bootstrap() at module load (ticket #9)
 *   4. Mounts the 9 domain routers under their original paths
 *   5. Starts the HTTP listener
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

// Global error handlers (preserved from legacy).
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

// Ensure required directories exist (preserved from legacy).
const dataDir = path.join(__dirname, 'data');
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

// Storage seam (ADR-0001).
const store = createStore({
  local: createLocalAdapter({ baseDir: dataDir }),
  remote: createRemoteAdapter(),
});

// Bootstrap the store at module load (ticket #9).
store.bootstrap().catch((e) => console.error('Storage bootstrap failed:', e));

// Express app + middleware.
const app = express();
app.use(cors());
app.use(bodyParser.json());
// Multer for CSV upload (consumed by users router on /api/users/import-csv).
const upload = multer({ dest: 'uploads/' });
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

// Listener.
const PORT = process.env.PORT || 5000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Health check: http://0.0.0.0:${PORT}/api/health`);
});
