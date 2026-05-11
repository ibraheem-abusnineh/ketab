try { require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') }); } catch (_) {}

const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const bodyParser = require('body-parser');
const multer = require('multer');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');
const { parseCSV, validateUser } = require('./utils/csvParser');
const { readJSON, writeJSON } = require('./utils/fileStorage');
const s3Storage = require('./utils/s3Storage');

// Global error handlers for debugging App Runner crashes
process.on('uncaughtException', (err) => {
  console.error('UNCAUGHT EXCEPTION:', err.message);
  console.error(err.stack);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('UNHANDLED REJECTION:', reason);
  process.exit(1);
});

console.log('Starting server initialization...');

const app = express();

// Ensure required directories exist
const dataDir = path.join(__dirname, 'data');
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

// Auth Middleware
const adminAuth = (req, res, next) => {
  const token = req.headers['authorization'];
  if (!token) {
    return res.status(401).json({ success: false, error: 'Unauthorized: No token provided' });
  }

  // Accept both admin_ and dev_ tokens
  if ((token.startsWith('admin_') || token.startsWith('dev_')) && token.length >= 32) {
    return next();
  }

  return res.status(401).json({ success: false, error: 'Unauthorized: Invalid token' });
};

// File paths
const visitsPath = path.join(__dirname, 'data', 'visits.json');
const adminPath = path.join(__dirname, 'data', 'admin.json');
const usersPath = path.join(__dirname, 'data', 'users.json');
const coursesPath = path.join(__dirname, 'data', 'courses.json');
const notificationsPath = path.join(__dirname, 'data', 'notifications.json');
const DEFAULT_VISITS_DATA = { totalVisits: 0, loginHistory: [] };
const DEFAULT_NOTIFICATIONS = [];

function readUsersData() {
  return readJSON(usersPath, []);
}

function writeUsersData(users) {
  return writeJSON(usersPath, users);
}

function readNotifications() {
  return readJSON(notificationsPath, []);
}

function writeNotifications(notifications) {
  const ok = writeJSON(notificationsPath, notifications);
  if (ok && s3Storage.isConfigured()) {
    s3Storage.writeJSON('ketab/notifications.json', notifications).catch(e =>
      console.error('S3 write error (notifications):', e)
    );
  }
  return ok;
}

function ensureRuntimeDataFile(filePath, defaultValue) {
  if (fs.existsSync(filePath)) {
    return;
  }
  writeJSON(filePath, defaultValue);
}

async function syncFromS3() {
  if (!s3Storage.isConfigured()) return;

  const visits = await s3Storage.readJSON('ketab/visits.json');
  if (visits) {
    writeJSON(visitsPath, visits);
    console.log(`Remote sync: loaded visits (${visits.totalVisits} visits)`);
  } else {
    await s3Storage.writeJSON('ketab/visits.json', DEFAULT_VISITS_DATA);
  }

  const notifications = await s3Storage.readJSON('ketab/notifications.json');
  if (notifications) {
    writeJSON(notificationsPath, notifications);
    console.log(`Remote sync: loaded notifications (${notifications.length} items)`);
  } else {
    await s3Storage.writeJSON('ketab/notifications.json', DEFAULT_NOTIFICATIONS);
  }
}

function ensureRuntimeDataFiles() {
  ensureRuntimeDataFile(visitsPath, DEFAULT_VISITS_DATA);
  ensureRuntimeDataFile(notificationsPath, DEFAULT_NOTIFICATIONS);
  if (s3Storage.isConfigured()) {
    syncFromS3().catch(e => console.error('Remote startup sync failed:', e));
  }
}

function createNotification(userId, userName, changes) {
  const notification = {
    id: uuidv4(),
    type: 'profile_update',
    userId,
    userName,
    timestamp: new Date().toISOString(),
    changes,
    read: false
  };

  const notifications = readNotifications();
  notifications.unshift(notification);
  writeNotifications(notifications);
  return notification;
}

function createProfileEditRequest(userId, userName, changes) {
  const request = {
    id: uuidv4(),
    type: 'profile_edit_request',
    userId,
    userName,
    timestamp: new Date().toISOString(),
    changes,
    status: 'pending',
    read: false
  };

  const notifications = readNotifications();
  notifications.unshift(request);
  writeNotifications(notifications);
  return request;
}
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(bodyParser.json());

const DEFAULT_COURSE_SETTINGS = {
  arabic: { locked: false, label: 'Arabic Language' },
  english: { locked: true, label: 'English Language' }
};

function ensureCourseSettings() {
  try {
    if (!fs.existsSync(coursesPath)) {
      fs.writeFileSync(coursesPath, JSON.stringify(DEFAULT_COURSE_SETTINGS, null, 2));
    }
  } catch (error) {
    console.error('Error ensuring course settings file:', error);
  }
}

ensureCourseSettings();
ensureRuntimeDataFiles();

function readCourseSettings() {
  ensureCourseSettings();
  return readJSON(coursesPath, DEFAULT_COURSE_SETTINGS);
}

function writeCourseSettings(settings) {
  return writeJSON(coursesPath, settings);
}

// Configure multer for file uploads
const upload = multer({ dest: 'uploads/' });

// Helper function to read visits data
function readVisitsData() {
  return readJSON(visitsPath, DEFAULT_VISITS_DATA);
}

function writeVisitsData(visitsData) {
  const ok = writeJSON(visitsPath, visitsData);
  if (ok && s3Storage.isConfigured()) {
    s3Storage.writeJSON('ketab/visits.json', visitsData).catch(e =>
      console.error('S3 write error (visits):', e)
    );
  }
  return ok;
}

// Helper function to read admin data
function readAdminData() {
  return readJSON(adminPath, null);
}

function writeAdminData(data) {
  return writeJSON(adminPath, data);
}

// API Routes

// Track a visit (increment counter)
app.post('/api/track-visit', (req, res) => {
  try {
    const visitsData = readVisitsData();
    visitsData.totalVisits += 1;
    
    if (writeVisitsData(visitsData)) {
      console.log(`Visit tracked. Total visits: ${visitsData.totalVisits}`);
      res.json({ success: true, totalVisits: visitsData.totalVisits });
    } else {
      res.status(500).json({ success: false, error: 'Failed to save visit data' });
    }
  } catch (error) {
    console.error('Error tracking visit:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// User login with national number
app.post('/api/login/guest', (req, res) => {
  try {
    const fullName = (req.body?.fullName || '').trim();
    const phoneNumber = (req.body?.phoneNumber || '').trim();

    if (!fullName || !phoneNumber) {
      return res.status(400).json({ success: false, error: 'Full name and phone number are required' });
    }

    if (!/^\d{10}$/.test(phoneNumber)) {
      return res.status(400).json({ success: false, error: 'Phone must be exactly 10 digits' });
    }

    const users = readUsersData();

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

    if (!writeUsersData(users)) {
      return res.status(500).json({ success: false, error: 'Failed to save guest user' });
    }

    // Track guest login in visit counters/history so admin analytics include guests.
    const visitsData = readVisitsData();
    visitsData.totalVisits += 1;

    const loginEvent = {
      nationalNumber: guestUser.nationalNumber,
      name: guestUser.name,
      school: guestUser.school || '',
      role: guestUser.role,
      timestamp: new Date().toISOString()
    };

    if (!visitsData.loginHistory) {
      visitsData.loginHistory = [];
    }
    visitsData.loginHistory.push(loginEvent);
    if (visitsData.loginHistory.length > 10000) {
      visitsData.loginHistory = visitsData.loginHistory.slice(-10000);
    }
    writeVisitsData(visitsData);

    return res.json({
      success: true,
      user: {
        nationalNumber: guestUser.nationalNumber,
        name: guestUser.name,
        role: guestUser.role,
        school: guestUser.school,
        phone: guestUser.phone
      }
    });
  } catch (error) {
    console.error('Error during guest login:', error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// User login with national number
app.post('/api/login', (req, res) => {
  try {
    const { nationalNumber } = req.body;
    
    if (!nationalNumber) {
      return res.status(400).json({ success: false, error: 'National number required' });
    }
    
    const users = readUsersData();
    const user = users.find(u => u.nationalNumber === nationalNumber.trim());
    
    if (!user) {
      return res.status(401).json({ success: false, error: 'Invalid national number' });
    }
    
    // Track the visit with detailed information
    const visitsData = readVisitsData();
    visitsData.totalVisits += 1;
    
    // Add detailed login event
    const loginEvent = {
      nationalNumber: user.nationalNumber,
      name: user.name,
      school: user.school || '',
      role: user.role,
      timestamp: new Date().toISOString()
    };
    
    // Initialize loginHistory if it doesn't exist (backward compatibility)
    if (!visitsData.loginHistory) {
      visitsData.loginHistory = [];
    }
    
    visitsData.loginHistory.push(loginEvent);
    
    // Keep only last 10,000 login events to prevent file from growing too large
    if (visitsData.loginHistory.length > 10000) {
      visitsData.loginHistory = visitsData.loginHistory.slice(-10000);
    }
    
    writeVisitsData(visitsData);
    
    res.json({ 
      success: true, 
      user: {
        nationalNumber: user.nationalNumber,
        name: user.name,
        role: user.role,
        school: user.school
      }
    });
  } catch (error) {
    console.error('Error during login:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// Developer login — hardcoded credentials, no visit tracking
app.post('/api/developer/login', (req, res) => {
  try {
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({ success: false, error: 'Password required' });
    }

    const devPassword = process.env.DEV_PASSWORD || 'dev_ketab_2026';
    if (password !== devPassword) {
      return res.status(401).json({ success: false, error: 'Invalid password' });
    }

    const secureToken = `dev_${crypto.randomBytes(24).toString('hex')}`;

    res.json({
      success: true,
      message: 'Developer login successful',
      sessionToken: secureToken,
      user: {
        nationalNumber: 'developer',
        name: 'Developer',
        role: 'developer',
        school: ''
      }
    });
  } catch (error) {
    console.error('Error during developer login:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// Get current visit count
app.get('/api/visit-count', (req, res) => {
  try {
    const visitsData = readVisitsData();
    res.json({ totalVisits: visitsData.totalVisits });
  } catch (error) {
    console.error('Error getting visit count:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Course availability endpoints
app.get('/api/courses/status', (req, res) => {
  try {
    const courses = readCourseSettings();
    res.json({ success: true, courses });
  } catch (error) {
    console.error('Error getting course status:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

app.put('/api/admin/courses/:courseId', adminAuth, (req, res) => {
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

  const courses = readCourseSettings();
  const existing = courses[normalizedCourseId] || { ...DEFAULT_COURSE_SETTINGS[normalizedCourseId] };

  if (locked !== undefined) {
    existing.locked = locked;
  }

  if (label !== undefined) {
    existing.label = label;
  }

  courses[normalizedCourseId] = existing;

  if (!writeCourseSettings(courses)) {
    return res.status(500).json({ success: false, error: 'Failed to persist course settings' });
  }

  res.json({ success: true, course: existing, courses });
});

// Admin login
app.post('/api/admin/login', (req, res) => {
  try {
    const { username, password } = req.body;
    
    if (!username || !password) {
      return res.status(400).json({ success: false, error: 'Username and password required' });
    }
    
    const adminData = readAdminData();
    if (!adminData) {
      return res.status(500).json({ success: false, error: 'Admin data not found' });
    }
    
    // Check username
    if (adminData.username !== username) {
      return res.status(401).json({ success: false, error: 'Invalid credentials' });
    }
    
    // Check password
    const isValidPassword = bcrypt.compareSync(password, adminData.passwordHash);
    if (!isValidPassword) {
      return res.status(401).json({ success: false, error: 'Invalid credentials' });
    }
    
    // Generate a secure session token
    const secureToken = `admin_${crypto.randomBytes(24).toString('hex')}`;
    
    res.json({ 
      success: true, 
      message: 'Login successful',
      sessionToken: secureToken 
    });
  } catch (error) {
    console.error('Error during admin login:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// Change admin password
app.post('/api/admin/change-password', adminAuth, (req, res) => {
  try {
    const { currentPassword, newPassword } = req.body || {};

    if (!currentPassword || !newPassword) {
      return res.status(400).json({ success: false, error: 'Current password and new password are required' });
    }

    if (typeof newPassword !== 'string' || newPassword.trim().length < 6) {
      return res.status(400).json({ success: false, error: 'New password must be at least 6 characters' });
    }

    const adminData = readAdminData();
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
      passwordHash: newPasswordHash
    };

    if (!writeAdminData(updatedAdminData)) {
      return res.status(500).json({ success: false, error: 'Failed to save new password' });
    }

    return res.json({ success: true, message: 'Password changed successfully' });
  } catch (error) {
    console.error('Error changing admin password:', error);
    return res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// User Management APIs

// Get all users
app.get('/api/users', adminAuth, (req, res) => {
  try {
    const users = readUsersData();
    res.json({ success: true, users });
  } catch (error) {
    console.error('Error getting users:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// Add single user
app.post('/api/users/add', adminAuth, (req, res) => {
  try {
    const { nationalNumber, name, role, school, phone, directorate } = req.body;
    
    const user = { nationalNumber, name, role, school, phone, directorate };
    const validation = validateUser(user);
    
    if (!validation.valid) {
      return res.status(400).json({ 
        success: false, 
        error: 'Validation failed', 
        details: validation.errors 
      });
    }
    
    const users = readUsersData();
    
    // Check if user already exists
    const existingUser = users.find(u => u.nationalNumber === nationalNumber);
    if (existingUser) {
      return res.status(400).json({ 
        success: false, 
        error: 'User with this national number already exists' 
      });
    }
    
    users.push(user);
    
    if (writeUsersData(users)) {
      res.json({ success: true, user });
    } else {
      res.status(500).json({ success: false, error: 'Failed to save user' });
    }
  } catch (error) {
    console.error('Error adding user:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// Delete user
// Update user endpoint
app.put('/api/users/:nationalNumber', adminAuth, (req, res) => {
  try {
    const { nationalNumber } = req.params;
    const updates = req.body;
    
    if (!nationalNumber) {
      return res.status(400).json({ success: false, error: 'National number required' });
    }
    
    const users = readUsersData();
    const userIndex = users.findIndex(u => u.nationalNumber === nationalNumber.trim());
    
    if (userIndex === -1) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }
    
    // Only allow updating certain fields
    const allowedUpdates = ['name', 'role', 'school', 'phone', 'directorate'];
    const sanitizedUpdates = {};
    const changes = [];
    
    allowedUpdates.forEach(field => {
      if (updates[field] !== undefined && updates[field] !== users[userIndex][field]) {
        sanitizedUpdates[field] = updates[field];
        changes.push({
          field,
          oldValue: users[userIndex][field] || '',
          newValue: updates[field]
        });
      }
    });
    
    if (changes.length > 0) {
      // Update user data
      users[userIndex] = {
        ...users[userIndex],
        ...sanitizedUpdates
      };
      
      // Save updated users data
      writeUsersData(users);
      
      // Create notification for admins
      createNotification(
        users[userIndex].nationalNumber,
        users[userIndex].name,
        changes
      );
    }
    
    res.json({ success: true, user: users[userIndex] });
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

app.delete('/api/users/:nationalNumber', adminAuth, (req, res) => {
  try {
    const { nationalNumber } = req.params;
    
    if (!nationalNumber) {
      return res.status(400).json({ success: false, error: 'National number required' });
    }
    
    const users = readUsersData();
    const userIndex = users.findIndex(u => u.nationalNumber === nationalNumber.trim());
    
    if (userIndex === -1) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }
    
    // Remove user
    users.splice(userIndex, 1);
    
    // Save updated users data
    writeUsersData(users);
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// Import users from CSV
app.post('/api/users/import-csv', adminAuth, upload.single('csvFile'), async (req, res) => {
  try {
    const { strategy, role } = req.body;
    
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No CSV file uploaded' });
    }
    
    if (!['parent', 'teacher', 'qra-employ'].includes(role)) {
      return res.status(400).json({ success: false, error: 'Invalid CSV import role. Must be parent, teacher, or qra-employ' });
    }
    
    if (!['add', 'upsert', 'replace'].includes(strategy)) {
      return res.status(400).json({ success: false, error: 'Invalid strategy. Must be add, upsert, or replace' });
    }
    
    // Parse CSV
    let importedUsers;
    try {
      importedUsers = await parseCSV(req.file.path, role);
    } catch (parseError) {
      // Clean up uploaded file
      fs.unlinkSync(req.file.path);
      
      // Return detailed error information
      return res.status(400).json({ 
        success: false, 
        error: parseError.message,
        details: {
          headers: parseError.headers || [],
          rowCount: parseError.rowCount || 0,
          suggestion: 'Check if CSV headers match expected format or try different column positions'
        }
      });
    }
    
    // Clean up uploaded file
    fs.unlinkSync(req.file.path);
    
    const users = readUsersData();
    let result = { added: 0, updated: 0, skipped: 0, errors: [] };
    
    if (strategy === 'replace') {
      // Replace all users with imported ones
      const validUsers = importedUsers.filter(user => {
        const validation = validateUser(user);
        if (!validation.valid) {
          result.errors.push(`${user.name || 'Unknown'}: ${validation.errors.join(', ')}`);
          return false;
        }
        return true;
      });
      
      writeUsersData(validUsers);
      result.added = validUsers.length;
    } else {
      // Add or upsert strategy
      const existingUsers = [...users];
      
      for (const importedUser of importedUsers) {
        const validation = validateUser(importedUser);
        if (!validation.valid) {
          result.errors.push(`${importedUser.name || 'Unknown'}: ${validation.errors.join(', ')}`);
          continue;
        }
        
        const existingIndex = existingUsers.findIndex(u => u.nationalNumber === importedUser.nationalNumber);
        
        if (existingIndex === -1) {
          // New user
          existingUsers.push(importedUser);
          result.added++;
        } else if (strategy === 'upsert') {
          // Update existing user
          existingUsers[existingIndex] = importedUser;
          result.updated++;
        } else {
          // Skip existing user
          result.skipped++;
        }
      }
      
      writeUsersData(existingUsers);
    }
    
    res.json({ success: true, result });
  } catch (error) {
    console.error('Error importing CSV:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// Statistics API endpoints

// Helper function to filter login history by date range
function filterByDateRange(loginHistory, startDate, endDate) {
  if (!startDate || !endDate) {
    return loginHistory;
  }
  
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  return loginHistory.filter(login => {
    const loginDate = new Date(login.timestamp);
    return loginDate >= start && loginDate <= end;
  });
}

// Get visits grouped by school
app.get('/api/stats/by-school', adminAuth, (req, res) => {
  try {
    const visitsData = readVisitsData();
    let loginHistory = visitsData.loginHistory || [];
    
    // Apply date filtering if provided
    const { startDate, endDate } = req.query;
    if (startDate && endDate) {
      loginHistory = filterByDateRange(loginHistory, startDate, endDate);
    }
    
    // Group by school
    const schoolStats = {};
    loginHistory.forEach(login => {
      const school = login.school || 'Unknown School';
      if (!schoolStats[school]) {
        schoolStats[school] = { count: 0, users: new Set() };
      }
      schoolStats[school].count++;
      schoolStats[school].users.add(login.nationalNumber);
    });
    
    // Convert to array format
    const result = Object.entries(schoolStats).map(([school, data]) => ({
      school,
      visitCount: data.count,
      uniqueUsers: data.users.size
    })).sort((a, b) => b.visitCount - a.visitCount);
    
    res.json({ success: true, data: result });
  } catch (error) {
    console.error('Error getting school stats:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// Get visits grouped by time (hour/day)
app.get('/api/stats/by-time', adminAuth, (req, res) => {
  try {
    const visitsData = readVisitsData();
    const loginHistory = visitsData.loginHistory || [];
    
    // Group by hour
    const hourlyStats = {};
    const dailyStats = {};
    
    loginHistory.forEach(login => {
      const date = new Date(login.timestamp);
      const hour = date.getHours();
      const day = date.toISOString().split('T')[0];
      
      // Hourly stats
      if (!hourlyStats[hour]) {
        hourlyStats[hour] = 0;
      }
      hourlyStats[hour]++;
      
      // Daily stats
      if (!dailyStats[day]) {
        dailyStats[day] = 0;
      }
      dailyStats[day]++;
    });
    
    // Convert to arrays
    const hourlyData = Object.entries(hourlyStats).map(([hour, count]) => ({
      hour: parseInt(hour),
      count
    })).sort((a, b) => a.hour - b.hour);
    
    const dailyData = Object.entries(dailyStats).map(([day, count]) => ({
      day,
      count
    })).sort((a, b) => a.day.localeCompare(b.day));
    
    res.json({ 
      success: true, 
      data: { 
        hourly: hourlyData, 
        daily: dailyData 
      } 
    });
  } catch (error) {
    console.error('Error getting time stats:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// Get user login history and statistics
app.get('/api/stats/user-history', adminAuth, (req, res) => {
  try {
    const visitsData = readVisitsData();
    let loginHistory = visitsData.loginHistory || [];
    
    // Apply date filtering if provided
    const { startDate, endDate } = req.query;
    if (startDate && endDate) {
      loginHistory = filterByDateRange(loginHistory, startDate, endDate);
    }
    
    // Group by user
    const userStats = {};
    loginHistory.forEach(login => {
      const key = login.nationalNumber;
      if (!userStats[key]) {
        userStats[key] = {
          nationalNumber: login.nationalNumber,
          name: login.name,
          school: login.school || '',
          role: login.role,
          loginCount: 0,
          logins: []
        };
      }
      userStats[key].loginCount++;
      userStats[key].logins.push({
        timestamp: login.timestamp,
        date: new Date(login.timestamp).toLocaleDateString('en-US', { timeZone: 'Asia/Amman' }),
        time: new Date(login.timestamp).toLocaleTimeString('en-US', { timeZone: 'Asia/Amman' })
      });
    });
    
    // Convert to array and sort by login count
    const result = Object.values(userStats)
      .map(user => ({
        ...user,
        lastLogin: user.logins[user.logins.length - 1]?.timestamp,
        recentLogins: user.logins.slice(-5).reverse() // Last 5 logins, most recent first
      }))
      .sort((a, b) => b.loginCount - a.loginCount);
    
    res.json({ success: true, data: result });
  } catch (error) {
    console.error('Error getting user history:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// Get filtered visits with details
app.get('/api/stats/visits', adminAuth, (req, res) => {
  try {
    const visitsData = readVisitsData();
    let loginHistory = visitsData.loginHistory || [];
    
    // Apply date filtering if provided
    const { startDate, endDate } = req.query;
    if (startDate && endDate) {
      loginHistory = filterByDateRange(loginHistory, startDate, endDate);
    }
    
    // Return visits with details
    const visits = loginHistory.map(login => ({
      timestamp: login.timestamp,
      nationalNumber: login.nationalNumber,
      name: login.name,
      school: login.school || ''
    }));
    
    res.json({ 
      success: true, 
      count: visits.length,
      visits: visits
    });
  } catch (error) {
    console.error('Error getting visits:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// Get user profile data
app.get('/api/user/profile/:nationalNumber', (req, res) => {
  try {
    const { nationalNumber } = req.params;
    
    if (!nationalNumber) {
      return res.status(400).json({ success: false, error: 'National number required' });
    }
    
    const users = readUsersData();
    const user = users.find(u => u.nationalNumber === nationalNumber.trim());
    
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }
    
    // Get login history for this user
    const visitsData = readVisitsData();
    const loginHistory = visitsData.loginHistory || [];
    const userLogins = loginHistory.filter(login => login.nationalNumber === nationalNumber);
    
    // Calculate statistics
    const totalLogins = userLogins.length;
    const firstLogin = userLogins.length > 0 ? userLogins[0].timestamp : null;
    const lastLogin = userLogins.length > 0 ? userLogins[userLogins.length - 1].timestamp : null;
    
    // Get recent logins (last 10)
    const recentLogins = userLogins
      .slice(-10)
      .reverse()
      .map(login => ({
        timestamp: login.timestamp,
        date: new Date(login.timestamp).toLocaleDateString('en-US', { timeZone: 'Asia/Amman' }),
        time: new Date(login.timestamp).toLocaleTimeString('en-US', { timeZone: 'Asia/Amman' })
      }));
    
    const profileData = {
      // Basic user information
      nationalNumber: user.nationalNumber,
      name: user.name,
      role: user.role,
      school: user.school || '',
      phone: user.phone || '',
      directorate: user.directorate || '',
      
      // Login statistics
      totalLogins,
      firstLogin,
      lastLogin,
      
      // Recent activity
      recentLogins
    };
    
    res.json({ success: true, data: profileData });
  } catch (error) {
    console.error('Error getting user profile:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// Profile edit request endpoint (user submits a request for admin approval)
app.post('/api/user/profile/:nationalNumber/request-edit', (req, res) => {
  try {
    const { nationalNumber } = req.params;
    const updates = req.body;
    console.log(`Received POST /api/user/profile/${nationalNumber}/request-edit with body:`, updates);
    
    if (!nationalNumber) {
      return res.status(400).json({ success: false, error: 'National number required' });
    }
    
    const users = readUsersData();
    const userIndex = users.findIndex(u => u.nationalNumber === nationalNumber.trim());
    
    if (userIndex === -1) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    // Only allow updating certain fields
    const allowedUpdates = ['name', 'phone', 'school', 'directorate'];
    const changes = [];

    allowedUpdates.forEach(field => {
      if (updates[field] !== undefined && updates[field] !== users[userIndex][field]) {
        changes.push({
          field,
          oldValue: users[userIndex][field] || '',
          newValue: updates[field]
        });
      }
    });

    if (changes.length === 0) {
      return res.status(400).json({ success: false, error: 'No changes detected' });
    }

    // Create a profile edit request for admin approval
    createProfileEditRequest(
      users[userIndex].nationalNumber,
      users[userIndex].name,
      changes
    );

    res.json({ 
      success: true, 
      message: 'Profile edit request submitted successfully. Waiting for admin approval.' 
    });
  } catch (error) {
    console.error('Error creating profile edit request:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// Update user profile endpoint (admin-only, for approving requests)
app.put('/api/user/profile/:nationalNumber', (req, res) => {
  try {
    const { nationalNumber } = req.params;
    const updates = req.body;
    console.log(`Received PUT /api/user/profile/${nationalNumber} with body:`, updates);
    
    if (!nationalNumber) {
      return res.status(400).json({ success: false, error: 'National number required' });
    }
    
    const users = readUsersData();
    const userIndex = users.findIndex(u => u.nationalNumber === nationalNumber.trim());
    
    if (userIndex === -1) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    // Only allow updating certain fields
    const allowedUpdates = ['name', 'phone', 'school', 'directorate'];
    const sanitizedUpdates = {};
    const changes = [];

    allowedUpdates.forEach(field => {
      if (updates[field] !== undefined && updates[field] !== users[userIndex][field]) {
        sanitizedUpdates[field] = updates[field];
        changes.push({
          field,
          oldValue: users[userIndex][field] || '',
          newValue: updates[field]
        });
      }
    });

    // Update user data
    users[userIndex] = {
      ...users[userIndex],
      ...sanitizedUpdates
    };

    // Save updated users data
    writeUsersData(users);

    // Create a notification about the approved update
    if (changes.length > 0) {
      createNotification(
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

// Admin notifications endpoints
app.get('/api/admin/notifications', adminAuth, (req, res) => {
  try {
    const notifications = readNotifications();
    res.json({ success: true, notifications });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// Approve profile edit request
app.post('/api/admin/profile-requests/:id/approve', adminAuth, (req, res) => {
  try {
    const { id } = req.params;
    const notifications = readNotifications();
    const requestIndex = notifications.findIndex(n => n.id === id && n.type === 'profile_edit_request');
    
    if (requestIndex === -1) {
      return res.status(404).json({ success: false, error: 'Request not found' });
    }

    const request = notifications[requestIndex];
    if (request.status !== 'pending') {
      return res.status(400).json({ success: false, error: 'Request already processed' });
    }

    // Update user profile with requested changes
    const users = readUsersData();
    const userIndex = users.findIndex(u => u.nationalNumber === request.userId);
    
    if (userIndex === -1) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    // Apply the changes
    const updates = {};
    request.changes.forEach(change => {
      updates[change.field] = change.newValue;
    });

    users[userIndex] = {
      ...users[userIndex],
      ...updates
    };

    writeUsersData(users);

    // Update request status
    notifications[requestIndex] = {
      ...request,
      status: 'approved',
      read: true,
      approvedAt: new Date().toISOString()
    };

    writeNotifications(notifications);

    res.json({ success: true, message: 'Profile edit request approved', user: users[userIndex] });
  } catch (error) {
    console.error('Error approving profile edit request:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// Reject profile edit request
app.post('/api/admin/profile-requests/:id/reject', adminAuth, (req, res) => {
  try {
    const { id } = req.params;
    const notifications = readNotifications();
    const requestIndex = notifications.findIndex(n => n.id === id && n.type === 'profile_edit_request');
    
    if (requestIndex === -1) {
      return res.status(404).json({ success: false, error: 'Request not found' });
    }

    const request = notifications[requestIndex];
    if (request.status !== 'pending') {
      return res.status(400).json({ success: false, error: 'Request already processed' });
    }

    // Update request status
    notifications[requestIndex] = {
      ...request,
      status: 'rejected',
      read: true,
      rejectedAt: new Date().toISOString()
    };

    writeNotifications(notifications);

    res.json({ success: true, message: 'Profile edit request rejected' });
  } catch (error) {
    console.error('Error rejecting profile edit request:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

app.post('/api/admin/notifications/:id/read', adminAuth, (req, res) => {
  try {
    const { id } = req.params;
    const notifications = readNotifications();
    const notificationIndex = notifications.findIndex(n => n.id === id);
    
    if (notificationIndex === -1) {
      return res.status(404).json({ success: false, error: 'Notification not found' });
    }
    
    notifications[notificationIndex].read = true;
    writeNotifications(notifications);
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// Delete a single notification
app.delete('/api/admin/notifications/:id', adminAuth, (req, res) => {
  try {
    const { id } = req.params;
    const notifications = readNotifications();
    const notificationIndex = notifications.findIndex(n => n.id === id);
    
    if (notificationIndex === -1) {
      return res.status(404).json({ success: false, error: 'Notification not found' });
    }
    
    const notification = notifications[notificationIndex];
    
    // Don't allow deleting profile edit requests through notification deletion
    // They should be handled through approve/reject actions only
    if (notification.type === 'profile_edit_request') {
      return res.status(400).json({ 
        success: false, 
        error: 'Profile edit requests cannot be deleted. Please approve or reject them instead.' 
      });
    }
    
    notifications.splice(notificationIndex, 1);
    writeNotifications(notifications);
    
    res.json({ success: true, message: 'Notification deleted' });
  } catch (error) {
    console.error('Error deleting notification:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// Clear all notifications (but keep profile edit requests)
app.delete('/api/admin/notifications', adminAuth, (req, res) => {
  try {
    const notifications = readNotifications();
    
    // Only clear profile_update notifications, keep profile_edit_request notifications
    const profileEditRequests = notifications.filter(n => n.type === 'profile_edit_request');
    
    writeNotifications(profileEditRequests);
    
    const clearedCount = notifications.length - profileEditRequests.length;
    res.json({ 
      success: true, 
      message: `Cleared ${clearedCount} notification(s). Profile edit requests are preserved.`,
      clearedCount,
      remainingRequests: profileEditRequests.length
    });
  } catch (error) {
    console.error('Error clearing notifications:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// Reset visits endpoint (admin only)
app.post('/api/admin/reset-visits', adminAuth, (req, res) => {
  try {
    const { confirmed } = req.body;
    
    if (!confirmed) {
      return res.status(400).json({ 
        success: false, 
        error: 'Confirmation required. Set confirmed to true.' 
      });
    }
    
    // Reset visits data
    const resetData = {
      totalVisits: 0,
      loginHistory: []
    };
    
    if (writeVisitsData(resetData)) {
      console.log('Visit counter and login history reset successfully');
      res.json({ 
        success: true, 
        message: 'Visit counter and login history have been reset',
        totalVisits: 0
      });
    } else {
      res.status(500).json({ success: false, error: 'Failed to reset visit data' });
    }
  } catch (error) {
    console.error('Error resetting visits:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// Reports API endpoints

// Get school reports with date range filtering
app.get('/api/reports/by-school', adminAuth, (req, res) => {
  try {
    const visitsData = readVisitsData();
    let loginHistory = visitsData.loginHistory || [];
    
    // Apply date filtering
    const { startDate, endDate } = req.query;
    if (startDate && endDate) {
      loginHistory = filterByDateRange(loginHistory, startDate, endDate);
    }
    
    // Group by school
    const schoolStats = {};
    loginHistory.forEach(login => {
      const school = login.school || 'Unknown School';
      if (!schoolStats[school]) {
        schoolStats[school] = { count: 0, users: new Set() };
      }
      schoolStats[school].count++;
      schoolStats[school].users.add(login.nationalNumber);
    });
    
    // Convert to array format
    const result = Object.entries(schoolStats).map(([school, data]) => ({
      school,
      loginCount: data.count,
      uniqueUsers: data.users.size
    })).sort((a, b) => b.loginCount - a.loginCount);
    
    res.json({ success: true, data: result });
  } catch (error) {
    console.error('Error getting school reports:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// Get user reports with date range filtering
app.get('/api/reports/by-user', adminAuth, (req, res) => {
  try {
    const visitsData = readVisitsData();
    let loginHistory = visitsData.loginHistory || [];
    
    // Apply date filtering
    const { startDate, endDate } = req.query;
    if (startDate && endDate) {
      loginHistory = filterByDateRange(loginHistory, startDate, endDate);
    }
    
    // Group by user
    const userStats = {};
    loginHistory.forEach(login => {
      const key = login.nationalNumber;
      if (!userStats[key]) {
        userStats[key] = {
          nationalNumber: login.nationalNumber,
          name: login.name,
          school: login.school || '',
          role: login.role,
          loginCount: 0
        };
      }
      userStats[key].loginCount++;
      // Track last login
      if (!userStats[key].lastLogin || new Date(login.timestamp) > new Date(userStats[key].lastLogin)) {
        userStats[key].lastLogin = login.timestamp;
      }
    });
    
    // Convert to array and sort by login count
    const result = Object.values(userStats)
      .sort((a, b) => b.loginCount - a.loginCount);
    
    res.json({ success: true, data: result });
  } catch (error) {
    console.error('Error getting user reports:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// Export reports as PDF (simplified - returns JSON for now, can be enhanced with PDF library)
app.get('/api/reports/export/pdf', adminAuth, (req, res) => {
  try {
    const visitsData = readVisitsData();
    let loginHistory = visitsData.loginHistory || [];
    
    // Apply date filtering
    const { startDate, endDate } = req.query;
    if (startDate && endDate) {
      loginHistory = filterByDateRange(loginHistory, startDate, endDate);
    }
    
    // For now, return JSON data. In production, use a library like pdfkit or puppeteer to generate actual PDF
    // For simplicity, we'll return a CSV-style response that can be converted client-side
    res.json({ 
      success: true, 
      message: 'PDF export not fully implemented. Please use CSV export.',
      data: {
        startDate,
        endDate,
        totalLogins: loginHistory.length,
        loginHistory: loginHistory.slice(0, 1000) // Limit for response size
      }
    });
  } catch (error) {
    console.error('Error exporting PDF:', error);
    res.status(500).json({ success: false, error: 'Internal server error' });
  }
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Health check: http://0.0.0.0:${PORT}/api/health`);
});
