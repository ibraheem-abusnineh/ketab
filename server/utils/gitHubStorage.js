const https = require('https');
const { execSync } = require('child_process');

const GH_TOKEN = process.env.GH_TOKEN;

// Auto-detect owner/repo from git remote
let OWNER_REPO = '';
try {
  const remote = execSync('git remote get-url origin', { encoding: 'utf8', timeout: 5000 }).trim();
  const match = remote.match(/github\.com[:/](.+?)(\.git)?$/);
  if (match) OWNER_REPO = match[1];
} catch (e) {
  // not a git repo or no remote — GitHub persistence unavailable
}

const KEY_MAP = {
  'ketab/visits.json': 'server/data/visits.json',
  'ketab/notifications.json': 'server/data/notifications.json',
  'ketab/users.json': 'server/data/users.json',
};

const shaCache = {};

function isConfigured() {
  return !!GH_TOKEN && !!OWNER_REPO;
}

function githubRequest(method, path, body) {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.github.com',
      path,
      method,
      headers: {
        'User-Agent': 'ketab-server',
        'Authorization': `token ${GH_TOKEN}`,
        'Accept': 'application/vnd.github.v3+json',
      },
    };
    if (body) {
      options.headers['Content-Type'] = 'application/json';
    }
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

async function readJSON(key) {
  if (!isConfigured()) return null;
  const repoPath = KEY_MAP[key];
  if (!repoPath) return null;

  try {
    const [owner, repo] = OWNER_REPO.split('/');
    const result = await githubRequest('GET', `/repos/${owner}/${repo}/contents/${repoPath}`);
    if (!result) return null;
    shaCache[key] = result.sha;
    const content = Buffer.from(result.content, 'base64').toString('utf8');
    return JSON.parse(content);
  } catch (e) {
    console.error('GitHub read error:', e.message);
    return null;
  }
}

async function writeJSON(key, data) {
  if (!isConfigured()) return;
  const repoPath = KEY_MAP[key];
  if (!repoPath) return;

  try {
    const [owner, repo] = OWNER_REPO.split('/');

    // Fetch fresh SHA to avoid stale-cache conflicts
    let sha = shaCache[key];
    if (!sha) {
      const info = await githubRequest('GET', `/repos/${owner}/${repo}/contents/${repoPath}`);
      if (info) sha = info.sha;
    }

    const body = {
      message: 'chore: auto-save runtime data',
      content: Buffer.from(JSON.stringify(data, null, 2)).toString('base64'),
    };
    if (sha) body.sha = sha;

    await githubRequest('PUT', `/repos/${owner}/${repo}/contents/${repoPath}`, body);
    delete shaCache[key];
  } catch (e) {
    console.error('GitHub write error:', e);
  }
}

module.exports = { readJSON, writeJSON, isConfigured };
