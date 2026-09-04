/**
 * Tests for the aggregation service (ticket #10).
 *
 * Pure functions over loginHistory. Data-in / data-out — no I/O. These
 * tests pin the legacy shapes so the stats and reports routers can be
 * wired against the same module without re-implementing the math.
 *
 * The loginHistory shape is the legacy per-login events array:
 *   { timestamp, nationalNumber, name, school, role }
 */

const {
  filterByDateRange,
  bySchool,
  byTime,
  userHistory,
  byUser,
} = require('../services/aggregator');

function loginEvent(partial) {
  return {
    timestamp: partial.timestamp,
    nationalNumber: partial.nationalNumber,
    name: partial.name,
    school: partial.school || '',
    role: partial.role || 'parent',
  };
}

describe('aggregator.filterByDateRange', () => {
  test('returns the original array when startDate and endDate are missing', () => {
    const history = [loginEvent({ timestamp: '2026-01-01T10:00:00Z' })];
    expect(filterByDateRange(history)).toBe(history);
  });

  test('returns an empty array when history is not an array', () => {
    expect(filterByDateRange(null)).toEqual([]);
    expect(filterByDateRange(undefined)).toEqual([]);
    expect(filterByDateRange('not-an-array')).toEqual([]);
  });

  test('filters history by inclusive date range', () => {
    const inRange = loginEvent({ timestamp: '2026-03-15T12:00:00Z' });
    const beforeRange = loginEvent({ timestamp: '2026-03-01T00:00:00Z' });
    const afterRange = loginEvent({ timestamp: '2026-03-31T23:59:59Z' });
    const filtered = filterByDateRange(
      [inRange, beforeRange, afterRange],
      '2026-03-15',
      '2026-03-20'
    );
    expect(filtered).toEqual([inRange]);
  });

  test('drops entries without a timestamp', () => {
    const valid = loginEvent({ timestamp: '2026-03-15T12:00:00Z' });
    const filtered = filterByDateRange(
      [valid, { nationalNumber: 'X1' }],
      '2026-03-01',
      '2026-03-31'
    );
    expect(filtered).toEqual([valid]);
  });
});

describe('aggregator.bySchool', () => {
  test('groups visits by school, counts each login as one visit, counts unique users', () => {
    const history = [
      loginEvent({ timestamp: '2026-04-01T08:00:00Z', nationalNumber: 'A1', school: 'Alpha' }),
      loginEvent({ timestamp: '2026-04-01T09:00:00Z', nationalNumber: 'A1', school: 'Alpha' }),
      loginEvent({ timestamp: '2026-04-01T10:00:00Z', nationalNumber: 'B2', school: 'Alpha' }),
      loginEvent({ timestamp: '2026-04-01T11:00:00Z', nationalNumber: 'C3', school: 'Beta' }),
    ];
    const result = bySchool(history);
    // Sorted by visitCount desc; Alpha=3 visits / 2 unique users; Beta=1 / 1
    expect(result).toEqual([
      { school: 'Alpha', visitCount: 3, uniqueUsers: 2 },
      { school: 'Beta', visitCount: 1, uniqueUsers: 1 },
    ]);
  });

  test('coerces missing school to "Unknown School"', () => {
    const history = [
      loginEvent({ timestamp: '2026-04-01T08:00:00Z', nationalNumber: 'A1', school: '' }),
    ];
    const result = bySchool(history);
    expect(result).toEqual([
      { school: 'Unknown School', visitCount: 1, uniqueUsers: 1 },
    ]);
  });

  test('respects startDate / endDate options', () => {
    const history = [
      loginEvent({ timestamp: '2026-03-01T08:00:00Z', nationalNumber: 'A1', school: 'Alpha' }),
      loginEvent({ timestamp: '2026-04-15T08:00:00Z', nationalNumber: 'A1', school: 'Alpha' }),
    ];
    const result = bySchool(history, { startDate: '2026-04-01', endDate: '2026-04-30' });
    expect(result).toEqual([{ school: 'Alpha', visitCount: 1, uniqueUsers: 1 }]);
  });
});
describe('aggregator.byTime', () => {
  test('groups logins by hour-of-day and by day, sorted ascending', () => {
    // Test env runs in Asia/Riyadh (+03:00). We pick timestamps that map
    // to distinct LOCAL hours (11, 16) and distinct LOCAL days (15, 16).
    const history = [
      loginEvent({ timestamp: '2026-04-15T08:30:00Z', nationalNumber: 'A1' }),
      loginEvent({ timestamp: '2026-04-15T08:45:00Z', nationalNumber: 'A2' }),
      loginEvent({ timestamp: '2026-04-15T13:00:00Z', nationalNumber: 'A3' }),
      loginEvent({ timestamp: '2026-04-16T08:00:00Z', nationalNumber: 'A4' }),
    ];
    const result = byTime(history);
    const totalHourly = result.hourly.reduce((s, e) => s + e.count, 0);
    const totalDaily = result.daily.reduce((s, e) => s + e.count, 0);
    expect(totalHourly).toBe(4);
    expect(totalDaily).toBe(4);
    // Two distinct LOCAL hours (11, 16) — 11 gets 3 logins, 16 gets 1.
    expect(result.hourly).toHaveLength(2);
    expect(result.hourly).toEqual([
      { hour: 11, count: 3 },
      { hour: 16, count: 1 },
    ]);
    // Two distinct days.
    expect(result.daily).toHaveLength(2);
    expect(result.daily[0].day).toBe('2026-04-15');
    expect(result.daily[1].day).toBe('2026-04-16');
  });

  test('drops entries without a timestamp', () => {
    const valid = loginEvent({ timestamp: '2026-04-15T08:00:00Z', nationalNumber: 'A1' });
    const result = byTime([valid, { nationalNumber: 'X1' }]);
    const total = result.hourly.reduce((s, e) => s + e.count, 0);
    expect(total).toBe(1);
  });
});

describe('aggregator.userHistory', () => {
  test('groups logins per user with loginCount, lastLogin, recentLogins (5 max, newest first)', () => {
    const baseTs = '2026-04-01T08:00:00Z';
    const history = [
      loginEvent({ timestamp: baseTs, nationalNumber: 'A1', name: 'Ahmed', school: 'Alpha' }),
      loginEvent({ timestamp: '2026-04-02T08:00:00Z', nationalNumber: 'A1', name: 'Ahmed' }),
      loginEvent({ timestamp: '2026-04-03T08:00:00Z', nationalNumber: 'A1', name: 'Ahmed' }),
      loginEvent({ timestamp: '2026-04-04T08:00:00Z', nationalNumber: 'A1', name: 'Ahmed' }),
      loginEvent({ timestamp: '2026-04-05T08:00:00Z', nationalNumber: 'A1', name: 'Ahmed' }),
      loginEvent({ timestamp: '2026-04-06T08:00:00Z', nationalNumber: 'A1', name: 'Ahmed' }),
    ];
    const result = userHistory(history);
    expect(result).toHaveLength(1);
    const user = result[0];
    expect(user.loginCount).toBe(6);
    expect(user.lastLogin).toBe('2026-04-06T08:00:00Z');
    expect(user.recentLogins).toHaveLength(5);
    // Most recent first: timestamps descending.
    expect(user.recentLogins[0].timestamp).toBe('2026-04-06T08:00:00Z');
    expect(user.recentLogins[4].timestamp).toBe('2026-04-02T08:00:00Z');
  });

  test('sorts users by loginCount desc', () => {
    const history = [
      loginEvent({ timestamp: '2026-04-01T08:00:00Z', nationalNumber: 'A1', name: 'Ahmed' }),
      loginEvent({ timestamp: '2026-04-01T08:00:00Z', nationalNumber: 'B2', name: 'Bilal' }),
      loginEvent({ timestamp: '2026-04-01T08:00:00Z', nationalNumber: 'B2', name: 'Bilal' }),
    ];
    const result = userHistory(history);
    expect(result.map((u) => u.nationalNumber)).toEqual(['B2', 'A1']);
  });

  test('returns empty array for empty history', () => {
    expect(userHistory([])).toEqual([]);
  });
});

describe('aggregator.byUser', () => {
  test('groups logins per user with loginCount and lastLogin (most recent timestamp)', () => {
    const history = [
      loginEvent({ timestamp: '2026-04-01T08:00:00Z', nationalNumber: 'A1', name: 'Ahmed', school: 'Alpha' }),
      loginEvent({ timestamp: '2026-04-03T08:00:00Z', nationalNumber: 'A1', name: 'Ahmed' }),
      loginEvent({ timestamp: '2026-04-02T08:00:00Z', nationalNumber: 'A1', name: 'Ahmed' }),
    ];
    const result = byUser(history);
    expect(result).toHaveLength(1);
    expect(result[0].loginCount).toBe(3);
    expect(result[0].lastLogin).toBe('2026-04-03T08:00:00Z');
  });

  test('sorts users by loginCount desc', () => {
    const history = [
      loginEvent({ timestamp: '2026-04-01T08:00:00Z', nationalNumber: 'A1' }),
      loginEvent({ timestamp: '2026-04-01T08:00:00Z', nationalNumber: 'B2' }),
      loginEvent({ timestamp: '2026-04-01T08:00:00Z', nationalNumber: 'B2' }),
    ];
    const result = byUser(history);
    expect(result.map((u) => u.nationalNumber)).toEqual(['B2', 'A1']);
  });
});
