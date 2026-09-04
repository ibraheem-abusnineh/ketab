/**
 * Remote adapter tests (stubbed network).
 *
 * The remote adapter talks to the GitHub Contents API. We stub the network
 * layer (githubRequest) to verify the contract:
 *   - read(name) → null | parsed JSON payload
 *   - write(name, data) → {ok: boolean, error?: Error}
 *   - isConfigured() returns true iff GH_TOKEN and OWNER_REPO both resolve
 *   - entity names that are not in the key map return null on read,
 *     and a no-op ({ok: true}) on write (mirroring the current behavior)
 */

const { createRemoteAdapter } = require('../storage/remoteAdapter');

function makeRequestStub(responses) {
  const calls = [];
  let i = 0;
  return {
    calls,
    fn: async (method, urlPath, body) => {
      calls.push({ method, urlPath, body });
      const r = responses[i++] || { ok: true, status: 200, payload: null };
      if (r.throw) throw r.throw;
      if (r.status === 404) return null;
      if (r.status >= 400) {
        const err = new Error(`GitHub API ${r.status}: ${r.payload || ''}`);
        err.statusCode = r.status;
        throw err;
      }
      return r.payload;
    },
  };
}

describe('createRemoteAdapter', () => {
  test('isConfigured is false when GH_TOKEN is missing', () => {
    const adapter = createRemoteAdapter({
      env: { GH_TOKEN: '', OWNER_REPO: 'o/r' },
      request: async () => null,
      detectOwnerRepo: () => 'o/r',
    });
    expect(adapter.isConfigured()).toBe(false);
  });

  test('isConfigured is false when OWNER_REPO cannot be detected', () => {
    const adapter = createRemoteAdapter({
      env: { GH_TOKEN: 'ghp_x', OWNER_REPO: '' },
      request: async () => null,
      detectOwnerRepo: () => '',
    });
    expect(adapter.isConfigured()).toBe(false);
  });

  test('isConfigured is true when both are present', () => {
    const adapter = createRemoteAdapter({
      env: { GH_TOKEN: 'ghp_x', OWNER_REPO: 'o/r' },
      request: async () => null,
      detectOwnerRepo: () => 'o/r',
    });
    expect(adapter.isConfigured()).toBe(true);
  });

  test('read returns null when remote returns 404', async () => {
    const request = makeRequestStub([{ status: 404 }]);
    const adapter = createRemoteAdapter({
      env: { GH_TOKEN: 'ghp_x', OWNER_REPO: 'o/r' },
      request: request.fn,
      detectOwnerRepo: () => 'o/r',
    });
    expect(await adapter.read('users')).toBeNull();
  });

  test('read decodes base64 content and parses JSON', async () => {
    const content = Buffer.from(JSON.stringify([{ nationalNumber: 'X1' }])).toString('base64');
    const request = makeRequestStub([{ status: 200, payload: { content, sha: 'abc' } }]);
    const adapter = createRemoteAdapter({
      env: { GH_TOKEN: 'ghp_x', OWNER_REPO: 'o/r' },
      request: request.fn,
      detectOwnerRepo: () => 'o/r',
    });
    expect(await adapter.read('users')).toEqual([{ nationalNumber: 'X1' }]);
    expect(request.calls[0].method).toBe('GET');
    expect(request.calls[0].urlPath).toBe('/repos/o/r/contents/server/data/users.json');
  });

  test('read returns null on network error (does not throw)', async () => {
    const request = makeRequestStub([{ throw: new Error('ECONNRESET') }]);
    const adapter = createRemoteAdapter({
      env: { GH_TOKEN: 'ghp_x', OWNER_REPO: 'o/r' },
      request: request.fn,
      detectOwnerRepo: () => 'o/r',
    });
    expect(await adapter.read('users')).toBeNull();
  });

  test('write uses PUT with base64-encoded content', async () => {
    const request = makeRequestStub([{ status: 200, payload: { sha: 'new' } }]);
    const adapter = createRemoteAdapter({
      env: { GH_TOKEN: 'ghp_x', OWNER_REPO: 'o/r' },
      request: request.fn,
      detectOwnerRepo: () => 'o/r',
    });
    const result = await adapter.write('users', [{ nationalNumber: 'X1' }]);
    expect(result.ok).toBe(true);
    expect(request.calls[0].method).toBe('PUT');
    expect(request.calls[0].urlPath).toBe('/repos/o/r/contents/server/data/users.json');
    const expected = Buffer.from(JSON.stringify([{ nationalNumber: 'X1' }], null, 2)).toString('base64');
    expect(request.calls[0].body.content).toBe(expected);
    expect(request.calls[0].body.message).toBeTruthy();
  });

  test('write returns {ok: false, error} when remote returns 5xx', async () => {
    const request = makeRequestStub([{ status: 500, payload: 'boom' }]);
    const adapter = createRemoteAdapter({
      env: { GH_TOKEN: 'ghp_x', OWNER_REPO: 'o/r' },
      request: request.fn,
      detectOwnerRepo: () => 'o/r',
    });
    const result = await adapter.write('users', [{ x: 1 }]);
    expect(result.ok).toBe(false);
    expect(result.error).toBeInstanceOf(Error);
  });

  test('write returns {ok: false, error} on network error', async () => {
    const request = makeRequestStub([{ throw: new Error('ECONNRESET') }]);
    const adapter = createRemoteAdapter({
      env: { GH_TOKEN: 'ghp_x', OWNER_REPO: 'o/r' },
      request: request.fn,
      detectOwnerRepo: () => 'o/r',
    });
    const result = await adapter.write('users', [{ x: 1 }]);
    expect(result.ok).toBe(false);
    expect(result.error).toBeInstanceOf(Error);
  });

  test('write for an unknown entity name is a no-op success', async () => {
    const request = makeRequestStub([]);
    const adapter = createRemoteAdapter({
      env: { GH_TOKEN: 'ghp_x', OWNER_REPO: 'o/r' },
      request: request.fn,
      detectOwnerRepo: () => 'o/r',
    });
    const result = await adapter.write('bogus', {});
    expect(result).toEqual({ ok: true });
    expect(request.calls.length).toBe(0);
  });

  test('read for an unknown entity name is null', async () => {
    const request = makeRequestStub([]);
    const adapter = createRemoteAdapter({
      env: { GH_TOKEN: 'ghp_x', OWNER_REPO: 'o/r' },
      request: request.fn,
      detectOwnerRepo: () => 'o/r',
    });
    expect(await adapter.read('bogus')).toBeNull();
    expect(request.calls.length).toBe(0);
  });

  test('not configured → read returns null without calling request', async () => {
    const request = makeRequestStub([]);
    const adapter = createRemoteAdapter({
      env: { GH_TOKEN: '', OWNER_REPO: '' },
      request: request.fn,
      detectOwnerRepo: () => '',
    });
    expect(await adapter.read('users')).toBeNull();
    expect(request.calls.length).toBe(0);
  });

  test('not configured → write returns {ok: true} without calling request', async () => {
    const request = makeRequestStub([]);
    const adapter = createRemoteAdapter({
      env: { GH_TOKEN: '', OWNER_REPO: '' },
      request: request.fn,
      detectOwnerRepo: () => '',
    });
    const result = await adapter.write('users', []);
    expect(result).toEqual({ ok: true });
    expect(request.calls.length).toBe(0);
  });
});
