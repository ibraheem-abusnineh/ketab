/**
 * Users router (ticket #10).
 *
 * Five admin-gated routes lifted from server/index.js:
 *   GET    /api/users
 *   POST   /api/users/add
 *   PUT    /api/users/:nationalNumber
 *   DELETE /api/users/:nationalNumber
 *   POST   /api/users/import-csv
 *
 * Per ADR-0003, the router uses the `requireAdmin` middleware from
 * server/middleware/auth for every route.
 *
 * Two cross-cutting helpers (createNotification + the CSV upload pipeline)
 * are local to this module because they are only used by users routes.
 */
 const express = require('express');
 const fs = require('fs');
 const path = require('path');
 const { v4: uuidv4 } = require('uuid');
 const { parseCSV, validateUser } = require('../utils/csvParser');
 const { createUsersAccess } = require('../storage/usersAccess');
 const { createNotificationsAccess } = require('../storage/notificationsAccess');
 const { requireAdmin } = require('../middleware/auth');
const { StrictRemoteWriteError } = require('../storage/remoteAdapter');

const ALLOWED_UPDATE_FIELDS = ['name', 'role', 'school', 'phone', 'directorate'];

 /**
 * Parse `req.query.strict === 'true'` for forwarding to the store seam.
 * ticket #11: when strict + remote write fails, the store throws
 * StrictRemoteWriteError which the route catch forwards to the strict
 * error middleware (HTTP 502).
 */
function strictFromQuery(req) {
  return { strict: req.query.strict === 'true' };
}

/**
 * Create a "profile_update" notification (admin inbox). Mirrors the
 * legacy createNotification() helper (server/index.js:91-106).
 */
async function createNotification(notificationsAccess, userId, userName, changes, opts = {}) {
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
  await notificationsAccess.writeNotifications(notifications, opts);
  return notification;
}

function createUsersRouter(store) {
  const router = express.Router();
  const usersAccess = createUsersAccess({ store });
  const notificationsAccess = createNotificationsAccess({ store });

  // GET /api/users
  router.get('/api/users', requireAdmin, async (req, res) => {
    try {
      const users = await usersAccess.readUsersData();
      res.json({ success: true, users });
    } catch (error) {
      console.error('Error getting users:', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  });

  // POST /api/users/add
   router.post('/api/users/add', requireAdmin, async (req, res, next) => {
     try {
       const { nationalNumber, name, role, school, phone, directorate } = req.body || {};
       const user = { nationalNumber, name, role, school, phone, directorate };
       const validation = validateUser(user);
 
       if (!validation.valid) {
         return res.status(400).json({
           success: false,
           error: 'Validation failed',
           details: validation.errors,
         });
       }
 
       const users = await usersAccess.readUsersData();
       const existingUser = users.find((u) => u.nationalNumber === nationalNumber);
       if (existingUser) {
         return res.status(400).json({
           success: false,
           error: 'User with this national number already exists',
         });
       }
 
       users.push(user);
 
       if (await usersAccess.writeUsersData(users, strictFromQuery(req))) {
         res.json({ success: true, user });
       } else {
         res.status(500).json({ success: false, error: 'Failed to save user' });
       }
     } catch (error) {
      if (error instanceof StrictRemoteWriteError) return next(error);
       console.error('Error adding user:', error);
       res.status(500).json({ success: false, error: 'Internal server error' });
     }
  });
  // PUT /api/users/:nationalNumber
  router.put('/api/users/:nationalNumber', requireAdmin, async (req, res, next) => {
    try {
       const { nationalNumber } = req.params;
      const updates = req.body || {};

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
      ALLOWED_UPDATE_FIELDS.forEach((field) => {
        if (updates[field] !== undefined && updates[field] !== users[userIndex][field]) {
          sanitizedUpdates[field] = updates[field];
          changes.push({
            field,
            oldValue: users[userIndex][field] || '',
            newValue: updates[field],
          });
        }
      });

      if (changes.length > 0) {
        users[userIndex] = { ...users[userIndex], ...sanitizedUpdates };
        await usersAccess.writeUsersData(users, strictFromQuery(req));
        await createNotification(
          notificationsAccess,
          users[userIndex].nationalNumber,
          users[userIndex].name,
          changes,
          strictFromQuery(req)
        );
      }

      res.json({ success: true, user: users[userIndex] });
    } catch (error) {
      if (error instanceof StrictRemoteWriteError) return next(error);
      console.error('Error updating user:', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
   });

  // DELETE /api/users/:nationalNumber
  router.delete('/api/users/:nationalNumber', requireAdmin, async (req, res, next) => {
    try {
      const { nationalNumber } = req.params;

      if (!nationalNumber) {
        return res.status(400).json({ success: false, error: 'National number required' });
      }

      const users = await usersAccess.readUsersData();
      const userIndex = users.findIndex((u) => u.nationalNumber === nationalNumber.trim());

      if (userIndex === -1) {
        return res.status(404).json({ success: false, error: 'User not found' });
      }

      users.splice(userIndex, 1);
      await usersAccess.writeUsersData(users, strictFromQuery(req));

      res.json({ success: true });
    } catch (error) {
      if (error instanceof StrictRemoteWriteError) return next(error);
      console.error('Error deleting user:', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  });

  // POST /api/users/import-csv
  //
  // The CSV upload path uses multer which writes the file to a temp
  // directory before the handler runs. The composer attaches multer at
  // mount time (per ADR: routes own their own deps, composer wires them).
  // The handler expects req.file to be set; if not, return 400.
  router.post('/api/users/import-csv', requireAdmin, async (req, res, next) => {
    try {
      const { strategy, role } = req.body || {};

      if (!req.file) {
        return res.status(400).json({ success: false, error: 'No CSV file uploaded' });
      }

      if (!['parent', 'teacher', 'qra-employ'].includes(role)) {
        // Multer writes the upload before this validation runs, so clean up.
        try { fs.unlinkSync(req.file.path); } catch (_) { /* ignore */ }
        return res.status(400).json({
          success: false,
          error: 'Invalid CSV import role. Must be parent, teacher, or qra-employ',
        });
      }

      if (!['add', 'upsert', 'replace'].includes(strategy)) {
        try { fs.unlinkSync(req.file.path); } catch (_) { /* ignore */ }
        return res.status(400).json({
          success: false,
          error: 'Invalid strategy. Must be add, upsert, or replace',
        });
      }

      // Parse CSV.
      let importedUsers;
      try {
        importedUsers = await parseCSV(req.file.path, role);
      } catch (parseError) {
        try { fs.unlinkSync(req.file.path); } catch (_) { /* ignore */ }
        return res.status(400).json({
          success: false,
          error: parseError.message,
          details: {
            headers: parseError.headers || [],
            rowCount: parseError.rowCount || 0,
            suggestion: 'Check if CSV headers match expected format or try different column positions',
          },
        });
      }

      try { fs.unlinkSync(req.file.path); } catch (_) { /* ignore */ }

      const users = await usersAccess.readUsersData();
      const result = { added: 0, updated: 0, skipped: 0, errors: [] };

      if (strategy === 'replace') {
        const validUsers = importedUsers.filter((user) => {
          const validation = validateUser(user);
          if (!validation.valid) {
            result.errors.push(`${user.name || 'Unknown'}: ${validation.errors.join(', ')}`);
            return false;
          }
          return true;
        });
        await usersAccess.writeUsersData(validUsers, strictFromQuery(req));
        result.added = validUsers.length;
      } else {
        const existingUsers = [...users];
        for (const importedUser of importedUsers) {
          const validation = validateUser(importedUser);
          if (!validation.valid) {
            result.errors.push(`${importedUser.name || 'Unknown'}: ${validation.errors.join(', ')}`);
            continue;
          }
          const existingIndex = existingUsers.findIndex(
            (u) => u.nationalNumber === importedUser.nationalNumber
          );
          if (existingIndex === -1) {
            existingUsers.push(importedUser);
            result.added++;
          } else if (strategy === 'upsert') {
            existingUsers[existingIndex] = importedUser;
            result.updated++;
          } else {
            result.skipped++;
          }
        }
        await usersAccess.writeUsersData(existingUsers, strictFromQuery(req));
      }

      res.json({ success: true, result });
    } catch (error) {
      if (error instanceof StrictRemoteWriteError) return next(error);
      console.error('Error importing CSV:', error);
      res.status(500).json({ success: false, error: 'Internal server error' });
    }
  });

  return router;
}

module.exports = { createUsersRouter };
