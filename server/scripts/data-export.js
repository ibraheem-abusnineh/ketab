/**
 * One-shot JSON → SQL export for the 5 live data files.
 *
 * The exported SQL files live in `server/data/seeds/` (gitignored).
 * They are local-only artifacts — copy them out of the repo before
 * pushing and back in after re-cloning.
 *
 * Usage:
 *   node server/scripts/data-export.js
 *
 * Exit codes:
 *   0 — all entities exported (or skipped with a notice)
 *   1 — fatal error
 */

'use strict';

const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');
const SEEDS_DIR = path.join(DATA_DIR, 'seeds');

// Column order per entity. Must match the import script's parsing logic.
// users/visits/notifications have heterogeneous row shapes (e.g. some users
// omit school/directorate; visits rows have two different shapes; etc.) so
// we store the whole row as JSON in a single `payload` column. admin and
// courses are uniform so they use fixed columns.
const SCHEMA = {
  users: ['payload'],
  visits: ['totalVisits', 'payload'],
  notifications: ['payload'],
  admin: ['username', 'passwordHash'],
  courses: ['courseId', 'locked', 'label'],
};

function readJsonOrNull(filename) {
  const full = path.join(DATA_DIR, filename);
  if (!fs.existsSync(full)) return null;
  const text = fs.readFileSync(full, 'utf8');
  if (!text.trim()) return null;
  try {
    return JSON.parse(text);
  } catch (err) {
    throw new Error(`failed to parse ${filename}: ${err.message}`);
  }
}
function sqlString(v) {
  if (v === null || v === undefined) return 'NULL';
  if (typeof v === 'number' && Number.isFinite(v)) return String(v);
  if (typeof v === 'boolean') return v ? 'TRUE' : 'FALSE';
  // Strings: backslashes escaped first, single quotes doubled,
  // and CR/LF/TAB replaced with two-char escape sequences so the
  // resulting literal stays on one line.
  const escaped = String(v)
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "''")
    .replace(/\r/g, '\\r')
    .replace(/\n/g, '\\n')
    .replace(/\t/g, '\\t');
  return `'${escaped}'`;
}
function header(entity, count, sourceName) {
  const ts = new Date().toISOString();
  return [
    `-- ketab data seed: ${entity}`,
    `-- generated: ${ts}`,
    `-- source: server/data/${sourceName}`,
    `-- rows: ${count}`,
    '',
  ].join('\n');
}

function rowsForUsers(rows) {
  return rows.map((r) => {
    const payload = JSON.stringify(r);
    return `INSERT INTO users (payload) VALUES (${sqlString(payload)});`;
  });
}

function rowsForVisits(data) {
  // visits.json = { totalVisits, loginHistory: [...] }
  const totalVisits = data && typeof data.totalVisits === 'number' ? data.totalVisits : 0;
  const loginHistory = (data && Array.isArray(data.loginHistory)) ? data.loginHistory : [];
  const payload = JSON.stringify(loginHistory);
  return [
    `INSERT INTO visits (totalVisits, payload) VALUES (${totalVisits}, ${sqlString(payload)});`,
  ];
}

function rowsForNotifications(rows) {
  return rows.map((r) => {
    const payload = JSON.stringify(r);
    return `INSERT INTO notifications (payload) VALUES (${sqlString(payload)});`;
  });
}

function rowsForAdmin(data) {
  if (!data || typeof data !== 'object') return [];
  const u = data.username !== undefined ? data.username : '';
  const p = data.passwordHash !== undefined ? data.passwordHash : '';
  return [
    `INSERT INTO admin (username, passwordHash) VALUES (${sqlString(u)}, ${sqlString(p)});`,
  ];
}

function rowsForCourses(data) {
  if (!data || typeof data !== 'object') return [];
  const out = [];
  for (const courseId of Object.keys(data)) {
    const entry = data[courseId] || {};
    const locked = entry.locked === true ? 'TRUE' : 'FALSE';
    const label = entry.label !== undefined ? entry.label : '';
    out.push(
      `INSERT INTO courses (courseId, locked, label) VALUES (${sqlString(courseId)}, ${locked}, ${sqlString(label)});`,
    );
  }
  return out;
}

function buildEntity(entity, data) {
  let sqlLines = [];
  let count = 0;
  switch (entity) {
    case 'users':
      if (Array.isArray(data)) {
        sqlLines = rowsForUsers(data);
        count = data.length;
      }
      break;
    case 'visits':
      sqlLines = rowsForVisits(data);
      count = 1; // single wrapper row
      break;
    case 'notifications':
      if (Array.isArray(data)) {
        sqlLines = rowsForNotifications(data);
        count = data.length;
      }
      break;
    case 'admin':
      sqlLines = rowsForAdmin(data);
      count = sqlLines.length;
      break;
    case 'courses':
      sqlLines = rowsForCourses(data);
      count = sqlLines.length;
      break;
    default:
      throw new Error(`unknown entity: ${entity}`);
  }
  return { sqlLines, count };
}

function main() {
  try {
    if (!fs.existsSync(SEEDS_DIR)) {
      fs.mkdirSync(SEEDS_DIR, { recursive: true });
    }

    const entities = ['users', 'visits', 'notifications', 'admin', 'courses'];
    for (const entity of entities) {
      const sourceName = `${entity}.json`;
      const data = readJsonOrNull(sourceName);
      if (data === null) {
        process.stderr.write(`skipping ${entity}: file not found\n`);
        // Write an empty seed file so import doesn't complain later.
        const headerOnly = header(entity, 0, sourceName);
        fs.writeFileSync(path.join(SEEDS_DIR, `${entity}.sql`), headerOnly, 'utf8');
        continue;
      }

      const { sqlLines, count } = buildEntity(entity, data);
      const out = header(entity, count, sourceName);
      const body = sqlLines.length > 0 ? sqlLines.join('\n') + '\n' : '';
      fs.writeFileSync(
        path.join(SEEDS_DIR, `${entity}.sql`),
        out + body,
        'utf8',
      );
      process.stdout.write(`exported ${entity}: ${count} row(s) → seeds/${entity}.sql\n`);
    }

    process.exit(0);
  } catch (err) {
    process.stderr.write(`data-export failed: ${err.message}\n`);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = {
  SCHEMA,
  sqlString,
  readJsonOrNull,
  buildEntity,
  rowsForUsers,
  rowsForVisits,
  rowsForNotifications,
  rowsForAdmin,
  rowsForCourses,
};