/**
 * Profile router (ticket #10).
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
      const loginHistory = visitsData.loginHistory || [];
      const userLogins = loginHistory.filter((login) => login.nationalNumber === nationalNumber);

      const totalLogins = userLogins.length;
      const firstLogin = userLogins.length > 0 ? userLogins[0].timestamp : null;
      const lastLogin = userLogins.length > 0 ? userLogins[userLogins.length - 1].timestamp : null;

      const recentLogins = userLogins
        .slice(-10)
        .reverse()
        .map((login) => ({
          timestamp: login.timestamp,
          date: new Date(login.timestamp).toLocaleDateString('en-US', { timeZone: 'Asia/Amman' }),
          time: new Date(login.timestamp).toLocaleTimeString('en-US', { timeZone: 'Asia/Amman' }),
        }));

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
          recentLogins,
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
      const updates = req.body || {};
      console.log(`Received POST /api/user/profile/${nationalNumber}/request-edit with body:`, updates);

      if (!nationalNumber) {
        return res.status(400).json({ success: false, error: 'National number required' });
      }

      const users = await usersAccess.readUsersData();
      const userIndex = users.findIndex((u) => u.nationalNumber === nationalNumber.trim());

      if (userIndex === -1) {
        return res.status(404).json({ success: false, error: 'User not found' });
      }

      const changes = [];
      PROFILE_EDIT_FIELDS.forEach((field) => {
        if (updates[field] !== undefined && updates[field] !== users[userIndex][field]) {
          changes.push({
            field,
            oldValue: users[userIndex][field] || '',
            newValue: updates[field],
          });
        }
      });

      if (changes.length === 0) {
        return res.status(400).json({ success: false, error: 'No changes detected' });
      }

      await createProfileEditRequest(
        notificationsAccess,
        users[userIndex].nationalNumber,
        users[userIndex].name,
        changes
      );

      res.json({
        success: true,
        message: 'Profile edit request submitted successfully. Waiting for admin approval.',
      });
    } catch (error) {
      console.error('Error creating profile edit request:', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  });

  router.put('/api/user/profile/:nationalNumber', async (req, res) => {
    try {
      const { nationalNumber } = req.params;
      const updates = req.body || {};
      console.log(`Received PUT /api/user/profile/${nationalNumber} with body:`, updates);

      if (!nationalNumber) {
        return res.status(400).json({ success: false, error: 'National number required' });
      }

      const users = await usersAccess.readUsersData();
      const userIndex = users.findIndex((u) => u.nationalNumber === nationalNumber.trim());

      if (userIndex === -1) {
        return res.status(404).json({ success: false, error: 'User not found' });
      }

      const sanitizedUpdates = {};
      const changes = [];
      PROFILE_EDIT_FIELDS.forEach((field) => {
        if (updates[field] !== undefined && updates[field] !== users[userIndex][field]) {
          sanitizedUpdates[field] = updates[field];
          changes.push({
            field,
            oldValue: users[userIndex][field] || '',
            newValue: updates[field],
          });
        }
      });

      users[userIndex] = { ...users[userIndex], ...sanitizedUpdates };
      await usersAccess.writeUsersData(users);

      if (changes.length > 0) {
        await createProfileUpdateNotification(
          notificationsAccess,
          users[userIndex].nationalNumber,
          users[userIndex].name,
          changes
        );
      }

      res.json({ success: true, data: users[userIndex] });
    } catch (error) {
      console.error('Error updating user profile:', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  });

  return router;
}

module.exports = { createProfileRouter };
