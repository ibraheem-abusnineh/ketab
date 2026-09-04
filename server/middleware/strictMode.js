/**
 * Strict-mode error middleware (ticket #11).
 *
 * Catches `StrictRemoteWriteError` thrown by `store.<entity>.write(data, {strict: true})`
 * when the remote (GitHub Contents API) write fails. Emits HTTP 502 with
 * a stable JSON body so callers (and automated retries) can detect the
 * failure deterministically.
 *
 * Other errors are forwarded to the next handler — Express will fall
 * through to its default 500 path.
 *
 * Usage (composer wires it after every router):
 *   const { strictModeErrorHandler } = require('./middleware/strictMode');
 *   app.use(strictModeErrorHandler);
 */
const { StrictRemoteWriteError } = require('../storage/remoteAdapter');

function strictModeErrorHandler(err, req, res, next) {
  if (err instanceof StrictRemoteWriteError) {
    // Local writes already succeeded by the time the remote fails; the
    // client should treat this as "your data is in our local cache but
    // we could not confirm with GitHub — retry to be safe".
    return res.status(502).json({
      error: 'Remote write failed',
      code: err.code || 'STRICT_REMOTE_WRITE_FAILED',
    });
  }
  return next(err);
}

module.exports = { strictModeErrorHandler };
