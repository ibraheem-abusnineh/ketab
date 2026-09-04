/**
 * Notifications router (ticket #10).
 *
 * Six admin-gated routes + one admin visits reset (per ticket #10 spec):
 *   GET    /api/admin/notifications
 *   DELETE /api/admin/notifications                   (bulk-clear profile_updates)
 *   POST   /api/admin/profile-requests/:id/approve
 *   POST   /api/admin/profile-requests/:id/reject
 *   POST   /api/admin/notifications/:id/read
 *   DELETE /api/admin/notifications/:id
 *   POST   /api/admin/reset-visits
 *
 * The reset-visits endpoint fits naturally with the admin notifications
 * cluster (it's admin-only and writes to the visits file via the store).
 */
const express = require('express');
const { createUsersAccess } = require('../storage/usersAccess');
const { createVisitsAccess } = require('../storage/visitsAccess');
const { createNotificationsAccess } = require('../storage/notificationsAccess');
const { requireAdmin } = require('../middleware/auth');

function createNotificationsRouter(store) {
  const router = express.Router();
  const usersAccess = createUsersAccess({ store });
  const visitsAccess = createVisitsAccess({ store });
  const notificationsAccess = createNotificationsAccess({ store });

  // GET /api/admin/notifications
  router.get('/api/admin/notifications', requireAdmin, async (req, res) => {
    try {
      const notifications = await notificationsAccess.readNotifications();
      res.json({ success: true, notifications });
    } catch (error) {
      console.error('Error fetching notifications:', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  });

  // POST /api/admin/profile-requests/:id/approve
  router.post('/api/admin/profile-requests/:id/approve', requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const notifications = await notificationsAccess.readNotifications();
      const requestIndex = notifications.findIndex(
        (n) => n.id === id && n.type === 'profile_edit_request'
      );

      if (requestIndex === -1) {
        return res.status(404).json({ success: false, error: 'Request not found' });
      }

      const request = notifications[requestIndex];
      if (request.status !== 'pending') {
        return res.status(400).json({ success: false, error: 'Request already processed' });
      }

      const users = await usersAccess.readUsersData();
      const userIndex = users.findIndex((u) => u.nationalNumber === request.userId);

      if (userIndex === -1) {
        return res.status(404).json({ success: false, error: 'User not found' });
      }

      const updates = {};
      request.changes.forEach((change) => {
        updates[change.field] = change.newValue;
      });

      users[userIndex] = { ...users[userIndex], ...updates };
      await usersAccess.writeUsersData(users);

      notifications[requestIndex] = {
        ...request,
        status: 'approved',
        read: true,
        approvedAt: new Date().toISOString(),
      };
      await notificationsAccess.writeNotifications(notifications);

      res.json({ success: true, message: 'Profile edit request approved', user: users[userIndex] });
    } catch (error) {
      console.error('Error approving profile edit request:', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  });

  // POST /api/admin/profile-requests/:id/reject
  router.post('/api/admin/profile-requests/:id/reject', requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const notifications = await notificationsAccess.readNotifications();
      const requestIndex = notifications.findIndex(
        (n) => n.id === id && n.type === 'profile_edit_request'
      );

      if (requestIndex === -1) {
        return res.status(404).json({ success: false, error: 'Request not found' });
      }

      const request = notifications[requestIndex];
      if (request.status !== 'pending') {
        return res.status(400).json({ success: false, error: 'Request already processed' });
      }

      notifications[requestIndex] = {
        ...request,
        status: 'rejected',
        read: true,
        rejectedAt: new Date().toISOString(),
      };
      await notificationsAccess.writeNotifications(notifications);

      res.json({ success: true, message: 'Profile edit request rejected' });
    } catch (error) {
      console.error('Error rejecting profile edit request:', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  });

  // POST /api/admin/notifications/:id/read
  router.post('/api/admin/notifications/:id/read', requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const notifications = await notificationsAccess.readNotifications();
      const idx = notifications.findIndex((n) => n.id === id);

      if (idx === -1) {
        return res.status(404).json({ success: false, error: 'Notification not found' });
      }

      notifications[idx].read = true;
      await notificationsAccess.writeNotifications(notifications);

      res.json({ success: true });
    } catch (error) {
      console.error('Error marking notification as read:', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  });

  // DELETE /api/admin/notifications/:id
  router.delete('/api/admin/notifications/:id', requireAdmin, async (req, res) => {
    try {
      const { id } = req.params;
      const notifications = await notificationsAccess.readNotifications();
      const idx = notifications.findIndex((n) => n.id === id);

      if (idx === -1) {
        return res.status(404).json({ success: false, error: 'Notification not found' });
      }

      const notification = notifications[idx];
      if (notification.type === 'profile_edit_request') {
        return res.status(400).json({
          success: false,
          error: 'Profile edit requests cannot be deleted. Please approve or reject them instead.',
        });
      }

      notifications.splice(idx, 1);
      await notificationsAccess.writeNotifications(notifications);

      res.json({ success: true, message: 'Notification deleted' });
    } catch (error) {
      console.error('Error deleting notification:', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  });

  // DELETE /api/admin/notifications (bulk — preserves profile_edit_request)
  router.delete('/api/admin/notifications', requireAdmin, async (req, res) => {
    try {
      const notifications = await notificationsAccess.readNotifications();
      const profileEditRequests = notifications.filter((n) => n.type === 'profile_edit_request');
      await notificationsAccess.writeNotifications(profileEditRequests);
      const clearedCount = notifications.length - profileEditRequests.length;

      res.json({
        success: true,
        message: `Cleared ${clearedCount} notification(s). Profile edit requests are preserved.`,
        clearedCount,
        remainingRequests: profileEditRequests.length,
      });
    } catch (error) {
      console.error('Error clearing notifications:', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  });

  // POST /api/admin/reset-visits — admin-only.
  router.post('/api/admin/reset-visits', requireAdmin, async (req, res) => {
    try {
      const { confirmed } = req.body || {};

      if (!confirmed) {
        return res.status(400).json({
          success: false,
          error: 'Confirmation required. Set confirmed to true.',
        });
      }

      const resetData = { totalVisits: 0, loginHistory: [] };
      if (await visitsAccess.writeVisitsData(resetData)) {
        console.log('Visit counter and login history reset successfully');
        res.json({
          success: true,
          message: 'Visit counter and login history have been reset',
          totalVisits: 0,
        });
      } else {
        res.status(500).json({ success: false, error: 'Failed to reset visit data' });
      }
    } catch (error) {
      console.error('Error resetting visits:', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  });

  return router;
}

module.exports = { createNotificationsRouter };
