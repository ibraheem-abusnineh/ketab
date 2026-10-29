import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  getJson,
  SchoolsResponse,
  TimeResponse,
  UserHistoryResponse,
  VisitsResponse,
  VisitCountResponse,
} from '../api';
import { AdminNotification, AdminTab } from '../types';
import { Banner, EmptyState, Kpi, Loading, PageHeader, formatDateTime, formatNumber, todayKey } from '../ui';
import LineChart from '../charts/LineChart';
import Sparkline from '../charts/Sparkline';
import Icon from '../Icons';

interface OverviewPageProps {
  onNavigate: (tab: AdminTab) => void;
  notifications: AdminNotification[];
  unreadCount: number;
  pendingCount: number;
  onRefreshInbox: () => Promise<void> | void;
}

const OverviewPage: React.FC<OverviewPageProps> = ({
  onNavigate,
  notifications,
  unreadCount,
  pendingCount,
  onRefreshInbox,
}) => {
  const [totalVisits, setTotalVisits] = useState(0);
  const [schools, setSchools] = useState<SchoolsResponse['data']>([]);
  const [users, setUsers] = useState<UserHistoryResponse['data']>([]);
  const [daily, setDaily] = useState<TimeResponse['data']['daily']>([]);
  const [visits, setVisits] = useState<VisitsResponse['visits']>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchOverview = useCallback(async () => {
    try {
      setLoading(true);
      const [visitData, schoolData, userData, timeData, visitRows] = await Promise.all([
        getJson<VisitCountResponse>('/api/visit-count'),
        getJson<SchoolsResponse>('/api/stats/by-school'),
        getJson<UserHistoryResponse>('/api/stats/user-history'),
        getJson<TimeResponse>('/api/stats/by-time'),
        getJson<VisitsResponse>('/api/stats/visits'),
      ]);
      setTotalVisits(visitData.totalVisits || 0);
      setSchools(schoolData.data || []);
      setUsers(userData.data || []);
      setDaily(timeData.data?.daily || []);
      setVisits(visitRows.visits || []);
      setError('');
    } catch (err: any) {
      setError(err.message || 'Could not read the overview.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOverview();
    const interval = setInterval(fetchOverview, 30000);
    return () => clearInterval(interval);
  }, [fetchOverview]);

  const today = todayKey();
  const todayIndex = daily.findIndex((point) => point.day === today);
  const todayCount = todayIndex >= 0 ? daily[todayIndex].count : 0;
  const yesterdayCount = todayIndex > 0 ? daily[todayIndex - 1].count : 0;
  const delta = yesterdayCount > 0 ? Math.round(((todayCount - yesterdayCount) / yesterdayCount) * 100) : null;

  const last14 = daily.slice(-14).map((point) => ({ label: point.day, value: point.count }));
  const sparkValues = daily.slice(-14).map((point) => point.count);
  const peak = daily.reduce(
    (best, point) => (point.count > best.count ? point : best),
    { day: '', count: 0 }
  );
  const avgPerDay = daily.length > 0 ? Math.round(totalVisits / daily.length) : 0;

  const recent = useMemo(
    () =>
      [...visits]
        .sort((a, b) => {
          const aTime = a.timestamp ? new Date(a.timestamp).getTime() : 0;
          const bTime = b.timestamp ? new Date(b.timestamp).getTime() : 0;
          return bTime - aTime;
        })
        .slice(0, 7),
    [visits]
  );

  const attention = useMemo(
    () =>
      notifications
        .filter(
          (item) =>
            !item.read || (item.type === 'profile_edit_request' && item.status === 'pending')
        )
        .slice(0, 4),
    [notifications]
  );

  if (loading && totalVisits === 0 && daily.length === 0) {
    return <Loading label="Opening the register" />;
  }

  return (
    <div>
      <PageHeader
        title="Today at a glance"
        description="A single page for the health of the platform: logins, schools, people, and the inbox items waiting on you."
        actions={
          <>
            <button type="button" className="btn" onClick={fetchOverview} disabled={loading}>
              <Icon name="refresh" size={14} />
              {loading ? 'Refreshing…' : 'Refresh'}
            </button>
            <button type="button" className="btn btn--primary" onClick={() => onNavigate('reports')}>
              Open reports
            </button>
          </>
        }
      />

      {error && (
        <Banner
          tone="error"
          action={
            <button type="button" className="btn btn--sm" onClick={fetchOverview}>
              Retry
            </button>
          }
        >
          {error}
        </Banner>
      )}

      <div className="overview-hero">
        <section className="hero-logins">
          <div className="hero-logins__top">
            <div>
              <div className="hero-logins__label">Total logins recorded</div>
              <div className="hero-logins__number">{formatNumber(totalVisits)}</div>
              <div className="hero-logins__meta">
                {schools.length} schools · {users.length} active people · since{' '}
                {daily.length > 0 ? daily[0].day : '—'}
              </div>
            </div>
            <div className="admin-live">
              <span className="admin-live__dot" />
              auto-refresh
            </div>
          </div>
          <div className="hero-logins__chart">
            <div className="hero-logins__label" style={{ padding: '0 18px 4px' }}>
              Daily logins · last {last14.length} days
            </div>
            <LineChart data={last14} height={150} valueLabel="logins" />
          </div>
        </section>

        <section className="hero-today">
          <div>
            <div className="hero-today__label">Today</div>
            <div className="hero-today__number">{formatNumber(todayCount)}</div>
            <div className="hero-today__hint">
              {delta === null
                ? 'No comparison for yesterday'
                : `${delta >= 0 ? '+' : ''}${delta}% against yesterday`}
            </div>
          </div>
          <div className="hero-today__divider" />
          <div className="hero-today__row">
            <span>Peak day</span>
            <strong>{peak.day ? `${formatNumber(peak.count)}` : '—'}</strong>
          </div>
          <div className="hero-today__row">
            <span>Average per day</span>
            <strong>{formatNumber(avgPerDay)}</strong>
          </div>
          <div className="hero-today__row">
            <span>Top school</span>
            <strong style={{ fontFamily: 'inherit', fontSize: 11 }}>
              {schools[0]?.school || '—'}
            </strong>
          </div>
        </section>
      </div>

      <div className="kpi-grid">
        <Kpi
          label="Schools with activity"
          value={formatNumber(schools.length)}
          hint={schools[0] ? `Largest: ${schools[0].school}` : 'No school data yet'}
        />
        <Kpi
          label="Active people"
          value={formatNumber(users.length)}
          hint={users[0] ? `Most active: ${users[0].name}` : 'No user activity yet'}
        />
        <Kpi
          label="Average logins / day"
          value={formatNumber(avgPerDay)}
          hint={`Across ${daily.length} recorded days`}
          spark={<Sparkline values={sparkValues} width={108} height={30} />}
        />
        <Kpi
          label="Waiting in the inbox"
          value={formatNumber(unreadCount)}
          hint={`${pendingCount} profile request${pendingCount === 1 ? '' : 's'} pending`}
        />
      </div>

      <div className="overview-split">
        <section className="panel">
          <div className="panel__head">
            <div>
              <h3 className="panel__title">Recent activity</h3>
              <p className="panel__sub">The latest login events recorded across the network.</p>
            </div>
            <button type="button" className="btn btn--sm" onClick={() => onNavigate('history')}>
              Full logbook
            </button>
          </div>
          {recent.length === 0 ? (
            <EmptyState title="No logins recorded" body="Activity will appear here as learners sign in." />
          ) : (
            <div className="activity-list">
              {recent.map((event, index) => (
                <div className="activity-item" key={`${event.nationalNumber}-${index}`}>
                  <span className="activity-item__time">
                    {event.timestamp ? formatDateTime(event.timestamp).split(', ').slice(-1)[0] : '—'}
                  </span>
                  <div>
                    <div className="activity-item__name">{event.name || 'Unknown user'}</div>
                    <span className="activity-item__school">{event.school || 'No school'}</span>
                  </div>
                  <span className="activity-item__mark" />
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="panel">
          <div className="panel__head">
            <div>
              <h3 className="panel__title">Needs attention</h3>
              <p className="panel__sub">Unread updates and profile requests.</p>
            </div>
            <button
              type="button"
              className="btn btn--sm"
              onClick={async () => {
                await onRefreshInbox();
                onNavigate('notifications');
              }}
            >
              Open inbox
            </button>
          </div>
          {attention.length === 0 ? (
            <EmptyState title="Inbox is clear" body="New profile updates and requests will land here." />
          ) : (
            <div className="notif-preview">
              {attention.map((item) => (
                <div className="notif-preview__item" key={item.id}>
                  <div>
                    <div className="notif-preview__name">{item.userName}</div>
                    <div className="notif-preview__body">
                      {item.type === 'profile_edit_request'
                        ? item.status === 'pending'
                          ? 'Requested a profile change'
                          : `Profile request ${item.status}`
                        : `Updated ${item.changes.length} profile field${
                            item.changes.length === 1 ? '' : 's'
                          }`}
                    </div>
                  </div>
                  <div className="notif-preview__time">{formatDateTime(item.timestamp)}</div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>

      <div className="section-rule">
        <span className="section-rule__label">Jump to</span>
        <span className="section-rule__line" />
      </div>

      <div className="quick-actions">
        <button type="button" className="quick-action" onClick={() => onNavigate('statistics')}>
          <Icon name="chart" size={18} />
          <span className="quick-action__title">Statistics</span>
          <span className="quick-action__hint">Traffic and activity patterns</span>
        </button>
        <button type="button" className="quick-action" onClick={() => onNavigate('users')}>
          <Icon name="users" size={18} />
          <span className="quick-action__title">Add or edit a user</span>
          <span className="quick-action__hint">Open the directory register</span>
        </button>
        <button type="button" className="quick-action" onClick={() => onNavigate('requests')}>
          <Icon name="inbox" size={18} />
          <span className="quick-action__title">Review requests</span>
          <span className="quick-action__hint">{pendingCount} waiting for a decision</span>
        </button>
        <button type="button" className="quick-action" onClick={() => onNavigate('courses')}>
          <Icon name="layers" size={18} />
          <span className="quick-action__title">Course access</span>
          <span className="quick-action__hint">Lock or unlock a course</span>
        </button>
      </div>
    </div>
  );
};

export default OverviewPage;
