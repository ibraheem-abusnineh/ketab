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
  { id: 'all', label: 'كل الفترات' },
  { id: 'day', label: 'اليوم' },
  { id: 'week', label: 'آخر 7 أيام' },
  { id: 'month', label: 'آخر 30 يومًا' },
  { id: 'custom', label: 'فترة مخصصة' },
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
      setError(err.message || 'تعذّرت قراءة الإحصاءات.');
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
    PERIODS.find((item) => item.id === period)?.label || 'كل الفترات';

  const handleReset = async () => {
    try {
      setResetting(true);
      const response = await apiFetch('/api/admin/reset-visits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirmed: true }),
      });
      const data = await response.json();
      setResetMessage({ tone: 'success', text: data.message || 'تمت إعادة تعيين بيانات الزيارات.' });
      setResetOpen(false);
      await fetchStatistics();
      setTimeout(() => setResetMessage(null), 5000);
    } catch (err: any) {
      setResetMessage({ tone: 'error', text: err.message || 'تعذّرت إعادة تعيين العدّاد.' });
    } finally {
      setResetting(false);
    }
  };

  if (loading && totalVisits === 0 && daily.length === 0) {
    return <Loading label="جارٍ عدّ عمليات الدخول" />;
  }

  return (
    <div>
      <PageHeader
        title="الإحصاءات"
        description="الزيارات والمدارس والساعات التي يستخدم فيها المستخدمون المنصة فعليًا. يتبع كل مخطط الفترة التي تختارها."
        actions={
          <button type="button" className="btn" onClick={fetchStatistics} disabled={loading}>
            <Icon name="refresh" size={14} />
            {loading ? 'جارٍ التحديث…' : 'تحديث'}
          </button>
        }
      />

      {error && (
        <Banner
          tone="error"
          action={
            <button type="button" className="btn btn--sm" onClick={fetchStatistics}>
              إعادة المحاولة
            </button>
          }
        >
          {error}
        </Banner>
      )}

      {resetMessage && <Banner tone={resetMessage.tone}>{resetMessage.text}</Banner>}

      <div className="period-bar">
        <span className="period-bar__label">الفترة</span>
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
              aria-label="تاريخ البدء"
            />
            <span className="date-pair__sep">إلى</span>
            <input
              className="input"
              type="date"
              value={customEnd}
              onChange={(event) => setCustomEnd(event.target.value)}
              aria-label="تاريخ الانتهاء"
            />
          </div>
        )}
        <span className="period-bar__spacer" />
        <span className="report-note">
          {period === 'all' ? `${daily.length} يومًا مسجّلًا` : `عرض ${periodLabel}`}
        </span>
      </div>

      <div className="kpi-grid">
        <Kpi
          label={`عمليات الدخول · ${periodLabel}`}
          value={formatNumber(filteredCount)}
          hint={`${formatNumber(totalVisits)} في كل الفترات`}
        />
        <Kpi
          label="المدارس في الفترة"
          value={formatNumber(schools.length)}
          hint={schools[0] ? `الأكثر نشاطًا: ${schools[0].school}` : 'لا يوجد نشاط مدرسي'}
        />
        <Kpi
          label="المستخدمون النشطون"
          value={formatNumber(userHistory.length)}
          hint={userHistory[0] ? `الأكثر نشاطًا: ${userHistory[0].name}` : 'لا يوجد نشاط'}
        />
        <Kpi
          label="متوسط الدخول اليومي"
          value={formatNumber(avgPerDay)}
          hint={`خلال ${daily.length} يومًا`}
          spark={<Sparkline values={sparkValues} width={106} height={30} />}
        />
      </div>

      <div className="chart-grid">
        <ChartFrame
          className="a-col-8"
          title="الدخول اليومي"
          subtitle="كل يوم في الفترة المحددة"
        >
          <LineChart data={lineData} height={250} valueLabel="عمليات الدخول" />
        </ChartFrame>

        <ChartFrame
          className="a-col-4"
          title="نسبة المدارس"
          subtitle="نسبة كل عمليات الدخول في الفترة"
        >
          <DonutChart
            data={schools.slice(0, 8).map((school) => ({
              label: school.school,
              value: school.visitCount,
            }))}
            centerLabel="عمليات الدخول"
            valueLabel="عمليات الدخول"
          />
        </ChartFrame>

        <ChartFrame
          className="a-col-5"
          title="النشاط حسب الساعة"
          subtitle="أوقات ذروة استخدام المنصة"
        >
          <ColumnChart data={fullDay} height={220} valueLabel="عمليات الدخول" />
        </ChartFrame>

        <ChartFrame
          className="a-col-7"
          title="ترتيب المدارس"
          subtitle="عمليات الدخول لكل مدرسة، الأكثر أولًا"
        >
          <BarChart
            data={schools.slice(0, 9).map((school) => ({
              label: school.school || 'غير معروف',
              value: school.visitCount,
              meta: `${school.uniqueUsers} مستخدمون فريدون`,
            }))}
            valueLabel="عمليات الدخول"
          />
        </ChartFrame>

        <ChartFrame
          className="a-col-7"
          title="الإيقاع الأسبوعي"
          subtitle="عرض تقويمي لحجم الدخول اليومي"
        >
          <Heatmap data={daily} />
        </ChartFrame>

        <ChartFrame
          className="a-col-5"
          title="المستخدمون حسب النوع"
          subtitle={`الدليل الكامل · ${formatNumber(directory.length)} حسابات`}
        >
          <BarChart data={roleCounts} valueLabel="حسابات" highlightTop={false} />
        </ChartFrame>

        <ChartFrame
          className="a-col-6"
          title="الأكثر نشاطًا"
          subtitle="أكثر المستخدمين دخولًا في الفترة"
        >
          <BarChart
            data={userHistory.slice(0, 10).map((user) => ({
              label: user.name || 'غير معروف',
              value: user.loginCount,
              meta: user.school || 'لا توجد مدرسة',
            }))}
            valueLabel="عمليات الدخول"
          />
        </ChartFrame>

        <ChartFrame
          className="a-col-6"
          title="أحدث الزيارات"
          subtitle="أحدث عمليات الدخول، الأحدث أولًا"
        >
          {recent.length === 0 ? (
            <div className="chart-empty">لا توجد زيارات في هذه الفترة</div>
          ) : (
            <div className="table-wrap" style={{ border: 0 }}>
              <table className="ledger">
                <thead>
                  <tr>
                    <th>الوقت</th>
                    <th>الشخص</th>
                    <th>المدرسة</th>
                  </tr>
                </thead>
                <tbody>
                  {recent.map((event, index) => (
                    <tr key={`${event.nationalNumber}-${index}`}>
                      <td className="num">{formatDateTime(event.timestamp)}</td>
                      <td>{event.name || 'غير معروف'}</td>
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
        <span className="section-rule__label">الصيانة</span>
        <span className="section-rule__line" />
      </div>

      <div className="danger-zone">
        <div>
          <div className="danger-zone__title">إعادة تعيين عدّاد الزيارات</div>
          <div className="danger-zone__body">
            يمسح كل عمليات الدخول المسجّلة والعدّاد الكلي. لا يمكن التراجع عن هذا الإجراء.
          </div>
        </div>
        <button type="button" className="btn btn--danger" onClick={() => setResetOpen(true)} disabled={resetting}>
          {resetting ? 'جارٍ إعادة التعيين…' : 'إعادة تعيين بيانات الزيارات'}
        </button>
      </div>

      {resetOpen && (
        <div className="modal-backdrop" onClick={() => setResetOpen(false)}>
          <div className="modal-card" onClick={(event) => event.stopPropagation()}>
            <div className="modal-card__head">
              <h3>إعادة تعيين بيانات الزيارات</h3>
              <button type="button" className="modal-close" onClick={() => setResetOpen(false)} aria-label="إغلاق">
                ×
              </button>
            </div>
            <div className="modal-card__body">
              <p style={{ margin: 0, fontSize: 13, lineHeight: 1.6 }}>
                يمسح هذا عدّاد الزيارات وكل سجل عمليات الدخول. لا تتأثر المدارس والمستخدمون
                والمقررات.
              </p>
              <div className="banner banner--error" style={{ marginTop: 14, marginBottom: 0 }}>
                لا يمكن التراجع عن هذا الإجراء.
              </div>
            </div>
            <div className="modal-card__foot">
              <button type="button" className="btn" onClick={() => setResetOpen(false)} disabled={resetting}>
                إلغاء
              </button>
              <button type="button" className="btn btn--danger" onClick={handleReset} disabled={resetting}>
                {resetting ? 'جارٍ إعادة التعيين…' : 'نعم، أعد تعيين كل شيء'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StatisticsPage;
