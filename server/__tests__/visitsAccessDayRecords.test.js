/**
 * Day-record helpers — ticket #14.
 *
 * Pure-function tests for the per-day aggregate helpers added to
 * `server/storage/visitsAccess.js`. No I/O; the helpers mutate the
 * `loginHistory` array passed in.
 *
 * New shape (per ADR-0004):
 *   { nationalNumber, name, school, date, loginCount, pageViews, lastSeenAt }
 */

const {
  findOrCreateDayRecord,
  incrementLoginCount,
  incrementPageViews,
  asiaAmmanDate,
} = require('../storage/visitsAccess');

function freshVisits() {
  return { totalVisits: 0, loginHistory: [] };
}

describe('asiaAmmanDate', () => {
  test('returns YYYY-MM-DD for a Date in Asia/Amman', () => {
    // 2026-04-15 23:30 UTC is 2026-04-16 02:30 in Asia/Amman (+03:00)
    const out = asiaAmmanDate(new Date('2026-04-15T23:30:00Z'));
    expect(out).toBe('2026-04-16');
  });

  test('accepts an ISO string', () => {
    expect(asiaAmmanDate('2026-04-15T23:30:00Z')).toBe('2026-04-16');
  });

  test('default instant is "now"', () => {
    const out = asiaAmmanDate();
    expect(out).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

describe('findOrCreateDayRecord', () => {
  test('creates a new day-record with zeroed counters when none exists', () => {
    const visits = freshVisits();
    const record = findOrCreateDayRecord(visits, {
      nationalNumber: 'A1',
      name: 'Ahmed',
      school: 'Alpha',
      date: '2026-04-15',
    });
    expect(record).toEqual({
      nationalNumber: 'A1',
      name: 'Ahmed',
      school: 'Alpha',
      date: '2026-04-15',
      loginCount: 0,
      pageViews: 0,
      lastSeenAt: null,
    });
    expect(visits.loginHistory).toHaveLength(1);
  });

  test('returns the existing record when (nationalNumber, date) match', () => {
    const visits = freshVisits();
    const first = findOrCreateDayRecord(visits, {
      nationalNumber: 'A1', name: 'Ahmed', school: 'Alpha', date: '2026-04-15',
    });
    first.loginCount = 7;
    const second = findOrCreateDayRecord(visits, {
      nationalNumber: 'A1', name: 'Different', school: 'Beta', date: '2026-04-15',
    });
    expect(second).toBe(first); // same reference
    expect(second.loginCount).toBe(7);
    expect(visits.loginHistory).toHaveLength(1);
  });

  test('creates a second record for the same user on a different date', () => {
    const visits = freshVisits();
    findOrCreateDayRecord(visits, {
      nationalNumber: 'A1', name: 'Ahmed', school: 'Alpha', date: '2026-04-15',
    });
    findOrCreateDayRecord(visits, {
      nationalNumber: 'A1', name: 'Ahmed', school: 'Alpha', date: '2026-04-16',
    });
    expect(visits.loginHistory).toHaveLength(2);
  });

  test('coerces missing name/school to empty strings on first creation', () => {
    const visits = freshVisits();
    const record = findOrCreateDayRecord(visits, {
      nationalNumber: 'A1', date: '2026-04-15',
    });
    expect(record.name).toBe('');
    expect(record.school).toBe('');
  });

  test('initialises loginHistory when the record is missing it', () => {
    const visits = { totalVisits: 0 };
    const record = findOrCreateDayRecord(visits, {
      nationalNumber: 'A1', date: '2026-04-15',
    });
    expect(record).toBeDefined();
    expect(visits.loginHistory).toHaveLength(1);
  });
});

describe('incrementLoginCount', () => {
  test('creates a record on first call and increments loginCount', () => {
    const visits = freshVisits();
    const record = incrementLoginCount(visits, {
      nationalNumber: 'A1', name: 'Ahmed', school: 'Alpha', date: '2026-04-15',
      at: '2026-04-15T08:00:00Z',
    });
    expect(record.loginCount).toBe(1);
    expect(record.lastSeenAt).toBe('2026-04-15T08:00:00Z');
  });

  test('increments loginCount on subsequent calls (same day)', () => {
    const visits = freshVisits();
    const r1 = incrementLoginCount(visits, {
      nationalNumber: 'A1', name: 'A', school: 'S', date: '2026-04-15', at: '2026-04-15T08:00:00Z',
    });
    const r2 = incrementLoginCount(visits, {
      nationalNumber: 'A1', name: 'A', school: 'S', date: '2026-04-15', at: '2026-04-15T10:00:00Z',
    });
    expect(r1).toBe(r2);
    expect(r2.loginCount).toBe(2);
    expect(r2.lastSeenAt).toBe('2026-04-15T10:00:00Z');
  });

  test('does NOT increment pageViews', () => {
    const visits = freshVisits();
    const record = incrementLoginCount(visits, {
      nationalNumber: 'A1', name: 'A', school: 'S', date: '2026-04-15',
    });
    expect(record.pageViews).toBe(0);
  });
});

describe('incrementPageViews', () => {
  test('creates a record on first call and increments pageViews', () => {
    const visits = freshVisits();
    const record = incrementPageViews(visits, {
      nationalNumber: 'A1', name: 'Ahmed', school: 'Alpha', date: '2026-04-15',
      at: '2026-04-15T08:00:00Z',
    });
    expect(record.pageViews).toBe(1);
    expect(record.lastSeenAt).toBe('2026-04-15T08:00:00Z');
  });

  test('increments pageViews on subsequent calls (same day)', () => {
    const visits = freshVisits();
    incrementPageViews(visits, {
      nationalNumber: 'A1', name: 'A', school: 'S', date: '2026-04-15', at: '2026-04-15T08:00:00Z',
    });
    const r2 = incrementPageViews(visits, {
      nationalNumber: 'A1', name: 'A', school: 'S', date: '2026-04-15', at: '2026-04-15T10:00:00Z',
    });
    expect(r2.pageViews).toBe(2);
    expect(r2.lastSeenAt).toBe('2026-04-15T10:00:00Z');
  });

  test('does NOT increment loginCount', () => {
    const visits = freshVisits();
    const record = incrementPageViews(visits, {
      nationalNumber: 'A1', name: 'A', school: 'S', date: '2026-04-15',
    });
    expect(record.loginCount).toBe(0);
  });
});

describe('counters can be incremented independently on the same record', () => {
  test('loginCount and pageViews coexist on the same day-record', () => {
    const visits = freshVisits();
    const args = {
      nationalNumber: 'A1', name: 'A', school: 'S', date: '2026-04-15',
    };
    incrementLoginCount(visits, { ...args, at: '2026-04-15T08:00:00Z' });
    incrementPageViews(visits, { ...args, at: '2026-04-15T08:30:00Z' });
    incrementPageViews(visits, { ...args, at: '2026-04-15T09:00:00Z' });
    incrementLoginCount(visits, { ...args, at: '2026-04-15T10:00:00Z' });
    expect(visits.loginHistory).toHaveLength(1);
    const record = visits.loginHistory[0];
    expect(record.loginCount).toBe(2);
    expect(record.pageViews).toBe(2);
    expect(record.lastSeenAt).toBe('2026-04-15T10:00:00Z');
  });
});
