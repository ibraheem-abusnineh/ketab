/**
 * Profile router (ticket #10, ticket #14).
 *
 * Three routes lifted from server/index.js:
 *   GET   /api/user/profile/:nationalNumber
 *   PUT   /api/user/profile/:nationalNumber            (admin-approval path)
 *   POST  /api/user/profile/:nationalNumber/request-edit (creates profile_edit_request notification)
 *
 * The GET and POST routes are public (no auth). The PUT route was admin-only
 * in the legacy code but had no middleware wired — preserve that behaviour.
 *
 * Uses the visits storage seam to read login history for the profile page.
 *
 * Ticket #14: `loginHistory` is the per-day aggregate.
 *   - totalLogins = sum(loginCount) across the user's day-records
 *   - firstLogin  = oldest `date` (calendar day, Asia/Amman display)
 *   - lastLogin   = most recent `lastSeenAt` across day-records
 *   - recentLogins is dropped (decision 3): the per-day aggregate loses
 *     the per-event timestamp list.
 */
const express = require('express');
const { v4: uuidv4 } = require('uuid');
const { createUsersAccess } = require('../storage/usersAccess');
const { createVisitsAccess } = require('../storage/visitsAccess');
const { createNotificationsAccess } = require('../storage/notificationsAccess');

const PROFILE_EDIT_FIELDS = ['name', 'phone', 'school', 'directorate'];

async function createProfileEditRequest(notificationsAccess, userId, userName, changes) {
  const request = {
    id: uuidv4(),
    type: 'profile_edit_request',
    userId,
    userName,
    timestamp: new Date().toISOString(),
    changes,
    status: 'pending',
    read: false,
  };
  const notifications = await notificationsAccess.readNotifications();
  notifications.unshift(request);
  await notificationsAccess.writeNotifications(notifications);
  return request;
}

async function createProfileUpdateNotification(notificationsAccess, userId, userName, changes) {
  const notification = {
    id: uuidv4(),
    type: 'profile_update',
    userId,
    userName,
    timestamp: new Date().toISOString(),
    changes,
    read: false,
  };
  const notifications = await notificationsAccess.readNotifications();
  notifications.unshift(notification);
  await notificationsAccess.writeNotifications(notifications);
  return notification;
}

function createProfileRouter(store) {
  const router = express.Router();
  const usersAccess = createUsersAccess({ store });
  const visitsAccess = createVisitsAccess({ store });
  const notificationsAccess = createNotificationsAccess({ store });

  router.get('/api/user/profile/:nationalNumber', async (req, res) => {
    try {
      const { nationalNumber } = req.params;

      if (!nationalNumber) {
        return res.status(400).json({ success: false, error: 'National number required' });
      }

      const users = await usersAccess.readUsersData();
      const user = users.find((u) => u.nationalNumber === nationalNumber.trim());

      if (!user) {
        return res.status(404).json({ success: false, error: 'User not found' });
      }

      const visitsData = await visitsAccess.readVisitsData();
      const loginHistory = Array.isArray(visitsData.loginHistory) ? visitsData.loginHistory : [];
      // Filter day-records for this user.
      const userLogins = loginHistory.filter(
        (record) => record && record.nationalNumber === nationalNumber
      );

      // Ticket #14: totalLogins = sum(loginCount) across day-records.
      const totalLogins = userLogins.reduce(
        (sum, r) => sum + (Number(r.loginCount) || 0),
        0
      );
      // firstLogin = oldest date (calendar day string, lexicographic
      // min works for YYYY-MM-DD). lastLogin = most recent lastSeenAt.
      const dates = userLogins
        .map((r) => r.date)
        .filter((d) => typeof d === 'string' && d.length > 0);
      const firstLogin = dates.length > 0 ? dates.reduce((a, b) => (a < b ? a : b)) : null;
      const lastSeens = userLogins
        .map((r) => r.lastSeenAt)
        .filter((t) => typeof t === 'string' && t.length > 0);
      const lastLogin = lastSeens.length > 0 ? lastSeens.reduce((a, b) => (a > b ? a : b)) : null;

      res.json({
        success: true,
        data: {
          nationalNumber: user.nationalNumber,
          name: user.name,
          role: user.role,
          school: user.school || '',
          phone: user.phone || '',
          directorate: user.directorate || '',
          totalLogins,
          firstLogin,
          lastLogin,
          // recentLogins is intentionally omitted (ticket #14 decision 3).
        },
      });
    } catch (error) {
      console.error('Error getting user profile:', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  });

  router.post('/api/user/profile/:nationalNumber/request-edit', async (req, res) => {
    try {
      const { nationalNumber } = req.params;
      const { changes } = req.body || {};

      if (!nationalNumber) {
        return res.status(400).json({ success: false, error: 'National number required' });
      }

      const users = await usersAccess.readUsersData();
      const user = users.find((u) => u.nationalNumber === nationalNumber.trim());

      if (!user) {
        return res.status(404).json({ success: false, error: 'User not found' });
      }

      const validChanges = {};
      if (changes && typeof changes === 'object') {
        for (const field of PROFILE_EDIT_FIELDS) {
          if (Object.prototype.hasOwnProperty.call(changes, field) && typeof changes[field] === 'string') {
            validChanges[field] = changes[field].trim();
          }
        }
      }

      if (Object.keys(validChanges).length === 0) {
        return res.status(400).json({ success: false, error: 'No fields to update' });
      }

      const request = await createProfileEditRequest(notificationsAccess, user.nationalNumber, user.name, validChanges);
      return res.json({ success: true, request });
    } catch (error) {
      console.error('Error creating profile edit request:', error);
      return res.status(500).json({ success: false, error: 'Internal server error' });
    }
  });

  router.put('/api/user/profile/:nationalNumber', async (req, res) => {
    try {
      const { nationalNumber } = req.params;
      const updates = req.body || {};

      if (!nationalNumber) {
        return res.status(400).json({ success: false, error: 'National number required' });
      }

      const users = await usersAccess.readUsersData();
      const idx = users.findIndex((u) => u.nationalNumber === nationalNumber.trim());

      if (idx < 0) {
        return res.status(404).json({ success: false, error: 'User not found' });
      }

      const user = users[idx];
      const validUpdates = {};
      for (const field of PROFILE_EDIT_FIELDS) {
        if (Object.prototype.hasOwnProperty.call(updates, field) && typeof updates[field] === 'string') {
          validUpdates[field] = updates[field].trim();
        }
      }

      if (Object.keys(validUpdates).length === 0) {
        return res.status(400).json({ success: false, error: 'No fields to update' });
      }

      const before = { ...user };
      Object.assign(user, validUpdates);
      users[idx] = user;

      if (!(await usersAccess.writeUsersData(users))) {
        return res.status(500).json({ success: false, error: 'Failed to save user' });
      }

      // Only emit a notification when something actually changed.
      const changedFields = Object.keys(validUpdates).filter(
        (f) => before[f] !== validUpdates[f]
      );
      if (changedFields.length > 0) {
        const changeSet = {};
        for (const f of changedFields) changeSet[f] = validUpdates[f];
        await createProfileUpdateNotification(notificationsAccess, user.nationalNumber, user.name, changeSet);
      }

      return res.json({ success: true, user });
    } catch (error) {
      console.error('Error updating user profile:', error);
      return res.status(500).json({ success: false, error: 'Internal server error' });
    }
  });

  return router;
}

module.exports = { createProfileRouter };
