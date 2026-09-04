/**
 * Auth router (ticket #10, ticket #14).
 *
 * Five routes lifted from server/index.js:
 *   POST /api/login/guest           — guest login, creates user on first contact
 *   POST /api/login                 — national-number login, tracks visit
 *   POST /api/developer/login       — hardcoded dev credentials, no visit
 *   POST /api/admin/login           — bcrypt against admin.json
 *   POST /api/admin/change-password — bcrypt round-trip with same-password guard
 *
 * Per ADR-0003, `requireAdmin` from server/middleware/auth.js gates the
 * admin routes in this router. The composer attaches the middleware at
 * mount time; this router declares the handlers without inline auth
 * checks.
 *
 * Ticket #14: `/api/login` and `/api/login/guest` write the per-day
 * aggregate via `incrementLoginCount` from `server/storage/visitsAccess`.
 * The legacy per-event push + `VISIT_HISTORY_CAP` are dropped. The
 * legacy `loginEvent` push has been replaced with `findOrCreateDayRecord`
 * + `loginCount += 1` semantics. `totalVisits` is preserved.
 */
const { requireAdmin } = require('../middleware/auth');
const express = require('express');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');
const { createUsersAccess } = require('../storage/usersAccess');
const {
  createVisitsAccess,
  incrementLoginCount,
  asiaAmmanDate,
} = require('../storage/visitsAccess');

function generateToken(prefix) {
  return `${prefix}${crypto.randomBytes(24).toString('hex')}`;
}

function createAuthRouter(store) {
  const router = express.Router();
  const usersAccess = createUsersAccess({ store });
  const visitsAccess = createVisitsAccess({ store });

  // POST /api/login/guest — guest login.
  router.post('/api/login/guest', async (req, res) => {
    try {
      const fullName = (req.body?.fullName || '').trim();
      const phoneNumber = (req.body?.phoneNumber || '').trim();
      if (!fullName || !phoneNumber) {
        return res.status(400).json({ success: false, error: 'Full name and phone number are required' });
      }

      if (!/^\d{10}$/.test(phoneNumber)) {
        return res.status(400).json({ success: false, error: 'Phone must be exactly 10 digits' });
      }

      const users = await usersAccess.readUsersData();

      // Reuse an existing guest by phone number when available.
      let guestUser = users.find(u => u.role === 'guest' && (u.phone || '').trim() === phoneNumber);

      if (!guestUser) {
        const guestId = `GUEST_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
        guestUser = {
          nationalNumber: guestId,
          name: fullName,
          role: 'guest',
          school: 'زيارة عامة',
          phone: phoneNumber,
          directorate: ''
        };
        users.push(guestUser);
      } else if (guestUser.name !== fullName) {
        guestUser.name = fullName;
      }

      if (!(await usersAccess.writeUsersData(users))) {
        return res.status(500).json({ success: false, error: 'Failed to save guest user' });
      }

      // Track guest login in the per-day aggregate (ADR-0004, ticket #14).
      const visitsData = await visitsAccess.readVisitsData();
      visitsData.totalVisits += 1;
      const now = new Date();
      incrementLoginCount(visitsData, {
        nationalNumber: guestUser.nationalNumber,
        name: guestUser.name,
        school: guestUser.school || '',
        date: asiaAmmanDate(now),
        at: now.toISOString(),
      });
      await visitsAccess.writeVisitsData(visitsData);

      return res.json({
        success: true,
        user: {
          nationalNumber: guestUser.nationalNumber,
          name: guestUser.name,
          role: guestUser.role,
          school: guestUser.school,
          phone: guestUser.phone,
        },
      });
    } catch (error) {
      console.error('Error during guest login:', error);
      return res.status(500).json({ success: false, error: 'Internal server error' });
    }
  });

  // POST /api/login — user login by national number.
  router.post('/api/login', async (req, res) => {
    try {
      const { nationalNumber } = req.body || {};

      if (!nationalNumber) {
        return res.status(400).json({ success: false, error: 'National number required' });
      }

      const users = await usersAccess.readUsersData();
      const user = users.find(u => u.nationalNumber === nationalNumber.trim());

      if (!user) {
        return res.status(401).json({ success: false, error: 'Invalid national number' });
      }

      // Track the login in the per-day aggregate (ADR-0004, ticket #14).
      const visitsData = await visitsAccess.readVisitsData();
      visitsData.totalVisits += 1;
      const now = new Date();
      incrementLoginCount(visitsData, {
        nationalNumber: user.nationalNumber,
        name: user.name,
        school: user.school || '',
        date: asiaAmmanDate(now),
        at: now.toISOString(),
      });
      await visitsAccess.writeVisitsData(visitsData);

      return res.json({
        success: true,
        user: {
          nationalNumber: user.nationalNumber,
          name: user.name,
          role: user.role,
          school: user.school,
        },
      });
    } catch (error) {
      console.error('Error during login:', error);
      return res.status(500).json({ success: false, error: 'Internal server error' });
    }
  });

  // POST /api/developer/login — hardcoded credentials, no visit tracking.
  router.post('/api/developer/login', (req, res) => {
    try {
      const { password } = req.body || {};

      if (!password) {
        return res.status(400).json({ success: false, error: 'Password required' });
      }

      const devPassword = process.env.DEV_PASSWORD || 'dev_ketab_2026';
      if (password !== devPassword) {
        return res.status(401).json({ success: false, error: 'Invalid password' });
      }

      const secureToken = generateToken('dev_');

      return res.json({
        success: true,
        message: 'Developer login successful',
        sessionToken: secureToken,
        user: {
          nationalNumber: 'developer',
          name: 'Developer',
          role: 'developer',
          school: '',
        },
      });
    } catch (error) {
      console.error('Error during developer login:', error);
      return res.status(500).json({ success: false, error: 'Internal server error' });
    }
  });

  // POST /api/admin/login — bcrypt against the admin file.
  router.post('/api/admin/login', async (req, res) => {
    try {
      const { username, password } = req.body || {};

      if (!username || !password) {
        return res.status(400).json({ success: false, error: 'Username and password required' });
      }

      const adminData = await store.admin.read();
      if (!adminData) {
        return res.status(500).json({ success: false, error: 'Admin data not found' });
      }

      if (adminData.username !== username) {
        return res.status(401).json({ success: false, error: 'Invalid credentials' });
      }

      const isValidPassword = bcrypt.compareSync(password, adminData.passwordHash);
      if (!isValidPassword) {
        return res.status(401).json({ success: false, error: 'Invalid credentials' });
      }

      const secureToken = generateToken('admin_');

      return res.json({
        success: true,
        message: 'Login successful',
        sessionToken: secureToken,
      });
    } catch (error) {
      console.error('Error during admin login:', error);
      return res.status(500).json({ success: false, error: 'Internal server error' });
    }
  });

  // POST /api/admin/change-password — admin-only.
  router.post('/api/admin/change-password', requireAdmin, async (req, res) => {
    try {
      const { currentPassword, newPassword } = req.body || {};

      if (!currentPassword || !newPassword) {
        return res.status(400).json({ success: false, error: 'Current password and new password are required' });
      }

      if (typeof newPassword !== 'string' || newPassword.trim().length < 6) {
        return res.status(400).json({ success: false, error: 'New password must be at least 6 characters' });
      }
      const adminData = await store.admin.read();
      if (!adminData || !adminData.passwordHash) {
        return res.status(500).json({ success: false, error: 'Admin data not found' });
      }

      const isValidCurrentPassword = bcrypt.compareSync(currentPassword, adminData.passwordHash);
      if (!isValidCurrentPassword) {
        return res.status(401).json({ success: false, error: 'Current password is incorrect' });
      }
      const isSamePassword = bcrypt.compareSync(newPassword, adminData.passwordHash);
      if (isSamePassword) {
        return res.status(400).json({ success: false, error: 'New password must be different from current password' });
      }

      const newPasswordHash = bcrypt.hashSync(newPassword, 10);
      const updatedAdminData = {
        ...adminData,
        passwordHash: newPasswordHash,
      };

      const writeResult = await store.admin.write(updatedAdminData);
      if (!writeResult || !writeResult.ok) {
        return res.status(500).json({ success: false, error: 'Failed to save new password' });
      }

      return res.json({ success: true, message: 'Password changed successfully' });
    } catch (error) {
      console.error('Error changing admin password:', error);
      return res.status(500).json({ success: false, error: 'Internal server error' });
    }
  });

  return router;
}

module.exports = { createAuthRouter };
