/**
 * Round-trip integrity test: export → snapshot → delete → import → diff.
 *
 * Snapshots the original JSON files into /tmp/ketab-roundtrip-orig/ first,
 * then runs the export, deletes the live JSON files, runs the import with
 * --force, and diffs the result against the snapshot.
 *
 * Exits 0 if all 5 entities match byte-for-byte, 1 if any differ.
 *
 * Usage:
 *   node server/scripts/data-roundtrip.js
 */

'use strict';

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const ROOT = path.join(__dirname, '..', '..');
const DATA_DIR = path.join(__dirname, '..', 'data');
const SNAPSHOT_DIR = '/tmp/ketab-roundtrip-orig';

const ENTITIES = ['users', 'visits', 'notifications', 'admin', 'courses'];

function rmrf(p) {
  if (!fs.existsSync(p)) return;
  fs.rmSync(p, { recursive: true, force: true });
}

function ensureDir(p) {
  if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
}

function snapshot() {
  rmrf(SNAPSHOT_DIR);
  ensureDir(SNAPSHOT_DIR);
  for (const e of ENTITIES) {
    const src = path.join(DATA_DIR, `${e}.json`);
    if (fs.existsSync(src)) {
      const dst = path.join(SNAPSHOT_DIR, `${e}.json`);
      fs.copyFileSync(src, dst);
    }
  }
}

function runScript(scriptName, args) {
  execFileSync('node', [path.join(__dirname, scriptName), ...args], {
    stdio: 'inherit',
    cwd: ROOT,
  });
}

function diffEntity(entity) {
  const live = path.join(DATA_DIR, `${entity}.json`);
  const snap = path.join(SNAPSHOT_DIR, `${entity}.json`);
  if (!fs.existsSync(snap)) {
    return { ok: false, reason: 'snapshot missing' };
  }
  if (!fs.existsSync(live)) {
    return { ok: false, reason: 'live file missing after import' };
  }
  const a = fs.readFileSync(snap);
  const b = fs.readFileSync(live);
  if (a.length !== b.length || !a.equals(b)) {
    return { ok: false, reason: 'byte mismatch' };
  }
  return { ok: true };
}

function main() {
  let failed = 0;
  try {
    process.stdout.write('roundtrip: snapshotting originals → ' + SNAPSHOT_DIR + '\n');
    snapshot();

    process.stdout.write('roundtrip: exporting\n');
    runScript('data-export.js', []);

    process.stdout.write('roundtrip: deleting live JSON files\n');
    for (const e of ENTITIES) {
      const p = path.join(DATA_DIR, `${e}.json`);
      if (fs.existsSync(p)) fs.unlinkSync(p);
    }

    process.stdout.write('roundtrip: importing (with --force)\n');
    runScript('data-import.js', ['--force']);

    process.stdout.write('roundtrip: diffing\n');
    for (const e of ENTITIES) {
      const r = diffEntity(e);
      if (r.ok) {
        process.stdout.write(`  ${e}: PASS\n`);
      } else {
        process.stdout.write(`  ${e}: FAIL (${r.reason})\n`);
        failed += 1;
      }
    }

    if (failed === 0) {
      process.stdout.write('roundtrip: ALL PASS\n');
      process.exit(0);
    } else {
      process.stdout.write(`roundtrip: ${failed} FAILED\n`);
      process.exit(1);
    }
  } catch (err) {
    process.stderr.write(`roundtrip: FATAL — ${err.message}\n`);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}