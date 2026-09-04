/**
 * Aggregation service for stats and reports (ticket #10).
 *
 * Pure functions over the legacy `loginHistory` array (per-login events
 * with `timestamp`, `nationalNumber`, `name`, `school`, `role`). The
 * shape is unchanged — the per-day aggregate migration lives in #14.
 *
 * Four entry points mirror the legacy route handlers in server/index.js:
 *
 *   - bySchool(history, options)
 *     Returns `[{ school, visitCount, uniqueUsers }, …]`. The /api/stats/by-school
 *     endpoint uses field name `visitCount`; /api/reports/by-school uses
 *     `loginCount`. The router calls `.renameField()` when needed.
 *
 *   - byTime(history, options)
 *     Returns `{ hourly: [{hour, count}], daily: [{day, count}] }`.
 *     Asia/Amman is the project's display timezone (server/index.js:876-877).
 *
 *   - userHistory(history, options)
 *     Returns per-user aggregates with `recentLogins` and `lastLogin`.
 *
 *   - byUser(history, options)
 *     Returns per-user aggregates with `loginCount` and `lastLogin`.
 *
 * `filterByDateRange` is shared by all four. Pure function with no I/O —
 * testable in isolation.
 */

const DISPLAY_TIMEZONE = 'Asia/Amman';

/**
 * Filter `loginHistory` (an array) by ISO date range. Returns the original
 * array (a shallow copy when filtered) when start/end are missing — matches
 * the legacy filterByDateRange() in server/index.js.
 */
function filterByDateRange(loginHistory, startDate, endDate) {
  if (!Array.isArray(loginHistory)) return [];
  if (!startDate || !endDate) {
    return loginHistory;
  }
  const start = new Date(startDate);
  const end = new Date(endDate);
  return loginHistory.filter((login) => {
    if (!login || !login.timestamp) return false;
    const loginDate = new Date(login.timestamp);
    return loginDate >= start && loginDate <= end;
  });
}

/**
 * Group logins by school. Returns an array sorted by visitCount desc.
 */
function bySchool(loginHistory, options = {}) {
  const filtered = filterByDateRange(loginHistory, options.startDate, options.endDate);
  const schoolStats = {};
  filtered.forEach((login) => {
    const school = login.school || 'Unknown School';
    if (!schoolStats[school]) {
      schoolStats[school] = { count: 0, users: new Set() };
    }
    schoolStats[school].count += 1;
    schoolStats[school].users.add(login.nationalNumber);
  });
  return Object.entries(schoolStats)
    .map(([school, data]) => ({
      school,
      visitCount: data.count,
      uniqueUsers: data.users.size,
    }))
    .sort((a, b) => b.visitCount - a.visitCount);
}

/**
 * Group logins by hour and by day. Uses the Asia/Amman timezone for the
 * "day" bucket to match the legacy handler (server/index.js:808 uses ISO
 * day; the user-history uses Asia/Amman display. Day bucket here uses
 * the date in Asia/Amman for consistency with the dashboard).
 */
function byTime(loginHistory, options = {}) {
  const filtered = filterByDateRange(loginHistory, options.startDate, options.endDate);
  const hourlyStats = {};
  const dailyStats = {};

  filtered.forEach((login) => {
    if (!login || !login.timestamp) return;
    const date = new Date(login.timestamp);
    const hour = date.getHours();
    const day = date.toLocaleDateString('en-CA', { timeZone: DISPLAY_TIMEZONE }); // YYYY-MM-DD

    if (!hourlyStats[hour]) hourlyStats[hour] = 0;
    hourlyStats[hour] += 1;

    if (!dailyStats[day]) dailyStats[day] = 0;
    dailyStats[day] += 1;
  });

  const hourly = Object.entries(hourlyStats)
    .map(([hour, count]) => ({ hour: parseInt(hour, 10), count }))
    .sort((a, b) => a.hour - b.hour);

  const daily = Object.entries(dailyStats)
    .map(([day, count]) => ({ day, count }))
    .sort((a, b) => a.day.localeCompare(b.day));

  return { hourly, daily };
}

/**
 * Per-user login history. Mirrors the legacy /api/stats/user-history:
 * - loginCount, logins[], lastLogin, recentLogins (last 5, newest first).
 */
function userHistory(loginHistory, options = {}) {
  const filtered = filterByDateRange(loginHistory, options.startDate, options.endDate);
  const userStats = {};

  filtered.forEach((login) => {
    if (!login || !login.nationalNumber) return;
    const key = login.nationalNumber;
    if (!userStats[key]) {
      userStats[key] = {
        nationalNumber: login.nationalNumber,
        name: login.name,
        school: login.school || '',
        role: login.role,
        loginCount: 0,
        logins: [],
      };
    }
    userStats[key].loginCount += 1;
    userStats[key].logins.push({
      timestamp: login.timestamp,
      date: new Date(login.timestamp).toLocaleDateString('en-US', { timeZone: DISPLAY_TIMEZONE }),
      time: new Date(login.timestamp).toLocaleTimeString('en-US', { timeZone: DISPLAY_TIMEZONE }),
    });
  });

  return Object.values(userStats)
    .map((user) => ({
      ...user,
      lastLogin: user.logins.length > 0 ? user.logins[user.logins.length - 1].timestamp : null,
      recentLogins: user.logins.slice(-5).reverse(),
    }))
    .sort((a, b) => b.loginCount - a.loginCount);
}

/**
 * Per-user report. Mirrors /api/reports/by-user: loginCount and lastLogin.
 */
function byUser(loginHistory, options = {}) {
  const filtered = filterByDateRange(loginHistory, options.startDate, options.endDate);
  const userStats = {};

  filtered.forEach((login) => {
    if (!login || !login.nationalNumber) return;
    const key = login.nationalNumber;
    if (!userStats[key]) {
      userStats[key] = {
        nationalNumber: login.nationalNumber,
        name: login.name,
        school: login.school || '',
        role: login.role,
        loginCount: 0,
      };
    }
    userStats[key].loginCount += 1;
    if (
      !userStats[key].lastLogin ||
      new Date(login.timestamp) > new Date(userStats[key].lastLogin)
    ) {
      userStats[key].lastLogin = login.timestamp;
    }
  });

  return Object.values(userStats).sort((a, b) => b.loginCount - a.loginCount);
}

module.exports = {
  filterByDateRange,
  bySchool,
  byTime,
  userHistory,
  byUser,
  DISPLAY_TIMEZONE,
};
