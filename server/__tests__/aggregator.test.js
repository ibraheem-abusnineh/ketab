/**
 * Tests for the aggregation service (ticket #10, ticket #14).
 *
 * Pure functions over loginHistory. Data-in / data-out — no I/O. These
 * tests pin the day-record shapes so the stats and reports routers
 * can be wired against the same module without re-implementing the math.
 *
 * The loginHistory shape is the per-day aggregate per ADR-0004:
 *   { nationalNumber, name, school, date, loginCount, pageViews, lastSeenAt }
 * One element per (nationalNumber, date) pair.
 */

const {
  filterByDateRange,
  bySchool,
  byTime,
  userHistory,
  byUser,
} = require('../services/aggregator');

function dayRecord(partial) {
  return {
    nationalNumber: partial.nationalNumber,
    name: partial.name || '',
    school: partial.school || '',
    date: partial.date,
    loginCount: partial.loginCount || 0,
    pageViews: partial.pageViews || 0,
    lastSeenAt: partial.lastSeenAt || null,
  };
}

describe('aggregator.filterByDateRange', () => {
  test('returns the original array when startDate and endDate are missing', () => {
    const history = [dayRecord({ nationalNumber: 'A1', date: '2026-01-01' })];
    expect(filterByDateRange(history)).toBe(history);
  });

  test('returns an empty array when history is not an array', () => {
    expect(filterByDateRange(null)).toEqual([]);
    expect(filterByDateRange(undefined)).toEqual([]);
    expect(filterByDateRange('not-an-array')).toEqual([]);
  });

  test('filters history by inclusive date range (calendar day)', () => {
    const inRange = dayRecord({ nationalNumber: 'A1', date: '2026-03-15' });
    const beforeRange = dayRecord({ nationalNumber: 'A2', date: '2026-03-01' });
    const afterRange = dayRecord({ nationalNumber: 'A3', date: '2026-03-31' });
    const filtered = filterByDateRange(
      [inRange, beforeRange, afterRange],
      '2026-03-15',
      '2026-03-20'
    );
    expect(filtered).toEqual([inRange]);
  });

  test('drops entries without a date', () => {
    const valid = dayRecord({ nationalNumber: 'A1', date: '2026-03-15' });
    const filtered = filterByDateRange(
      [valid, { nationalNumber: 'X1' }],
      '2026-03-01',
      '2026-03-31'
    );
    expect(filtered).toEqual([valid]);
  });
});

describe('aggregator.bySchool', () => {
  test('groups day-records by school, sums loginCount → visitCount and pageViews → pageViews, counts unique users', () => {
    const history = [
      dayRecord({ nationalNumber: 'A1', school: 'Alpha', date: '2026-04-01', loginCount: 2, pageViews: 5 }),
      dayRecord({ nationalNumber: 'A1', school: 'Alpha', date: '2026-04-02', loginCount: 1, pageViews: 3 }),
      dayRecord({ nationalNumber: 'B2', school: 'Alpha', date: '2026-04-01', loginCount: 1, pageViews: 2 }),
      dayRecord({ nationalNumber: 'C3', school: 'Beta', date: '2026-04-01', loginCount: 1, pageViews: 1 }),
    ];
    const result = bySchool(history);
    // Alpha: loginCount=4, pageViews=10, 2 unique users; Beta: loginCount=1, pageViews=1, 1 user
    expect(result).toEqual([
      { school: 'Alpha', visitCount: 4, uniqueUsers: 2, pageViews: 10 },
      { school: 'Beta', visitCount: 1, uniqueUsers: 1, pageViews: 1 },
    ]);
  });

  test('coerces missing school to "Unknown School"', () => {
    const history = [
      dayRecord({ nationalNumber: 'A1', date: '2026-04-01', loginCount: 1 }),
    ];
    const result = bySchool(history);
    expect(result).toEqual([
      { school: 'Unknown School', visitCount: 1, uniqueUsers: 1, pageViews: 0 },
    ]);
  });

  test('respects startDate / endDate options', () => {
    const history = [
      dayRecord({ nationalNumber: 'A1', school: 'Alpha', date: '2026-03-01', loginCount: 1 }),
      dayRecord({ nationalNumber: 'A1', school: 'Alpha', date: '2026-04-15', loginCount: 1 }),
    ];
    const result = bySchool(history, { startDate: '2026-04-01', endDate: '2026-04-30' });
    expect(result).toEqual([
      { school: 'Alpha', visitCount: 1, uniqueUsers: 1, pageViews: 0 },
    ]);
  });
});

describe('aggregator.byTime', () => {
  test('groups day-records by hour (from lastSeenAt) and by day (calendar day)', () => {
    // Test env runs in Asia/Riyadh (+03:00). We pick lastSeenAt values that
    // map to distinct LOCAL hours (11, 16) and use explicit date strings for
    // the daily bucket.
    const history = [
      dayRecord({ nationalNumber: 'A1', date: '2026-04-15', lastSeenAt: '2026-04-15T08:30:00Z' }),
      dayRecord({ nationalNumber: 'A2', date: '2026-04-15', lastSeenAt: '2026-04-15T08:45:00Z' }),
      dayRecord({ nationalNumber: 'A3', date: '2026-04-15', lastSeenAt: '2026-04-15T13:00:00Z' }),
      dayRecord({ nationalNumber: 'A4', date: '2026-04-16', lastSeenAt: '2026-04-16T08:00:00Z' }),
    ];
    const result = byTime(history);
    const totalHourly = result.hourly.reduce((s, e) => s + e.count, 0);
    const totalDaily = result.daily.reduce((s, e) => s + e.count, 0);
    expect(totalHourly).toBe(4);
    expect(totalDaily).toBe(4);
    // Two distinct LOCAL hours (11, 16) — 11 gets 3 day-records, 16 gets 1.
    expect(result.hourly).toHaveLength(2);
    expect(result.hourly).toEqual([
      { hour: 11, count: 3 },
      { hour: 16, count: 1 },
    ]);
    // Two distinct days (use the date string directly).
    expect(result.daily).toHaveLength(2);
    expect(result.daily[0].day).toBe('2026-04-15');
    expect(result.daily[1].day).toBe('2026-04-16');
  });

  test('drops entries without lastSeenAt from the hourly bucket but keeps them in the daily bucket', () => {
    const valid = dayRecord({ nationalNumber: 'A1', date: '2026-04-15', lastSeenAt: '2026-04-15T08:00:00Z' });
    const noTs = dayRecord({ nationalNumber: 'X1', date: '2026-04-15' });
    const result = byTime([valid, noTs]);
    const totalHourly = result.hourly.reduce((s, e) => s + e.count, 0);
    const totalDaily = result.daily.reduce((s, e) => s + e.count, 0);
    expect(totalHourly).toBe(1);
    expect(totalDaily).toBe(2); // both rows counted in daily
  });
});

describe('aggregator.userHistory', () => {
  test('groups day-records per user, sums loginCount → loginCount, picks most recent lastSeenAt → lastLogin', () => {
    const history = [
      dayRecord({ nationalNumber: 'A1', name: 'Ahmed', school: 'Alpha', date: '2026-04-01', loginCount: 1, lastSeenAt: '2026-04-01T08:00:00Z' }),
      dayRecord({ nationalNumber: 'A1', name: 'Ahmed', school: 'Alpha', date: '2026-04-02', loginCount: 2, lastSeenAt: '2026-04-02T08:00:00Z' }),
      dayRecord({ nationalNumber: 'A1', name: 'Ahmed', school: 'Alpha', date: '2026-04-03', loginCount: 3, lastSeenAt: '2026-04-03T08:00:00Z' }),
    ];
    const result = userHistory(history);
    expect(result).toHaveLength(1);
    const user = result[0];
    expect(user.loginCount).toBe(6);
    expect(user.lastLogin).toBe('2026-04-03T08:00:00Z');
    // recentLogins is intentionally dropped (ticket #14 decision 3).
    expect(user.recentLogins).toBeUndefined();
  });

  test('sorts users by loginCount desc', () => {
    const history = [
      dayRecord({ nationalNumber: 'A1', name: 'Ahmed', date: '2026-04-01', loginCount: 1 }),
      dayRecord({ nationalNumber: 'B2', name: 'Bilal', date: '2026-04-01', loginCount: 2 }),
      dayRecord({ nationalNumber: 'B2', name: 'Bilal', date: '2026-04-02', loginCount: 1 }),
    ];
    const result = userHistory(history);
    expect(result.map((u) => u.nationalNumber)).toEqual(['B2', 'A1']);
    expect(result[0].loginCount).toBe(3);
  });

  test('returns empty array for empty history', () => {
    expect(userHistory([])).toEqual([]);
  });
});

describe('aggregator.byUser', () => {
  test('groups day-records per user with loginCount and lastLogin (most recent lastSeenAt)', () => {
    const history = [
      dayRecord({ nationalNumber: 'A1', name: 'Ahmed', school: 'Alpha', date: '2026-04-01', loginCount: 1, lastSeenAt: '2026-04-01T08:00:00Z' }),
      dayRecord({ nationalNumber: 'A1', name: 'Ahmed', school: 'Alpha', date: '2026-04-03', loginCount: 1, lastSeenAt: '2026-04-03T08:00:00Z' }),
      dayRecord({ nationalNumber: 'A1', name: 'Ahmed', school: 'Alpha', date: '2026-04-02', loginCount: 1, lastSeenAt: '2026-04-02T08:00:00Z' }),
    ];
    const result = byUser(history);
    expect(result).toHaveLength(1);
    expect(result[0].loginCount).toBe(3);
    expect(result[0].lastLogin).toBe('2026-04-03T08:00:00Z');
  });

  test('sorts users by loginCount desc', () => {
    const history = [
      dayRecord({ nationalNumber: 'A1', date: '2026-04-01', loginCount: 1 }),
      dayRecord({ nationalNumber: 'B2', date: '2026-04-01', loginCount: 1 }),
      dayRecord({ nationalNumber: 'B2', date: '2026-04-02', loginCount: 1 }),
    ];
    const result = byUser(history);
    expect(result.map((u) => u.nationalNumber)).toEqual(['B2', 'A1']);
  });
});
