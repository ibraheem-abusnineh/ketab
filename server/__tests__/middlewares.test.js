/**
 * Middleware tests.
 *
 * Per CONTEXT.md (Actor) and ADR-0003 (Developer token role):
 *   - requireAuth admits any valid Actor token (admin_ or dev_ prefix,
 *     length ≥ 32)
 *   - requireAdmin admits admin_ tokens AND dev_ tokens (dev is a superset
 *     of admin for the purpose of unblocking stuck admin operations)
 *   - requireDev admits only dev_ tokens
 *
 * A missing Authorization header → 401.
 * An invalid token (wrong prefix or too short) → 401.
 * A valid token → next() with no res.status.
 */

const { requireAuth, requireAdmin, requireDev } = require('../middleware/auth');

function makeReq(token) {
  return { headers: token ? { authorization: token } : {} };
}

function makeRes() {
  const res = {};
  res.status = jest.fn(() => res);
  res.json = jest.fn(() => res);
  return res;
}

describe('requireAuth', () => {
  test('admits a well-formed admin_ token and calls next()', () => {
    const req = makeReq('admin_' + 'a'.repeat(32));
    const res = makeRes();
    const next = jest.fn();
    requireAuth(req, res, next);
    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
  });

  test('admits a well-formed dev_ token and calls next()', () => {
    const req = makeReq('dev_' + 'b'.repeat(32));
    const res = makeRes();
    const next = jest.fn();
    requireAuth(req, res, next);
    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
  });

  test('rejects a missing Authorization header with 401', () => {
    const req = makeReq(null);
    const res = makeRes();
    const next = jest.fn();
    requireAuth(req, res, next);
    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
  });

  test('rejects a token with the wrong prefix', () => {
    const req = makeReq('user_' + 'a'.repeat(32));
    const res = makeRes();
    const next = jest.fn();
    requireAuth(req, res, next);
    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
  });

  test('rejects a too-short admin token', () => {
    const req = makeReq('admin_short');
    const res = makeRes();
    const next = jest.fn();
    requireAuth(req, res, next);
    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
  });
});

describe('requireAdmin', () => {
  test('admits a well-formed admin_ token', () => {
    const req = makeReq('admin_' + 'a'.repeat(32));
    const res = makeRes();
    const next = jest.fn();
    requireAdmin(req, res, next);
    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
  });

  test('admits a dev_ token (developer is a superset of admin, ADR-0003)', () => {
    const req = makeReq('dev_' + 'b'.repeat(32));
    const res = makeRes();
    const next = jest.fn();
    requireAdmin(req, res, next);
    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
  });

  test('rejects a missing Authorization header with 401', () => {
    const req = makeReq(null);
    const res = makeRes();
    const next = jest.fn();
    requireAdmin(req, res, next);
    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
  });

  test('rejects an invalid token with 401', () => {
    const req = makeReq('nope');
    const res = makeRes();
    const next = jest.fn();
    requireAdmin(req, res, next);
    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
  });
});

describe('requireDev', () => {
  test('admits a well-formed dev_ token', () => {
    const req = makeReq('dev_' + 'a'.repeat(32));
    const res = makeRes();
    const next = jest.fn();
    requireDev(req, res, next);
    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
  });

  test('rejects an admin_ token (dev namespace is dev-only)', () => {
    const req = makeReq('admin_' + 'a'.repeat(32));
    const res = makeRes();
    const next = jest.fn();
    requireDev(req, res, next);
    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
  });

  test('rejects a missing Authorization header with 401', () => {
    const req = makeReq(null);
    const res = makeRes();
    const next = jest.fn();
    requireDev(req, res, next);
    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
  });

  test('rejects a too-short dev token with 401', () => {
    const req = makeReq('dev_short');
    const res = makeRes();
    const next = jest.fn();
    requireDev(req, res, next);
    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
  });
});

describe('Authorization header normalization (Bearer prefix)', () => {
  test('requireDev accepts `Authorization: Bearer dev_…` form', () => {
    const req = makeReq('Bearer dev_' + 'a'.repeat(32));
    const res = makeRes();
    const next = jest.fn();
    requireDev(req, res, next);
    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
  });

  test('requireAdmin accepts `Authorization: Bearer admin_…` form', () => {
    const req = makeReq('Bearer admin_' + 'a'.repeat(32));
    const res = makeRes();
    const next = jest.fn();
    requireAdmin(req, res, next);
    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
  });

  test('requireAuth accepts `Authorization: Bearer dev_…` form', () => {
    const req = makeReq('Bearer dev_' + 'b'.repeat(32));
    const res = makeRes();
    const next = jest.fn();
    requireAuth(req, res, next);
    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
  });

  test('requireDev still accepts the bare `Authorization: dev_…` form (backward compat)', () => {
    const req = makeReq('dev_' + 'a'.repeat(32));
    const res = makeRes();
    const next = jest.fn();
    requireDev(req, res, next);
    expect(next).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
  });

  test('requireDev rejects `Bearer nonsense` (bogus token) with 401', () => {
    const req = makeReq('Bearer nonsense');
    const res = makeRes();
    const next = jest.fn();
    requireDev(req, res, next);
    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
  });

  test('requireDev rejects a missing Authorization header with 401 (after normalization)', () => {
    const req = makeReq(null);
    const res = makeRes();
    const next = jest.fn();
    requireDev(req, res, next);
    expect(next).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(401);
  });
});
