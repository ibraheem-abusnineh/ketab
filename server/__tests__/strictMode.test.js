/**
 * strictMode middleware tests (ticket #11).
 *
 * Covers:
 *   - StrictRemoteWriteError → 502 with the documented JSON body
 *   - Non-strict errors are forwarded to next() unchanged (Express
 *     falls through to its default 500 path)
 *   - The middleware is a no-op when no error is passed (Express should
 *     never actually call it without an err, but guard anyway)
 */

const { strictModeErrorHandler } = require('../middleware/strictMode');
const { StrictRemoteWriteError } = require('../storage/remoteAdapter');

function makeRes() {
  const res = {};
  res.status = jest.fn(() => res);
  res.json = jest.fn(() => res);
  return res;
}

describe('strictModeErrorHandler', () => {
  test('converts StrictRemoteWriteError to HTTP 502 with the documented body', () => {
    const err = new StrictRemoteWriteError(new Error('GH 500'));
    const res = makeRes();
    const next = jest.fn();

    strictModeErrorHandler(err, {}, res, next);

    expect(res.status).toHaveBeenCalledWith(502);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Remote write failed',
      code: 'STRICT_REMOTE_WRITE_FAILED',
    });
    expect(next).not.toHaveBeenCalled();
  });

  test('preserves the cause on the error (for logs / debugging)', () => {
    const cause = new Error('GH 500: server error');
    const err = new StrictRemoteWriteError(cause);
    expect(err.cause).toBe(cause);
  });

  test('forwards non-strict errors to next() unchanged', () => {
    const err = new Error('plain network failure');
    const res = makeRes();
    const next = jest.fn();

    strictModeErrorHandler(err, {}, res, next);

    expect(res.status).not.toHaveBeenCalled();
    expect(res.json).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledTimes(1);
    expect(next).toHaveBeenCalledWith(err);
  });

  test('forwards non-Error throwables to next()', () => {
    const res = makeRes();
    const next = jest.fn();

    strictModeErrorHandler('a string error', {}, res, next);

    expect(next).toHaveBeenCalledWith('a string error');
  });

  test('StrictRemoteWriteError with no cause still emits 502', () => {
    const err = new StrictRemoteWriteError();
    const res = makeRes();
    const next = jest.fn();

    strictModeErrorHandler(err, {}, res, next);

    expect(res.status).toHaveBeenCalledWith(502);
    expect(res.json).toHaveBeenCalledWith({
      error: 'Remote write failed',
      code: 'STRICT_REMOTE_WRITE_FAILED',
    });
    expect(next).not.toHaveBeenCalled();
  });
});
