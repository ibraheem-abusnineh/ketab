import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { apiFetch } from '../../../utils/api';
import {
  buildQuery,
  getJson,
  SchoolsResponse,
  TimeResponse,
  UserHistoryResponse,
  UsersResponse,
  VisitsResponse,
  VisitCountResponse,
} from '../api';
import { DailyPoint, HourlyPoint, SchoolStat, UserHistoryRow, VisitEvent } from '../types';
import {
  Banner,
  Kpi,
  Loading,
  PageHeader,
  formatDateTime,
  formatNumber,
  roleLabel,
} from '../ui';
import ChartFrame from '../charts/ChartFrame';
import LineChart from '../charts/LineChart';
import ColumnChart from '../charts/ColumnChart';
import BarChart from '../charts/BarChart';
import DonutChart from '../charts/DonutChart';
import Heatmap from '../charts/Heatmap';
import Sparkline from '../charts/Sparkline';
import Icon from '../Icons';

type PeriodType = 'all' | 'day' | 'week' | 'month' | 'custom';

const PERIODS: Array<{ id: PeriodType; label: string }> = [
  { id: 'all', label: 'All time' },
  { id: 'day', label: 'Today' },
  { id: 'week', label: 'Last 7 days' },
  { id: 'month', label: 'Last 30 days' },
  { id: 'custom', label: 'Custom range' },
];

function toDayString(date: Date): string {
  const year = date.getFullYear();
  const month = `${date.getMonth() + 1}`.padStart(2, '0');
  const day = `${date.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function rangeFor(period: PeriodType, customStart: string, customEnd: string) {
  const now = new Date();
  if (period === 'all') return null;
  if (period === 'custom') {
    if (!customStart || !customEnd) return null;
    return { startDate: customStart, endDate: customEnd };
  }
  if (period === 'day') {
    return { startDate: toDayString(now), endDate: toDayString(now) };
  }
  const start = new Date(now);
  start.setDate(now.getDate() - (period === 'week' ? 7 : 30));
  return { startDate: toDayString(start), endDate: toDayString(now) };
}

const StatisticsPage: React.FC = () => {
  const [period, setPeriod] = useState<PeriodType>('all');
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');
  const [totalVisits, setTotalVisits] = useState(0);
  const [filteredCount, setFilteredCount] = useState(0);
  const [schools, setSchools] = useState<SchoolStat[]>([]);
  const [userHistory, setUserHistory] = useState<UserHistoryRow[]>([]);
  const [daily, setDaily] = useState<DailyPoint[]>([]);
  const [hourly, setHourly] = useState<HourlyPoint[]>([]);
  const [visits, setVisits] = useState<VisitEvent[]>([]);
  const [directory, setDirectory] = useState<UsersResponse['users']>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [resetOpen, setResetOpen] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [resetMessage, setResetMessage] = useState<{ tone: 'success' | 'error'; text: string } | null>(null);

  const fetchStatistics = useCallback(async () => {
    try {
      setLoading(true);
      const range = rangeFor(period, customStart, customEnd);
      const query = buildQuery({
        startDate: range?.startDate,
        endDate: range?.endDate,
      });

      const [visitData, schoolData, userData, timeData, visitRows, directoryData] = await Promise.all([
        getJson<VisitCountResponse>('/api/visit-count'),
        getJson<SchoolsResponse>(`/api/stats/by-school${query}`),
        getJson<UserHistoryResponse>(`/api/stats/user-history${query}`),
        getJson<TimeResponse>(`/api/stats/by-time${query}`),
        getJson<VisitsResponse>(`/api/stats/visits${query}`),
        getJson<UsersResponse>('/api/users'),
      ]);

      setTotalVisits(visitData.totalVisits || 0);
      setSchools(schoolData.data || []);
      setUserHistory(userData.data || []);
      setDaily(timeData.data?.daily || []);
      setHourly(timeData.data?.hourly || []);
      setVisits(visitRows.visits || []);
      setFilteredCount(range ? visitRows.count || visitRows.visits.length : visitData.totalVisits || 0);
      setDirectory(directoryData.users || []);
      setError('');
    } catch (err: any) {
      setError(err.message || 'Could not read statistics.');
    } finally {
      setLoading(false);
    }
  }, [period, customStart, customEnd]);

  useEffect(() => {
    fetchStatistics();
    const interval = setInterval(fetchStatistics, 25000);
    return () => clearInterval(interval);
  }, [fetchStatistics]);

  const avgPerDay = daily.length > 0 ? Math.round(filteredCount / daily.length) : 0;
  const lineData = daily.map((point) => ({ label: point.day, value: point.count }));
  const sparkValues = daily.slice(-14).map((point) => point.count);

  const fullDay = useMemo(() => {
    const counts = new Map<number, number>();
    hourly.forEach((point) => counts.set(point.hour, point.count));
    return Array.from({ length: 24 }, (_, hour) => ({
      label: `${hour}`.padStart(2, '0'),
      value: counts.get(hour) || 0,
    }));
  }, [hourly]);

  const roleCounts = useMemo(() => {
    const counts = new Map<string, number>();
    directory.forEach((user) => counts.set(user.role, (counts.get(user.role) || 0) + 1));
    return Array.from(counts.entries())
      .map(([role, value]) => ({ label: roleLabel(role), value }))
      .sort((a, b) => b.value - a.value);
  }, [directory]);

  const recent = useMemo(
    () =>
      [...visits]
        .sort((a, b) => {
          const aTime = a.timestamp ? new Date(a.timestamp).getTime() : 0;
          const bTime = b.timestamp ? new Date(b.timestamp).getTime() : 0;
          return bTime - aTime;
        })
        .slice(0, 8),
    [visits]
  );

  const periodLabel =
    PERIODS.find((item) => item.id === period)?.label || 'All time';

  const handleReset = async () => {
    try {
      setResetting(true);
      const response = await apiFetch('/api/admin/reset-visits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirmed: true }),
      });
      const data = await response.json();
      setResetMessage({ tone: 'success', text: data.message || 'Visit data reset.' });
      setResetOpen(false);
      await fetchStatistics();
      setTimeout(() => setResetMessage(null), 5000);
    } catch (err: any) {
      setResetMessage({ tone: 'error', text: err.message || 'Could not reset the counter.' });
    } finally {
      setResetting(false);
    }
  };

  if (loading && totalVisits === 0 && daily.length === 0) {
    return <Loading label="Counting the logins" />;
  }

  return (
    <div>
      <PageHeader
        title="Statistics"
        description="Traffic, schools, and the hours people actually use. Every chart follows the period you pick."
        actions={
          <button type="button" className="btn" onClick={fetchStatistics} disabled={loading}>
            <Icon name="refresh" size={14} />
            {loading ? 'Refreshing…' : 'Refresh'}
          </button>
        }
      />

      {error && (
        <Banner
          tone="error"
          action={
            <button type="button" className="btn btn--sm" onClick={fetchStatistics}>
              Retry
            </button>
          }
        >
          {error}
        </Banner>
      )}

      {resetMessage && <Banner tone={resetMessage.tone}>{resetMessage.text}</Banner>}

      <div className="period-bar">
        <span className="period-bar__label">Period</span>
        <div className="chip-row">
          {PERIODS.map((item) => (
            <button
              type="button"
              key={item.id}
              className={`chip ${period === item.id ? 'active' : ''}`}
              onClick={() => setPeriod(item.id)}
            >
              {item.label}
            </button>
          ))}
        </div>
        {period === 'custom' && (
          <div className="date-pair">
            <input
              className="input"
              type="date"
              value={customStart}
              onChange={(event) => setCustomStart(event.target.value)}
              aria-label="Start date"
            />
            <span className="date-pair__sep">to</span>
            <input
              className="input"
              type="date"
              value={customEnd}
              onChange={(event) => setCustomEnd(event.target.value)}
              aria-label="End date"
            />
          </div>
        )}
        <span className="period-bar__spacer" />
        <span className="report-note">
          {period === 'all' ? `${daily.length} recorded days` : `Showing ${periodLabel.toLowerCase()}`}
        </span>
      </div>

      <div className="kpi-grid">
        <Kpi
          label={`Logins · ${periodLabel}`}
          value={formatNumber(filteredCount)}
          hint={`${formatNumber(totalVisits)} all time`}
        />
        <Kpi
          label="Schools in range"
          value={formatNumber(schools.length)}
          hint={schools[0] ? `Top: ${schools[0].school}` : 'No school activity'}
        />
        <Kpi
          label="Active people"
          value={formatNumber(userHistory.length)}
          hint={userHistory[0] ? `Most active: ${userHistory[0].name}` : 'No activity'}
        />
        <Kpi
          label="Average logins / day"
          value={formatNumber(avgPerDay)}
          hint={`Across ${daily.length} days`}
          spark={<Sparkline values={sparkValues} width={106} height={30} />}
        />
      </div>

      <div className="chart-grid">
        <ChartFrame
          className="a-col-8"
          title="Daily logins"
          subtitle="Every calendar day in the selected period"
        >
          <LineChart data={lineData} height={250} valueLabel="logins" />
        </ChartFrame>

        <ChartFrame
          className="a-col-4"
          title="School share"
          subtitle="Percentage of all logins in range"
        >
          <DonutChart
            data={schools.slice(0, 8).map((school) => ({
              label: school.school,
              value: school.visitCount,
            }))}
            centerLabel="logins"
            valueLabel="logins"
          />
        </ChartFrame>

        <ChartFrame
          className="a-col-5"
          title="Activity by hour"
          subtitle="When the platform is busiest"
        >
          <ColumnChart data={fullDay} height={220} valueLabel="logins" />
        </ChartFrame>

        <ChartFrame
          className="a-col-7"
          title="Schools ranked"
          subtitle="Logins per school, largest first"
        >
          <BarChart
            data={schools.slice(0, 9).map((school) => ({
              label: school.school || 'Unknown',
              value: school.visitCount,
              meta: `${school.uniqueUsers} unique users`,
            }))}
            valueLabel="logins"
          />
        </ChartFrame>

        <ChartFrame
          className="a-col-7"
          title="Weekly rhythm"
          subtitle="A calendar view of daily login volume"
        >
          <Heatmap data={daily} />
        </ChartFrame>

        <ChartFrame
          className="a-col-5"
          title="Users by role"
          subtitle={`The full directory · ${formatNumber(directory.length)} accounts`}
        >
          <BarChart data={roleCounts} valueLabel="accounts" highlightTop={false} />
        </ChartFrame>

        <ChartFrame
          className="a-col-6"
          title="Most active people"
          subtitle="Top users by logins in range"
        >
          <BarChart
            data={userHistory.slice(0, 10).map((user) => ({
              label: user.name || 'Unknown',
              value: user.loginCount,
              meta: user.school || 'No school',
            }))}
            valueLabel="logins"
          />
        </ChartFrame>

        <ChartFrame
          className="a-col-6"
          title="Recent visits"
          subtitle="The latest login events, newest first"
        >
          {recent.length === 0 ? (
            <div className="chart-empty">No visits in this period</div>
          ) : (
            <div className="table-wrap" style={{ border: 0 }}>
              <table className="ledger">
                <thead>
                  <tr>
                    <th>When</th>
                    <th>Person</th>
                    <th>School</th>
                  </tr>
                </thead>
                <tbody>
                  {recent.map((event, index) => (
                    <tr key={`${event.nationalNumber}-${index}`}>
                      <td className="num">{formatDateTime(event.timestamp)}</td>
                      <td>{event.name || 'Unknown'}</td>
                      <td className="muted">{event.school || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </ChartFrame>
      </div>

      <div className="section-rule">
        <span className="section-rule__label">Maintenance</span>
        <span className="section-rule__line" />
      </div>

      <div className="danger-zone">
        <div>
          <div className="danger-zone__title">Reset the visit counter</div>
          <div className="danger-zone__body">
            Clears every recorded login and the all-time counter. This cannot be undone.
          </div>
        </div>
        <button type="button" className="btn btn--danger" onClick={() => setResetOpen(true)} disabled={resetting}>
          {resetting ? 'Resetting…' : 'Reset visit data'}
        </button>
      </div>

      {resetOpen && (
        <div className="modal-backdrop" onClick={() => setResetOpen(false)}>
          <div className="modal-card" onClick={(event) => event.stopPropagation()}>
            <div className="modal-card__head">
              <h3>Reset visit data</h3>
              <button type="button" className="modal-close" onClick={() => setResetOpen(false)} aria-label="Close">
                ×
              </button>
            </div>
            <div className="modal-card__body">
              <p style={{ margin: 0, fontSize: 13, lineHeight: 1.6 }}>
                This clears the visit counter and every login record. Schools, users, and courses are not
                affected.
              </p>
              <div className="banner banner--error" style={{ marginTop: 14, marginBottom: 0 }}>
                This action cannot be undone.
              </div>
            </div>
            <div className="modal-card__foot">
              <button type="button" className="btn" onClick={() => setResetOpen(false)} disabled={resetting}>
                Cancel
              </button>
              <button type="button" className="btn btn--danger" onClick={handleReset} disabled={resetting}>
                {resetting ? 'Resetting…' : 'Yes, reset everything'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StatisticsPage;
