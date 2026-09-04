/**
 * Local file-system adapter for the storage seam.
 *
 * Absorbs the atomic-write logic from server/utils/fileStorage.js and the
 * courses raw-write path (previously `fs.writeFileSync` in server/index.js).
 *
 * The local file is the source of truth at runtime (ADR-0001).
 *
 * Contract:
 *   - read(name) → null | parsed data
 *   - write(name, data, opts?) → {ok: boolean, error?: Error}
 *       opts.strict is accepted for symmetry with the remote adapter and
 *       the store seam (ticket #11) but has no observable effect on the
 *       local path — local writes are synchronous and never fail under
 *       strict mode. The flag is forwarded so the store can pass a single
 *       options bag to both adapters.
 *   - ensure(name, defaultValue) → {ok: boolean, created: boolean, error?: Error}
 *       Writes defaultValue to <name>.json only when the file is absent.
 *       Used by the boot sync (ticket #9) to seed local copies of remote-synced
 *       entities before the remote pull.
 */

const fs = require('fs');
const path = require('path');

function createLocalAdapter({ baseDir }) {
  if (!baseDir) throw new Error('createLocalAdapter requires baseDir');

  function fileFor(name) {
    return path.join(baseDir, `${name}.json`);
  }

  return {
    async read(name) {
      const filePath = fileFor(name);
      if (!fs.existsSync(filePath)) return null;
      try {
        const data = fs.readFileSync(filePath, 'utf8');
        return JSON.parse(data);
      } catch (error) {
        console.error(`Error reading from ${filePath}:`, error);
        return null;
      }
    },

    async write(name, data, opts = {}) {
      // opts.strict is accepted but has no effect on the local path —
      // see the contract docblock above.
      void opts;
      const filePath = fileFor(name);
      const tempPath = `${filePath}.tmp`;
      try {
        const dir = path.dirname(filePath);
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }
        fs.writeFileSync(tempPath, JSON.stringify(data, null, 2), 'utf8');
        fs.renameSync(tempPath, filePath);
        return { ok: true };
      } catch (error) {
        if (fs.existsSync(tempPath)) {
          try { fs.unlinkSync(tempPath); } catch (e) { /* ignore */ }
        }
        return { ok: false, error };
      }
    },

    async ensure(name, defaultValue) {
      const filePath = fileFor(name);
      if (fs.existsSync(filePath)) {
        return { ok: true, created: false };
      }
      const result = await this.write(name, defaultValue);
      return { ok: !!result && result.ok, created: !!(result && result.ok), error: result && result.error };
    },
  };
}

module.exports = { createLocalAdapter };
