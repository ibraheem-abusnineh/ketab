/**
 * Tests for the courses router (ticket #10).
 *
 * GET /api/courses/status is public. PUT /api/admin/courses/:courseId is
 * admin-gated by the composer; the router itself does not enforce auth.
 *
 * The courses entity is local-only (ADR-0001). The store stub mirrors
 * the contract: read returns null when the file is absent, write returns
 * {ok: true} on success.
 */
const express = require('express');
const { createCoursesRouter } = require('../routes/courses');
const { startApp, request, requestWithHeaders, makeStubStore } = require('./__httpHelper');

const ADMIN_TOKEN = 'admin_' + 'a'.repeat(40); // matches requireAdmin: prefix + length >= 32

describe('courses router', () => {
  let ctx;
  afterEach(() => {
    if (ctx && ctx.server) ctx.server.close();
    ctx = null;
  });
  function mount(store) {
    const app = express();
    app.use(express.json());
    app.use(createCoursesRouter(store));
    return app;
  }

  describe('GET /api/courses/status', () => {
    test('returns the default settings when no local file exists', async () => {
      const store = makeStubStore();
      ctx = await startApp(mount(store));
      const res = await request(ctx.baseUrl, 'GET', '/api/courses/status');
      expect(res.status).toBe(200);
      expect(res.body).toEqual({
        success: true,
        courses: {
          arabic: { locked: false, label: 'Arabic Language' },
          english: { locked: true, label: 'English Language' },
        },
      });
    });

    test('returns the persisted settings when present', async () => {
      const store = makeStubStore({
        courses: {
          arabic: { locked: true, label: 'Custom Arabic' },
          english: { locked: false, label: 'Custom English' },
        },
      });
      ctx = await startApp(mount(store));
      const res = await request(ctx.baseUrl, 'GET', '/api/courses/status');
      expect(res.status).toBe(200);
      expect(res.body.courses.arabic).toEqual({ locked: true, label: 'Custom Arabic' });
      expect(res.body.courses.english).toEqual({ locked: false, label: 'Custom English' });
    });
  });

  describe('PUT /api/admin/courses/:courseId', () => {
    test('updates an existing course setting and persists it', async () => {
      const store = makeStubStore();
      ctx = await startApp(mount(store));
      const res = await requestWithHeaders(
        ctx.baseUrl,
        'PUT',
        '/api/admin/courses/arabic',
        { locked: true, label: 'Arabic (locked)' },
        { authorization: ADMIN_TOKEN }
      );
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.course).toEqual({ locked: true, label: 'Arabic (locked)' });
      // Verify it was written to the store.
      const written = await store.courses.read();
      expect(written.arabic).toEqual({ locked: true, label: 'Arabic (locked)' });
    });

    test('normalises the courseId to lowercase', async () => {
      const store = makeStubStore();
      ctx = await startApp(mount(store));
      const res = await requestWithHeaders(
        ctx.baseUrl,
        'PUT',
        '/api/admin/courses/ARABIC',
        { locked: true },
        { authorization: ADMIN_TOKEN }
      );
      expect(res.status).toBe(200);
      expect(res.body.course).toEqual({ locked: true, label: 'Arabic Language' });
    });

    test('returns 404 for an unknown course', async () => {
      const store = makeStubStore();
      ctx = await startApp(mount(store));
      const res = await requestWithHeaders(
        ctx.baseUrl,
        'PUT',
        '/api/admin/courses/spanish',
        { locked: true },
        { authorization: ADMIN_TOKEN }
      );
      expect(res.status).toBe(404);
      expect(res.body.error).toMatch(/Course not found/);
    });

    test('returns 400 when `locked` is not a boolean', async () => {
      const store = makeStubStore();
      ctx = await startApp(mount(store));
      const res = await requestWithHeaders(
        ctx.baseUrl,
        'PUT',
        '/api/admin/courses/arabic',
        { locked: 'yes' },
        { authorization: ADMIN_TOKEN }
      );
      expect(res.status).toBe(400);
    });

    test('returns 400 when `label` is not a string', async () => {
      const store = makeStubStore();
      ctx = await startApp(mount(store));
      const res = await requestWithHeaders(
        ctx.baseUrl,
        'PUT',
        '/api/admin/courses/arabic',
        { label: 42 },
        { authorization: ADMIN_TOKEN }
      );
      expect(res.status).toBe(400);
    });

    test('returns 500 when the write fails', async () => {
      const store = {
        courses: {
          async read() { return null; },
          async write() { return { ok: false, source: 'none', error: new Error('disk full') }; },
        },
      };
      ctx = await startApp(mount(store));
      const res = await requestWithHeaders(
        ctx.baseUrl,
        'PUT',
        '/api/admin/courses/arabic',
        { locked: true },
        { authorization: ADMIN_TOKEN }
      );
      expect(res.status).toBe(500);
    });
  });
});
