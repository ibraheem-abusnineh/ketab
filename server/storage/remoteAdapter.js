/**
 * Remote adapter for the storage seam.
 *
 * Talks to the GitHub Contents API. The local file is the source of truth
 * at runtime; the remote write is best-effort (ADR-0002).
 *
 * This module is the rename target for `server/utils/s3Storage.js` (a
 * misleading name — the remote is GitHub, not S3). The rename is its own
 * ticket; for now the public surface is preserved: read(name) / write(name)
 * and isConfigured().
 *
 * Injectable dependencies (request, env, detectOwnerRepo) make the adapter
 * unit-testable without touching the network or the host environment.
 */

const KEY_MAP = {
  visits: 'server/data/visits.json',
  notifications: 'server/data/notifications.json',
  users: 'server/data/users.json',
  // courses is local-only per ADR-0001 (CourseLock never remote-synced).
};

function detectOwnerRepoFromGit() {
  try {
    // Lazy require so the adapter does not pull child_process when injected.
    const { execSync } = require('child_process');
    const remote = execSync('git remote get-url origin', { encoding: 'utf8', timeout: 5000 }).trim();
    const match = remote.match(/github\.com[:/](.+?)(\.git)?$/);
    return match ? match[1] : '';
  } catch (e) {
    return '';
  }
}

function defaultRequest(method, urlPath, body, env) {
  // eslint-disable-next-line global-require
  const https = require('https');
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.github.com',
      path: urlPath,
      method,
      headers: {
        'User-Agent': 'ketab-server',
        Authorization: `token ${env.GH_TOKEN}`,
        Accept: 'application/vnd.github.v3+json',
      },
    };
    if (body) options.headers['Content-Type'] = 'application/json';
    const req = https.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(data ? JSON.parse(data) : null);
        } else if (res.statusCode === 404) {
          resolve(null);
        } else {
          const err = new Error(`GitHub API ${res.statusCode}: ${data.slice(0, 200)}`);
          err.statusCode = res.statusCode;
          reject(err);
        }
      });
    });
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

function createRemoteAdapter(deps = {}) {
  const env = deps.env || process.env;
  const request = deps.request || ((method, path, body) => defaultRequest(method, path, body, env));
  const detectOwnerRepo = deps.detectOwnerRepo || detectOwnerRepoFromGit;
  const ownerRepo = env.OWNER_REPO || detectOwnerRepo();

  function isConfigured() {
    return !!env.GH_TOKEN && !!ownerRepo;
  }

  async function read(name) {
    if (!isConfigured()) return null;
    const repoPath = KEY_MAP[name];
    if (!repoPath) return null;
    try {
      const [owner, repo] = ownerRepo.split('/');
      const result = await request('GET', `/repos/${owner}/${repo}/contents/${repoPath}`);
      if (!result) return null;
      const content = Buffer.from(result.content, 'base64').toString('utf8');
      return JSON.parse(content);
    } catch (e) {
      console.error('GitHub read error:', e.message);
      return null;
    }
  }

  async function write(name, data) {
    if (!isConfigured()) return { ok: true };
    const repoPath = KEY_MAP[name];
    if (!repoPath) return { ok: true };

    try {
      const [owner, repo] = ownerRepo.split('/');
      const body = {
        message: 'chore: auto-save runtime data',
        content: Buffer.from(JSON.stringify(data, null, 2)).toString('base64'),
      };
      await request('PUT', `/repos/${owner}/${repo}/contents/${repoPath}`, body);
      return { ok: true };
    } catch (e) {
      console.error('GitHub write error:', e.message);
      return { ok: false, error: e };
    }
  }

  return { read, write, isConfigured };
}

module.exports = { createRemoteAdapter };
