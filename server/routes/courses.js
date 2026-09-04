/**
 * Courses router (ticket #10).
 *
 * GET /api/courses/status (public) and PUT /api/admin/courses/:courseId
 * (admin). The courses entity is local-only per ADR-0001 (CourseLock
 * is never remote-synced) — we still go through the storage seam for
 * consistency with the rest of the routes, but the store writes are
 * `remoteEligible: false`, so only the local file changes.
 *
 * This router does NOT import `requireAuth` directly: the composer
 * attaches the auth middleware at mount time. The router only declares
 * the route handlers; gating is the composer's job. This keeps the
 * router modules unit-testable without auth wiring.
 */
const express = require('express');

const DEFAULT_COURSE_SETTINGS = {
  arabic: { locked: false, label: 'Arabic Language' },
  english: { locked: true, label: 'English Language' },
};

function cloneDefaultCourses() {
  return {
    arabic: { ...DEFAULT_COURSE_SETTINGS.arabic },
    english: { ...DEFAULT_COURSE_SETTINGS.english },
  };
}


function createCoursesRouter(store) {
  const router = express.Router();

  router.get('/api/courses/status', async (req, res) => {
    try {
      const courses = await readCourses(store);
      res.json({ success: true, courses });
    } catch (error) {
      console.error('Error getting course status:', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  });

  router.put('/api/admin/courses/:courseId', async (req, res) => {
    const { courseId } = req.params;
    const { locked, label } = req.body || {};

    const normalizedCourseId = (courseId || '').toLowerCase().trim();

    if (!['arabic', 'english'].includes(normalizedCourseId)) {
      return res.status(404).json({ success: false, error: 'Course not found' });
    }

    if (locked !== undefined && typeof locked !== 'boolean') {
      return res.status(400).json({ success: false, error: 'Locked must be a boolean value' });
    }

    if (label !== undefined && typeof label !== 'string') {
      return res.status(400).json({ success: false, error: 'Label must be a string' });
    }

    const courses = await readCourses(store);
    const existing = courses[normalizedCourseId] || { ...DEFAULT_COURSE_SETTINGS[normalizedCourseId] };

    if (locked !== undefined) existing.locked = locked;
    if (label !== undefined) existing.label = label;

    courses[normalizedCourseId] = existing;

    const writeResult = await store.courses.write(courses);
    if (!writeResult || !writeResult.ok) {
      return res.status(500).json({ success: false, error: 'Failed to persist course settings' });
    }

    res.json({ success: true, course: existing, courses });
  });

  return router;
}

/**
 * Read courses via the store. Falls back to DEFAULT_COURSE_SETTINGS when
 * the file is absent or invalid — matches the legacy ensureCourseSettings
 * + readJSON semantics in server/index.js (lines 131-152).
 */
async function readCourses(store) {
  let courses = await store.courses.read();
  if (!courses || typeof courses !== 'object' || Array.isArray(courses)) {
    return cloneDefaultCourses();
  }
  return courses;
}

module.exports = { createCoursesRouter, DEFAULT_COURSE_SETTINGS };
