/**
 * One-shot SQL -> JSON import for the 5 seed files.
 *
 * Refuses to overwrite an existing non-empty JSON file unless --force is
 * passed. With --dry-run, prints the planned writes without writing.
 *
 * Usage:
 *   node server/scripts/data-import.js [--force] [--dry-run]
 *
 * Exit codes:
 *   0 - all entities imported (or skipped with a notice)
 *   1 - fatal error
 */

'use strict';

const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '..', 'data');
const SEEDS_DIR = path.join(DATA_DIR, 'seeds');

const ENTITIES = ['users', 'visits', 'notifications', 'admin', 'courses'];

function die(msg, code) {
  process.stderr.write('data-import failed: ' + msg + '\n');
  process.exit(code === undefined ? 1 : code);
}

function parseArgs(argv) {
  const opts = { force: false, dryRun: false };
  for (let i = 2; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '--force') opts.force = true;
    else if (a === '--dry-run') opts.dryRun = true;
    else if (a === '-h' || a === '--help') {
      process.stdout.write('Usage: node server/scripts/data-import.js [--force] [--dry-run]\n');
      process.exit(0);
    } else {
      die('unknown argument: ' + a);
    }
  }
  return opts;
}

/**
 * Parse the SQL header to extract the entity and row count.
 * Returns { entity, count } or null if the header is missing.
 */
function parseHeader(sqlText) {
  const lines = sqlText.split('\n');
  let entity = null;
  let count = 0;
  for (const line of lines) {
    const m = line.match(/^-- ketab data seed:\s*(\w+)/);
    if (m) entity = m[1];
    const c = line.match(/^-- rows:\s*(\d+)/);
    if (c) count = parseInt(c[1], 10);
  }
  return entity ? { entity, count } : null;
}

/**
 * Find the VALUES (...) substring of an INSERT statement, handling
 * single-quoted strings (with '' escapes).
 * Returns the inside of the outer parens as a string, or null if no match.
 */
function extractValuesList(stmt) {
  const idx = stmt.indexOf('VALUES (');
  if (idx < 0) return null;
  let i = idx + 'VALUES ('.length;
  let depth = 1;
  let out = '';
  let inStr = false;
  while (i < stmt.length && depth > 0) {
    const ch = stmt[i];
    if (inStr) {
      if (ch === "'" && stmt[i + 1] === "'") {
        out += "''";
        i += 2;
        continue;
      }
      if (ch === "'") {
        inStr = false;
        out += "'";
        i += 1;
        continue;
      }
      out += ch;
      i += 1;
      continue;
    }
    if (ch === "'") {
      inStr = true;
      out += "'";
      i += 1;
      continue;
    }
    if (ch === '(') {
      depth += 1;
      out += ch;
      i += 1;
      continue;
    }
    if (ch === ')') {
      depth -= 1;
      if (depth === 0) {
        i += 1;
        break;
      }
      out += ch;
      i += 1;
      continue;
    }
    out += ch;
    i += 1;
  }
  if (depth !== 0) return null;
  return out;
}

/**
 * Split a values-list string at top-level commas. Commas inside single-quoted
 * strings do NOT split. Backslash-escapes and '' escapes inside strings are
 * preserved.
 */
function splitValuesList(valuesStr) {
  const parts = [];
  let cur = '';
  let inStr = false;
  for (let i = 0; i < valuesStr.length; i += 1) {
    const ch = valuesStr[i];
    if (inStr) {
      if (ch === "'" && valuesStr[i + 1] === "'") {
        cur += "''";
        i += 1;
        continue;
      }
      if (ch === "'") {
        inStr = false;
        cur += "'";
        continue;
      }
      cur += ch;
      continue;
    }
    if (ch === "'") {
      inStr = true;
      cur += "'";
      continue;
    }
    if (ch === ',') {
      parts.push(cur.trim());
      cur = '';
      continue;
    }
    cur += ch;
  }
  if (cur.length > 0) parts.push(cur.trim());
  return parts;
}

/**
 * Decode a single SQL literal into its JS value.
 *   NULL  -> null
 *   TRUE  -> true
 *   FALSE -> false
 *   '...' -> string (handle '' and \\n/\\r/\\t escapes)
 *   bare number -> number
 */
function decodeLiteral(lit) {
  const t = lit.trim();
  if (t === 'NULL') return null;
  if (t === 'TRUE') return true;
  if (t === 'FALSE') return false;
  if (t.charAt(0) === "'" && t.charAt(t.length - 1) === "'" && t.length >= 2) {
    let body = t.slice(1, -1);
    // Unescape SQL '' -> ', \\ -> \, \n/\r/\t -> control char.
    body = body
      .replace(/''/g, "'")
      .replace(/\\\\/g, '\x00BACKSLASH\x00')
      .replace(/\\n/g, '\n')
      .replace(/\\r/g, '\r')
      .replace(/\\t/g, '\t')
      .replace(/\x00BACKSLASH\x00/g, '\\');
    return body;
  }
  if (/^-?\d+(?:\.\d+)?$/.test(t)) {
    return Number(t);
  }
  throw new Error('unrecognized SQL literal: ' + t);
}

/**
 * Parse the SQL file into INSERT statements (one per line).
 * Returns array of { table, cols, row } objects.
 */
function parseSqlInserts(sqlText) {
  const inserts = [];
  for (const rawLine of sqlText.split('\n')) {
    const line = rawLine.trim();
    if (!line) continue;
    if (line.indexOf('--') === 0) continue;
    if (line.toUpperCase().indexOf('INSERT INTO') !== 0) continue;
    if (line.charAt(line.length - 1) !== ';') continue;

    const m = line.match(/^INSERT INTO\s+(\w+)\s*\(([^)]+)\)\s*VALUES\s*\(/i);
    if (!m) throw new Error('could not parse INSERT: ' + line);
    const table = m[1];
    const cols = m[2].split(',').map(function (s) { return s.trim(); }).filter(Boolean);

    const valuesStr = extractValuesList(line);
    if (valuesStr === null) throw new Error('could not extract VALUES from: ' + line);
    const parts = splitValuesList(valuesStr);
    const values = parts.map(decodeLiteral);

    if (cols.length !== values.length) {
      throw new Error('column count mismatch in ' + table + ': ' +
        cols.length + ' cols vs ' + values.length + ' values');
    }

    const row = {};
    cols.forEach(function (c, i) { row[c] = values[i]; });
    inserts.push({ table: table, row: row });
  }
  return inserts;
}

/**
 * Build the JSON object for an entity from its parsed INSERT rows.
 */
function buildJson(entity, inserts) {
  switch (entity) {
    case 'users':
      return inserts.map(function (x) {
        const p = x.row.payload;
        if (typeof p !== 'string') return null;
        return JSON.parse(p);
      }).filter(function (v) { return v !== null; });
    case 'visits': {
      if (inserts.length === 0) return { totalVisits: 0, loginHistory: [] };
      const totalVisits = inserts[0].row.totalVisits;
      const payload = inserts[0].row.payload;
      let loginHistory = [];
      if (typeof payload === 'string' && payload.length > 0) {
        loginHistory = JSON.parse(payload);
      }
      return {
        totalVisits: typeof totalVisits === 'number' ? totalVisits : 0,
        loginHistory: Array.isArray(loginHistory) ? loginHistory : [],
      };
    }
    case 'notifications':
      return inserts
        .map(function (x) {
          const p = x.row.payload;
          if (typeof p !== 'string') return null;
          return JSON.parse(p);
        })
        .filter(function (v) { return v !== null; });
    case 'admin':
      if (inserts.length === 0) return {};
      return Object.assign({}, inserts[0].row);
    case 'courses': {
      const out = {};
      for (const ins of inserts) {
        const row = ins.row;
        const id = row.courseId;
        if (typeof id !== 'string') continue;
        out[id] = {
          locked: row.locked === true || row.locked === 'TRUE',
          label: row.label !== undefined && row.label !== null ? row.label : '',
        };
      }
      return out;
    }
    default:
      throw new Error('unknown entity: ' + entity);
  }
}

function isJsonNonEmpty(filename) {
  const full = path.join(DATA_DIR, filename);
  if (!fs.existsSync(full)) return false;
  const stat = fs.statSync(full);
  if (stat.size === 0) return false;
  const text = fs.readFileSync(full, 'utf8');
  return text.trim().length > 0;
}

function writeJson(entity, jsonValue) {
  const filename = entity + '.json';
  const full = path.join(DATA_DIR, filename);
  const text = JSON.stringify(jsonValue, null, 2);
  fs.writeFileSync(full, text, 'utf8');
}

function main() {
  const opts = parseArgs(process.argv);

  if (!fs.existsSync(SEEDS_DIR)) {
    die('seeds directory not found: ' + SEEDS_DIR);
  }

  for (const entity of ENTITIES) {
    const sqlPath = path.join(SEEDS_DIR, entity + '.sql');
    if (!fs.existsSync(sqlPath)) {
      process.stderr.write('skipping ' + entity + ': seed file not found\n');
      continue;
    }
    const sqlText = fs.readFileSync(sqlPath, 'utf8');
    const header = parseHeader(sqlText);
    const inserts = parseSqlInserts(sqlText);

    for (const ins of inserts) {
      if (ins.table !== entity) {
        die('entity/table mismatch for ' + entity + ': found ' + ins.table);
      }
    }

    const jsonValue = buildJson(entity, inserts);
    const filename = entity + '.json';

    if (isJsonNonEmpty(filename) && !opts.force) {
      process.stderr.write(
        'skipping ' + entity + ': ' + filename +
        ' already exists and is non-empty (use --force to overwrite)\n',
      );
      continue;
    }

    if (opts.dryRun) {
      const size = JSON.stringify(jsonValue).length;
      process.stdout.write(
        '[dry-run] would write ' + filename + ': ' +
        inserts.length + ' INSERT row(s), ~' + size + ' bytes\n',
      );
      continue;
    }

    writeJson(entity, jsonValue);
    process.stdout.write(
      'imported ' + entity + ': ' +
      inserts.length + ' INSERT row(s) -> ' + filename + '\n',
    );
  }

  process.exit(0);
}

if (require.main === module) {
  try {
    main();
  } catch (err) {
    die(err.message);
  }
}

module.exports = {
  parseHeader: parseHeader,
  parseSqlInserts: parseSqlInserts,
  splitValuesList: splitValuesList,
  decodeLiteral: decodeLiteral,
  extractValuesList: extractValuesList,
  buildJson: buildJson,
};