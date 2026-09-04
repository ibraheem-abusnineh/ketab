/**
 * Operator middlewares (ADR-0003, CONTEXT.md: Actor).
 *
 * Three operator middlewares:
 *
 *   requireAuth  — admits any valid Actor token (admin_ or dev_, length ≥ 32)
 *   requireAdmin — admits admin_ tokens AND dev_ tokens (dev is a superset
 *                  of admin for unblocking stuck admin operations)
 *   requireDev   — admits only dev_ tokens (the dev namespace)
 *
 * The token contract stays the same: a prefix and a length. No signing,
 * no expiry, no DB lookup (the auth-hardening ticket is separate).
 *
 * All three return HTTP 401 with a JSON body on rejection.
 */

const ADMIN_PREFIX = 'admin_';
const DEV_PREFIX = 'dev_';
const MIN_LENGTH = 32;

function hasPrefix(token, prefix) {
  return typeof token === 'string' && token.length >= MIN_LENGTH && token.startsWith(prefix);
}

function isAdminToken(token) { return hasPrefix(token, ADMIN_PREFIX); }
function isDevToken(token) { return hasPrefix(token, DEV_PREFIX); }
function isValidActor(token) { return isAdminToken(token) || isDevToken(token); }

function deny(res) {
  return res.status(401).json({ success: false, error: 'Unauthorized: Invalid token' });
}

/**
 * Extract the actor token from an Authorization header.
 *
 * Accepts both industry-standard form (`Authorization: Bearer <token>`)
 * and the legacy raw form (`Authorization: <token>`). Strips surrounding
 * whitespace and the `Bearer ` scheme prefix when present; returns the
 * raw header value otherwise. Returns null when no header is set.
 */
function extractToken(req) {
  const header = req.headers && req.headers.authorization;
  if (!header) return null;
  const trimmed = header.trim();
  if (trimmed.startsWith('Bearer ')) return trimmed.slice(7).trim();
  return trimmed;
}

function requireAuth(req, res, next) {
  const token = extractToken(req);
  if (!isValidActor(token)) {
    return deny(res);
  }
  return next();
}

function requireAdmin(req, res, next) {
  const token = extractToken(req);
  // Dev is a superset of admin (ADR-0003).
  if (isAdminToken(token) || isDevToken(token)) {
    return next();
  }
  return deny(res);
}

function requireDev(req, res, next) {
  const token = extractToken(req);
  if (isDevToken(token)) {
    return next();
  }
  return deny(res);
}

module.exports = { requireAuth, requireAdmin, requireDev };
