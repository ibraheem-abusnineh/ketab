/**
 * Tiny HTTP test helper for router tests (ticket #10).
 *
 * Spins up an Express app on a random port and exposes a request helper
 * that uses Node's built-in `http` module. No supertest dependency —
 * the project's package.json forbids new deps (CONTEXT.md).
 *
 * Usage:
 *   const ctx = await startApp(app);
 *   const res = await request(ctx.baseUrl, 'POST', '/api/foo', { ... });
 *   ctx.server.close();
 */
const http = require('http');

function startApp(app) {
  return new Promise((resolve) => {
    const server = http.createServer(app).listen(0, '127.0.0.1', () => {
      const port = server.address().port;
      resolve({ server, baseUrl: `http://127.0.0.1:${port}` });
    });
  });
}

function request(baseUrl, method, path, body) {
  return new Promise((resolve, reject) => {
    const url = new URL(`${baseUrl}${path}`);
    const opts = {
      method,
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      headers: {},
    };
    let payload = null;
    if (body !== undefined && body !== null) {
      payload = Buffer.from(JSON.stringify(body), 'utf8');
      opts.headers['Content-Type'] = 'application/json';
      opts.headers['Content-Length'] = payload.length;
    }
    const req = http.request(opts, (res) => {
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => {
        const text = Buffer.concat(chunks).toString('utf8');
        let json = null;
        try { json = text ? JSON.parse(text) : null; } catch (_) { /* not json */ }
        resolve({ status: res.statusCode, body: json, text });
      });
    });
    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

/**
 * Same as request() but allows setting custom headers (e.g. Authorization).
 */
function requestWithHeaders(baseUrl, method, path, body, headers = {}) {
  return new Promise((resolve, reject) => {
    const url = new URL(`${baseUrl}${path}`);
    const opts = {
      method,
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      headers: { ...headers },
    };
    let payload = null;
    if (body !== undefined && body !== null) {
      payload = Buffer.from(JSON.stringify(body), 'utf8');
      opts.headers['Content-Type'] = 'application/json';
      opts.headers['Content-Length'] = payload.length;
    }
    const req = http.request(opts, (res) => {
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => {
        const text = Buffer.concat(chunks).toString('utf8');
        let json = null;
        try { json = text ? JSON.parse(text) : null; } catch (_) { /* not json */ }
        resolve({ status: res.statusCode, body: json, text });
      });
    });
    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

/**
 * Stub store factory — provides a stable, in-memory backing for the
 * `store.<entity>.{read, write}` contract. Useful for router tests
 * that exercise reads/writes without touching the filesystem.
 *
 * Each call returns a fresh store; the test owns the returned object's
 * reference, so writes from one router are visible to reads from the
 * same store instance.
 */
function makeStubStore(initial = {}) {
  const state = {
    users: initial.users !== undefined ? JSON.parse(JSON.stringify(initial.users)) : [],
    visits: initial.visits !== undefined ? JSON.parse(JSON.stringify(initial.visits)) : { totalVisits: 0, loginHistory: [] },
    notifications: initial.notifications !== undefined ? JSON.parse(JSON.stringify(initial.notifications)) : [],
    courses: initial.courses !== undefined ? JSON.parse(JSON.stringify(initial.courses)) : null,
    admin: initial.admin !== undefined ? JSON.parse(JSON.stringify(initial.admin)) : null,
  };
  return {
    users: {
      async read() { return state.users; },
      async write(d) { state.users = d; return { ok: true, source: 'local' }; },
    },
    visits: {
      async read() { return state.visits; },
      async write(d) { state.visits = d; return { ok: true, source: 'local' }; },
    },
    notifications: {
      async read() { return state.notifications; },
      async write(d) { state.notifications = d; return { ok: true, source: 'local' }; },
    },
    courses: {
      async read() { return state.courses; },
      async write(d) { state.courses = d; return { ok: true, source: 'local' }; },
    },
    admin: {
      async read() { return state.admin; },
      async write(d) { state.admin = d; return { ok: true, source: 'local' }; },
    },
  };
}

module.exports = { startApp, request, requestWithHeaders, makeStubStore };
