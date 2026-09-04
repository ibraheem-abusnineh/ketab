/**
 * Aggregation service for stats and reports (ticket #10, ticket #14).
 *
 * Pure functions over the per-day aggregate `loginHistory` array
 * (ADR-0004). Each element is a day-record:
 *   { nationalNumber, name, school, date, loginCount, pageViews, lastSeenAt }
 *
 * The legacy per-event shape (`{ timestamp, nationalNumber, ... }`) is
 * gone — writers (`/api/login`, `/api/login/guest`, `/api/track-visit`)
 * now produce day-records via the helpers in
 * `server/storage/visitsAccess.js` (`incrementLoginCount`,
 * `incrementPageViews`). The old readers that wanted a "list of events"
 * synthesise per-event records from the day-record on the way out
 * (decision 2 in ticket #14 brief: one synthetic event per `loginCount`
 * per day, timestamped at `lastSeenAt`).
 *
 * Four entry points mirror the legacy route handlers in server/index.js:
 *
 *   - bySchool(history, options)
 *     Returns `[{ school, visitCount, uniqueUsers, pageViews }, …]`.
 *     `visitCount` = sum(loginCount) per school — the "visits as a
 *     count of logins" interpretation (decision 4). `pageViews` = sum
 *     of `pageViews` per school. `uniqueUsers` = distinct nationalNumbers.
 *     The /api/stats/by-school endpoint exposes `visitCount`; /api/reports/by-school
 *     exposes `loginCount` (= visitCount). The router renames when needed.
 *
 *   - byTime(history, options)
 *     Returns `{ hourly: [{hour, count}], daily: [{day, count}] }`.
 *     Asia/Amman is the project's display timezone.
 *
 *   - userHistory(history, options)
 *     Returns per-user aggregates with `loginCount` and `lastLogin`.
 *     `recentLogins` is intentionally dropped (decision 3): the per-day
 *     aggregate loses the per-event timestamp list, and synthesising
 *     fake timestamps is dishonest.
 *
 *   - byUser(history, options)
 *     Same as userHistory minus the dropped field. Used by /api/reports/by-user.
 *
 * `filterByDateRange` filters by the day-record `date` field (calendar
 * day, YYYY-MM-DD) instead of the legacy per-event `timestamp`.
 *
 * Pure functions — no I/O — testable in isolation.
 *
 * ADR-0004 (loginHistory grain).
 */

const DISPLAY_TIMEZONE = 'Asia/Amman';

/**
 * Filter `loginHistory` (an array of day-records) by date range. The
 * date range is matched against each record's `date` field (calendar
 * day in `YYYY-MM-DD`). Returns the original array (a shallow copy when
 * filtered) when start/end are missing — matches the legacy
 * filterByDateRange() in server/index.js.
 */
function filterByDateRange(loginHistory, startDate, endDate) {
  if (!Array.isArray(loginHistory)) return [];
  if (!startDate || !endDate) {
    return loginHistory;
  }
  return loginHistory.filter((record) => {
    if (!record || !record.date) return false;
    return record.date >= startDate && record.date <= endDate;
  });
}

/**
 * Group day-records by school. Returns an array sorted by visitCount
 * desc. Each entry: `{ school, visitCount, uniqueUsers, pageViews }`.
 *
 * visitCount = sum(loginCount) per school (decision 4).
 * pageViews = sum(pageViews) per school.
 * uniqueUsers = distinct nationalNumbers seen at this school.
 */
function bySchool(loginHistory, options = {}) {
  const filtered = filterByDateRange(loginHistory, options.startDate, options.endDate);
  const schoolStats = {};
  filtered.forEach((record) => {
    const school = record.school || 'Unknown School';
    if (!schoolStats[school]) {
      schoolStats[school] = {
        count: 0,
        pageViews: 0,
        users: new Set(),
      };
    }
    schoolStats[school].count += Number(record.loginCount) || 0;
    schoolStats[school].pageViews += Number(record.pageViews) || 0;
    if (record.nationalNumber) {
      schoolStats[school].users.add(record.nationalNumber);
    }
  });
  return Object.entries(schoolStats)
    .map(([school, data]) => ({
      school,
      visitCount: data.count,
      uniqueUsers: data.users.size,
      pageViews: data.pageViews,
    }))
    .sort((a, b) => b.visitCount - a.visitCount);
}

/**
 * Group day-records by hour-of-day and by day. Uses Asia/Amman for the
 * display timezone (legacy behaviour). The hour is extracted from
 * `lastSeenAt` (the most recent touch on that day-record). The daily
 * bucket uses the row's `date` field directly (it's already a calendar
 * day).
 */
function byTime(loginHistory, options = {}) {
  const filtered = filterByDateRange(loginHistory, options.startDate, options.endDate);
  const hourlyStats = {};
  const dailyStats = {};

  filtered.forEach((record) => {
    if (!record || !record.date) return;
    const day = record.date;
    if (!dailyStats[day]) dailyStats[day] = 0;
    dailyStats[day] += 1;

    if (!record.lastSeenAt) return;
    const instant = new Date(record.lastSeenAt);
    if (isNaN(instant)) return;
    const hour = instant.getHours();
    if (!hourlyStats[hour]) hourlyStats[hour] = 0;
    hourlyStats[hour] += 1;
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
 * - loginCount = sum of record.loginCount across the user's day-records
 * - lastLogin  = most recent record.lastSeenAt across the user's day-records
 *
 * `recentLogins` is dropped (ticket #14 decision 3): the per-day
 * aggregate loses the per-event timestamp list. The dashboard can
 * re-derive a list from `lastLogin` per day-record if needed.
 */
function userHistory(loginHistory, options = {}) {
  const filtered = filterByDateRange(loginHistory, options.startDate, options.endDate);
  const userStats = {};

  filtered.forEach((record) => {
    if (!record || !record.nationalNumber) return;
    const key = record.nationalNumber;
    if (!userStats[key]) {
      userStats[key] = {
        nationalNumber: record.nationalNumber,
        name: record.name,
        school: record.school || '',
        loginCount: 0,
      };
    }
    userStats[key].loginCount += Number(record.loginCount) || 0;
    if (
      !userStats[key].lastLogin ||
      (record.lastSeenAt && new Date(record.lastSeenAt) > new Date(userStats[key].lastLogin))
    ) {
      userStats[key].lastLogin = record.lastSeenAt || null;
    }
  });

  return Object.values(userStats).sort((a, b) => b.loginCount - a.loginCount);
}

/**
 * Per-user report. Mirrors /api/reports/by-user: loginCount and lastLogin.
 */
function byUser(loginHistory, options = {}) {
  // byUser and userHistory share the same math in the new shape; the
  // legacy split (one with recentLogins, one without) collapses.
  return userHistory(loginHistory, options);
}

module.exports = {
  filterByDateRange,
  bySchool,
  byTime,
  userHistory,
  byUser,
  DISPLAY_TIMEZONE,
};
