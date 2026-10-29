/**
 * Data backup router (gift after the admin rebuild).
 *
 * The runtime data files under `server/data/` are gitignored
 * (visits.json, notifications.json, seeds/) so a fresh clone or a
 * deploy loses them. This router gives the admin desk a first-class
 * backup/restore surface so operators can download everything to their
 * own machine and restore it later without touching the CLI scripts.
 *
 * Four admin-gated routes:
 *   GET  /api/admin/data/summary   — small inventory of the live files
 *   GET  /api/admin/data/export    — one backup JSON (?includeAdmin=1)
 *   POST /api/admin/data/import    — restore from backup JSON or seeds
 *                                    (multipart `files`, `mode`, `dryRun`)
 *
 * The parsing/merge helpers are pure and exported so the test suite can
 * exercise them without an HTTP round-trip.
 *
 * Import accepts:
 *   - a KETAB backup JSON produced by /export
 *   - individual `users.json` / `visits.json` / `notifications.json` /
 *     `courses.json` / `admin.json` files (matched by filename)
 *   - legacy `seeds/*.sql` files (parsed with the same code the
 *     `data-import` CLI uses)
 */
const express = require('express');
const multer = require('multer');
const { requireAdmin } = require('../middleware/auth');
const {
  parseHeader,
  parseSqlInserts,
  buildJson,
} = require('../scripts/data-import');

const ENTITIES = ['users', 'visits', 'notifications', 'courses', 'admin'];
const COURSE_IDS = ['arabic', 'english', 'math', 'awareness'];
const BACKUP_FORMAT = 'ketab-backup';
const BACKUP_VERSION = 1;

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 40 * 1024 * 1024, files: 25 },
});

// ---------------------------------------------------------------------------
// Pure helpers
// ---------------------------------------------------------------------------

function isPlainObject(value) {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}

function normalizeText(value) {
  return typeof value === 'string' ? value : value === undefined || value === null ? '' : String(value);
}

/** Filename → entity, tolerant of "Users (1).json" and "notifications.json". */
function entityFromFilename(filename) {
  const base = String(filename || '')
    .replace(/^.*[\\/]/, '')
    .replace(/\.[^.]+$/, '')
    .toLowerCase()
    .replace(/[^a-z]/g, '');
  if (ENTITIES.includes(base)) return base;
  if (base.includes('user')) return 'users';
  if (base.includes('notif')) return 'notifications';
  if (base.includes('visit')) return 'visits';
  if (base.includes('course')) return 'courses';
  if (base.includes('admin')) return 'admin';
  return null;
}

/** Validate + normalize one entity value. Returns { ok, value, error }. */
function validateEntity(name, value) {
  if (name === 'users') {
    if (!Array.isArray(value)) return { ok: false, error: 'users must be an array' };
    const users = [];
    for (const item of value) {
      if (!isPlainObject(item) || !normalizeText(item.nationalNumber).trim()) {
        return { ok: false, error: 'every user needs a nationalNumber' };
      }
      users.push(item);
    }
    return { ok: true, value: users };
  }

  if (name === 'visits') {
    if (!isPlainObject(value)) return { ok: false, error: 'visits must be an object' };
    const loginHistory = Array.isArray(value.loginHistory) ? value.loginHistory : null;
    if (!loginHistory) return { ok: false, error: 'visits.loginHistory must be an array' };
    let totalVisits = Number(value.totalVisits);
    if (!Number.isFinite(totalVisits) || totalVisits < 0) {
      totalVisits = loginHistory.reduce((sum, row) => {
        const count = Number(row && row.loginCount);
        return sum + (Number.isFinite(count) && count > 0 ? count : 0);
      }, 0);
    }
    return { ok: true, value: { totalVisits, loginHistory } };
  }

  if (name === 'notifications') {
    if (!Array.isArray(value)) return { ok: false, error: 'notifications must be an array' };
    for (const item of value) {
      if (!isPlainObject(item) || !normalizeText(item.id).trim()) {
        return { ok: false, error: 'every notification needs an id' };
      }
    }
    return { ok: true, value };
  }

  if (name === 'courses') {
    if (!isPlainObject(value)) return { ok: false, error: 'courses must be an object' };
    const courses = {};
    for (const id of COURSE_IDS) {
      const entry = value[id];
      if (!isPlainObject(entry)) continue;
      courses[id] = {
        locked: entry.locked === true,
        label: typeof entry.label === 'string' ? entry.label : undefined,
      };
    }
    if (Object.keys(courses).length === 0) {
      return { ok: false, error: 'no recognized course ids found' };
    }
    return { ok: true, value: courses };
  }

  if (name === 'admin') {
    if (!isPlainObject(value)) return { ok: false, error: 'admin must be an object' };
    const username = normalizeText(value.username).trim();
    const passwordHash = normalizeText(value.passwordHash).trim();
    if (!username) return { ok: false, error: 'admin.username is required' };
    if (!/^\$2[aby]\$/.test(passwordHash)) {
      return { ok: false, error: 'admin.passwordHash is not a bcrypt hash (refusing to lock you out)' };
    }
    return { ok: true, value: { username, passwordHash } };
  }

  return { ok: false, error: `unknown entity: ${name}` };
}

/**
 * Parse one uploaded file into { entities, warnings }.
 * Throws only on hard JSON/SQL parse errors.
 */
function parseUploadedFile({ filename, text }) {
  const warnings = [];
  const entities = {};
  const trimmed = String(text || '').trim();
  const lower = String(filename || '').toLowerCase();

  if (lower.endsWith('.sql')) {
    const header = parseHeader(text);
    const entity = header && header.entity;
    if (!entity || !ENTITIES.includes(entity)) {
      warnings.push(`${filename}: could not determine the entity from the SQL header`);
      return { entities, warnings };
    }
    const inserts = parseSqlInserts(text);
    entities[entity] = buildJson(entity, inserts);
    return { entities, warnings };
  }

  if (!trimmed) {
    warnings.push(`${filename}: file is empty`);
    return { entities, warnings };
  }

  let parsed;
  try {
    parsed = JSON.parse(trimmed);
  } catch (err) {
    warnings.push(`${filename}: invalid JSON (${err.message})`);
    return { entities, warnings };
  }

  // A full KETAB backup (or anything shaped like { <entity>: ... }).
  // Accept both the bare backup object and the raw API response
  // ({ success, backup: {...} }).
  const candidates = [];
  if (isPlainObject(parsed)) {
    if (isPlainObject(parsed.data)) candidates.push(parsed.data);
    if (isPlainObject(parsed.backup)) {
      if (isPlainObject(parsed.backup.data)) candidates.push(parsed.backup.data);
      candidates.push(parsed.backup);
    }
    candidates.push(parsed);
  }

  for (const candidate of candidates) {
    const matched = ENTITIES.filter((name) => candidate[name] !== undefined);
    if (matched.length === 0) continue;
    const recognized = matched.filter((name) => {
      const value = candidate[name];
      if (name === 'users' || name === 'notifications') return Array.isArray(value);
      return isPlainObject(value);
    });
    if (recognized.length !== matched.length) continue;
    recognized.forEach((name) => {
      entities[name] = candidate[name];
    });
    return { entities, warnings };
  }

  // A single-entity file (users.json, visits.json, ...).
  const entity = entityFromFilename(filename);
  if (entity) {
    entities[entity] = parsed;
    return { entities, warnings };
  }

  warnings.push(`${filename}: could not recognize this file as a KETAB backup or data file`);
  return { entities, warnings };
}

function mergeByKey(existing, incoming, key) {
  const out = Array.isArray(existing) ? [...existing] : [];
  const index = new Map(out.map((item, i) => [normalizeText(item && item[key]), i]));
  let added = 0;
  let updated = 0;
  for (const item of incoming) {
    const k = normalizeText(item && item[key]);
    if (index.has(k)) {
      out[index.get(k)] = item;
      updated += 1;
    } else {
      index.set(k, out.length);
      out.push(item);
      added += 1;
    }
  }
  return { value: out, added, updated };
}

// ---------------------------------------------------------------------------
// Router
// ---------------------------------------------------------------------------

function createDataRouter(store) {
  const router = express.Router();

  router.get('/api/admin/data/summary', requireAdmin, async (req, res) => {
    try {
      const [users, visits, notifications, courses, admin] = await Promise.all([
        store.users.read(),
        store.visits.read(),
        store.notifications.read(),
        store.courses.read(),
        store.admin.read(),
      ]);

      const userList = Array.isArray(users) ? users : [];
      const visitsData = isPlainObject(visits) ? visits : { totalVisits: 0, loginHistory: [] };
      const loginHistory = Array.isArray(visitsData.loginHistory) ? visitsData.loginHistory : [];
      const notificationList = Array.isArray(notifications) ? notifications : [];
      const courseMap = isPlainObject(courses) ? courses : {};
      const days = new Set(loginHistory.map((row) => normalizeText(row && row.date)).filter(Boolean));

      res.json({
        success: true,
        summary: {
          users: userList.length,
          totalVisits: Number(visitsData.totalVisits) || 0,
          daysRecorded: days.size,
          notifications: notificationList.length,
          pendingRequests: notificationList.filter(
            (item) => item && item.type === 'profile_edit_request' && (item.status || 'pending') === 'pending'
          ).length,
          coursesLocked: COURSE_IDS.filter((id) => courseMap[id] && courseMap[id].locked).length,
          coursesTotal: COURSE_IDS.length,
          adminUsername: admin && admin.username ? admin.username : null,
        },
      });
    } catch (error) {
      console.error('Error reading data summary:', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  });

  router.get('/api/admin/data/export', requireAdmin, async (req, res) => {
    try {
      const includeAdmin = req.query.includeAdmin === '1' || req.query.includeAdmin === 'true';
      const [users, visits, notifications, courses, admin] = await Promise.all([
        store.users.read(),
        store.visits.read(),
        store.notifications.read(),
        store.courses.read(),
        store.admin.read(),
      ]);

      const data = {
        users: Array.isArray(users) ? users : [],
        visits: isPlainObject(visits) ? visits : { totalVisits: 0, loginHistory: [] },
        notifications: Array.isArray(notifications) ? notifications : [],
        courses: isPlainObject(courses) ? courses : {},
      };
      if (includeAdmin && admin) data.admin = admin;

      const loginHistory = Array.isArray(data.visits.loginHistory) ? data.visits.loginHistory : [];
      const days = new Set(loginHistory.map((row) => normalizeText(row && row.date)).filter(Boolean));

      res.json({
        success: true,
        backup: {
          format: BACKUP_FORMAT,
          version: BACKUP_VERSION,
          exportedAt: new Date().toISOString(),
          includeAdmin,
          counts: {
            users: data.users.length,
            totalVisits: Number(data.visits.totalVisits) || 0,
            daysRecorded: days.size,
            notifications: data.notifications.length,
            courses: Object.keys(data.courses).length,
            admin: includeAdmin && admin ? 1 : 0,
          },
          data,
        },
      });
    } catch (error) {
      console.error('Error building data export:', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  });

  router.post(
    '/api/admin/data/import',
    requireAdmin,
    upload.array('files', 25),
    async (req, res) => {
      try {
        const files = Array.isArray(req.files) ? req.files : [];
        const mode = req.body && req.body.mode === 'merge' ? 'merge' : 'replace';
        const dryRun = req.body && (req.body.dryRun === 'true' || req.body.dryRun === true);

        if (files.length === 0) {
          // Also accept a single JSON backup body for scripting.
          const body = req.body || {};
          if (isPlainObject(body.data) || isPlainObject(body.entities)) {
            files.push({
              originalname: 'inline.json',
              buffer: Buffer.from(JSON.stringify(body.data || body.entities), 'utf8'),
            });
          }
        }

        if (files.length === 0) {
          return res.status(400).json({ success: false, error: 'No files were uploaded' });
        }

        const collected = {};
        const warnings = [];
        const validationErrors = [];

        for (const file of files) {
          let parsed;
          try {
            parsed = parseUploadedFile({
              filename: file.originalname,
              text: file.buffer.toString('utf8'),
            });
          } catch (err) {
            validationErrors.push(`${file.originalname}: ${err.message}`);
            continue;
          }
          warnings.push(...parsed.warnings);
          for (const [name, value] of Object.entries(parsed.entities)) {
            const check = validateEntity(name, value);
            if (!check.ok) {
              validationErrors.push(`${file.originalname} → ${name}: ${check.error}`);
              continue;
            }
            // Later files win when they carry the same entity.
            collected[name] = check.value;
          }
        }

        if (validationErrors.length > 0 && Object.keys(collected).length === 0) {
          return res.status(400).json({
            success: false,
            error: `Nothing could be imported: ${validationErrors.join('; ')}`,
            validationErrors,
            warnings,
          });
        }

        const applied = [];

        const writeEntity = async (name, value) => {
          const result = await store[name].write(value);
          if (!result || !result.ok) {
            throw new Error(`failed to write ${name}`);
          }
        };

        // users
        if (collected.users !== undefined) {
          if (mode === 'merge') {
            const existing = await store.users.read();
            const merged = mergeByKey(existing, collected.users, 'nationalNumber');
            if (!dryRun) await writeEntity('users', merged.value);
            applied.push({
              entity: 'users',
              action: 'merge',
              added: merged.added,
              updated: merged.updated,
              total: merged.value.length,
            });
          } else {
            if (!dryRun) await writeEntity('users', collected.users);
            applied.push({ entity: 'users', action: 'replace', total: collected.users.length });
          }
        }

        // notifications
        if (collected.notifications !== undefined) {
          if (mode === 'merge') {
            const existing = await store.notifications.read();
            const merged = mergeByKey(existing, collected.notifications, 'id');
            if (!dryRun) await writeEntity('notifications', merged.value);
            applied.push({
              entity: 'notifications',
              action: 'merge',
              added: merged.added,
              updated: merged.updated,
              total: merged.value.length,
            });
          } else {
            if (!dryRun) await writeEntity('notifications', collected.notifications);
            applied.push({
              entity: 'notifications',
              action: 'replace',
              total: collected.notifications.length,
            });
          }
        }

        // visits (replace only)
        if (collected.visits !== undefined) {
          if (!dryRun) await writeEntity('visits', collected.visits);
          applied.push({
            entity: 'visits',
            action: 'replace',
            total: Number(collected.visits.totalVisits) || 0,
            records: Array.isArray(collected.visits.loginHistory) ? collected.visits.loginHistory.length : 0,
          });
          if (mode === 'merge') {
            warnings.push('visits cannot be merged — it was replaced');
          }
        }

        // courses (replace only)
        if (collected.courses !== undefined) {
          if (!dryRun) await writeEntity('courses', collected.courses);
          applied.push({
            entity: 'courses',
            action: 'replace',
            total: Object.keys(collected.courses).length,
          });
        }

        // admin (replace only, opt-in by including admin.json in the upload)
        if (collected.admin !== undefined) {
          if (!dryRun) await writeEntity('admin', collected.admin);
          applied.push({ entity: 'admin', action: 'replace', total: 1 });
        }

        const skipped = ENTITIES.filter((name) => collected[name] === undefined);

        return res.json({
          success: true,
          dryRun,
          mode,
          applied,
          skipped,
          warnings,
          validationErrors,
        });
      } catch (error) {
        console.error('Error importing data:', error);
        return res.status(500).json({ success: false, error: error.message || 'Internal server error' });
      }
    }
  );

  return router;
}

module.exports = {
  createDataRouter,
  ENTITIES,
  validateEntity,
  parseUploadedFile,
  entityFromFilename,
  mergeByKey,
};
