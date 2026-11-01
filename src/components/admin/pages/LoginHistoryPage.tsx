import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { getJson, TimeResponse, UserHistoryResponse, UsersResponse } from '../api';
import { DailyPoint, HourlyPoint } from '../types';
import {
  Banner,
  EmptyState,
  Loading,
  PageHeader,
  RoleFilterChips,
  RoleStamp,
  formatDate,
  formatDateTime,
  formatNumber,
  formatTime,
  roleLabel,
} from '../ui';
import ChartFrame from '../charts/ChartFrame';
import LineChart from '../charts/LineChart';
import ColumnChart from '../charts/ColumnChart';
import Icon from '../Icons';

interface HistoryRow {
  nationalNumber: string;
  name: string;
  school: string;
  role: string;
  loginCount: number;
  lastLogin: string | null;
}

const PAGE_SIZE = 20;

const LoginHistoryPage: React.FC = () => {
  const [rows, setRows] = useState<HistoryRow[]>([]);
  const [daily, setDaily] = useState<DailyPoint[]>([]);
  const [hourly, setHourly] = useState<HourlyPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [sortBy, setSortBy] = useState<'loginCount' | 'lastLogin'>('loginCount');
  const [page, setPage] = useState(1);
  const [expanded, setExpanded] = useState<string | null>(null);

  const fetchHistory = useCallback(async () => {
    try {
      setLoading(true);
      const [historyData, directoryData, timeData] = await Promise.all([
        getJson<UserHistoryResponse>('/api/stats/user-history'),
        getJson<UsersResponse>('/api/users'),
        getJson<TimeResponse>('/api/stats/by-time'),
      ]);
      const roleByNumber = new Map<string, string>();
      (directoryData.users || []).forEach((user) => {
        roleByNumber.set(user.nationalNumber, user.role);
      });
      setRows(
        (historyData.data || []).map((row) => ({
          ...row,
          role: roleByNumber.get(row.nationalNumber) || '—',
        }))
      );
      setDaily(timeData.data?.daily || []);
      setHourly(timeData.data?.hourly || []);
      setError('');
    } catch (err: any) {
      setError(err.message || 'تعذّر قراءة سجل الدخول.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHistory();
  }, [fetchHistory]);

  useEffect(() => {
    setPage(1);
  }, [search, roleFilter, sortBy]);

  const roleCounts = useMemo(() => {
    const counts: Record<string, number> = { all: rows.length };
    rows.forEach((row) => {
      if (row.role && row.role !== '—') {
        counts[row.role] = (counts[row.role] || 0) + 1;
      }
    });
    return counts;
  }, [rows]);

  const filtered = useMemo(() => {
    const needle = search.trim().toLowerCase();
    return rows.filter((row) => {
      const matchesSearch =
        !needle ||
        (row.name || '').toLowerCase().includes(needle) ||
        (row.nationalNumber || '').includes(needle) ||
        (row.school || '').toLowerCase().includes(needle);
      const matchesRole = roleFilter === 'all' || row.role === roleFilter;
      return matchesSearch && matchesRole;
    });
  }, [rows, search, roleFilter]);

  const sorted = useMemo(
    () =>
      [...filtered].sort((a, b) => {
        if (sortBy === 'loginCount') return b.loginCount - a.loginCount;
        const aTime = a.lastLogin ? new Date(a.lastLogin).getTime() : 0;
        const bTime = b.lastLogin ? new Date(b.lastLogin).getTime() : 0;
        return bTime - aTime;
      }),
    [filtered, sortBy]
  );

  const totalLogins = rows.reduce((sum, row) => sum + row.loginCount, 0);
  const totalPages = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const safePage = Math.min(page, totalPages);
  const pageRows = sorted.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
  const lastActivity = rows.reduce<string | null>((latest, row) => {
    if (!row.lastLogin) return latest;
    if (!latest) return row.lastLogin;
    return new Date(row.lastLogin) > new Date(latest) ? row.lastLogin : latest;
  }, null);

  const fullDay = useMemo(() => {
    const counts = new Map<number, number>();
    hourly.forEach((point) => counts.set(point.hour, point.count));
    return Array.from({ length: 24 }, (_, hour) => ({
      label: `${hour}`.padStart(2, '0'),
      value: counts.get(hour) || 0,
    }));
  }, [hourly]);

  if (loading && rows.length === 0) {
    return <Loading label="جارٍ فتح السجل" />;
  }

  return (
    <div>
      <PageHeader
        title="سجل الدخول"
        description="مَن سجّل الدخول، وكم مرة، ومتى ظهر آخر مرة. مرتّب حسب الأكثر استخدامًا للمنصة."
        actions={
          <button type="button" className="btn" onClick={fetchHistory} disabled={loading}>
            <Icon name="refresh" size={14} />
            {loading ? 'جارٍ التحديث…' : 'تحديث'}
          </button>
        }
      />

      {error && (
        <Banner
          tone="error"
          action={
            <button type="button" className="btn btn--sm" onClick={fetchHistory}>
              إعادة المحاولة
            </button>
          }
        >
          {error}
        </Banner>
      )}

      <div className="history-kpis">
        <div className="history-kpi">
          <div className="history-kpi__label">أشخاص لديهم نشاط</div>
          <div className="history-kpi__value">{formatNumber(rows.length)}</div>
          <div className="history-kpi__hint">خلال كل الأيام المسجّلة</div>
        </div>
        <div className="history-kpi">
          <div className="history-kpi__label">إجمالي عمليات الدخول</div>
          <div className="history-kpi__value">{formatNumber(totalLogins)}</div>
          <div className="history-kpi__hint">{formatNumber(daily.length)} يومًا مسجّلًا</div>
        </div>
        <div className="history-kpi">
          <div className="history-kpi__label">المتوسط لكل شخص</div>
          <div className="history-kpi__value">
            {formatNumber(rows.length > 0 ? Math.round(totalLogins / rows.length) : 0)}
          </div>
          <div className="history-kpi__hint">دخول لكل شخص نشط</div>
        </div>
        <div className="history-kpi">
          <div className="history-kpi__label">آخر نشاط</div>
          <div className="history-kpi__value" style={{ fontSize: 17 }}>
            {lastActivity ? formatDate(lastActivity) : '—'}
          </div>
          <div className="history-kpi__hint">
            {lastActivity ? formatTime(lastActivity) : 'لا يوجد نشاط بعد'}
          </div>
        </div>
      </div>

      <div className="chart-grid">
        <ChartFrame className="a-col-7" title="الدخولات حسب اليوم" subtitle="كل الفترة المسجّلة">
          <LineChart
            data={daily.map((point) => ({ label: point.day, value: point.count }))}
            height={210}
            valueLabel="دخول"
          />
        </ChartFrame>
        <ChartFrame className="a-col-5" title="الدخولات حسب الساعة" subtitle="أكثر أوقات انشغال اليوم">
          <ColumnChart data={fullDay} height={210} valueLabel="دخول" />
        </ChartFrame>
      </div>

      <div className="history-toolbar">
        <div className="history-toolbar__search">
          <input
            className="input input--search"
            type="search"
            placeholder="ابحث بالاسم أو الرقم الوطني أو المدرسة"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
          />
        </div>
        <select
          className="select"
          style={{ width: 'auto' }}
          value={sortBy}
          onChange={(event) => setSortBy(event.target.value as 'loginCount' | 'lastLogin')}
          aria-label="ترتيب الفرز"
        >
          <option value="loginCount">الفرز حسب عدد الدخولات</option>
          <option value="lastLogin">الفرز حسب آخر دخول</option>
        </select>
      </div>

      <RoleFilterChips value={roleFilter} onChange={setRoleFilter} counts={roleCounts} />

      <div className="table-wrap" style={{ marginTop: 14 }}>
        <table className="ledger">
          <thead>
            <tr>
              <th>الشخص</th>
              <th>المدرسة</th>
              <th>عدد الدخولات</th>
              <th>آخر دخول</th>
              <th>التفاصيل</th>
            </tr>
          </thead>
          <tbody>
            {pageRows.map((row) => {
              const share = totalLogins > 0 ? Math.round((row.loginCount / totalLogins) * 100) : 0;
              const isOpen = expanded === row.nationalNumber;
              return (
                <React.Fragment key={row.nationalNumber}>
                  <tr>
                    <td>
                      <span className="ledger__name">{row.name || 'غير معروف'}</span>
                      <span className="ledger__sub">{row.nationalNumber}</span>
                      <div style={{ marginTop: 4 }}>
                        <RoleStamp role={row.role} />
                      </div>
                    </td>
                    <td className="muted">{row.school || '—'}</td>
                    <td>
                      <span className="num">{formatNumber(row.loginCount)}</span>
                      <div className="report-table-bar" style={{ marginTop: 4, minWidth: 80 }}>
                        <div
                          className="report-table-bar__fill"
                          style={{ width: `${share}%`, background: 'var(--admin-brass)' }}
                        />
                      </div>
                      <span className="ledger__sub">{share}% من إجمالي الدخول</span>
                    </td>
                    <td>
                      <span className="num">{formatDate(row.lastLogin)}</span>
                      <span className="ledger__sub">{formatTime(row.lastLogin)}</span>
                    </td>
                    <td>
                      <button
                        type="button"
                        className="btn btn--sm"
                        onClick={() => setExpanded(isOpen ? null : row.nationalNumber)}
                        aria-expanded={isOpen}
                      >
                        {isOpen ? 'إخفاء' : 'عرض'}
                      </button>
                    </td>
                  </tr>
                  {isOpen && (
                    <tr className="detail-row">
                      <td colSpan={5}>
                        <div className="detail-grid">
                          <div>
                            <div className="detail-grid__label">النوع</div>
                            <div className="detail-grid__value">{roleLabel(row.role)}</div>
                          </div>
                          <div>
                            <div className="detail-grid__label">المدرسة</div>
                            <div className="detail-grid__value">{row.school || '—'}</div>
                          </div>
                          <div>
                            <div className="detail-grid__label">آخر ظهور</div>
                            <div className="detail-grid__value">{formatDateTime(row.lastLogin)}</div>
                          </div>
                          <div>
                            <div className="detail-grid__label">عدد الدخولات</div>
                            <div className="detail-grid__value">{formatNumber(row.loginCount)}</div>
                          </div>
                          <div>
                            <div className="detail-grid__label">الحصة من إجمالي الدخول</div>
                            <div className="detail-grid__value">{share}%</div>
                          </div>
                          <div>
                            <div className="detail-grid__label">الرقم الوطني</div>
                            <div className="detail-grid__value num">{row.nationalNumber}</div>
                          </div>
                        </div>
                        <p className="detail-note">
                          تُخزَّن بيانات الدخول كمجموع يومي، لذا لا يُحتفظ بالوقت الدقيق لكل
                          عملية دخول فردية — فقط آخر مرة ظهر فيها الشخص في ذلك اليوم.
                        </p>
                      </td>
                    </tr>
                  )}
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
        {pageRows.length === 0 && (
          <div className="ledger-empty">
            <EmptyState
              title="لا يوجد أشخاص مطابقون"
              body="جرّب بحثًا آخر أو امسح تصفية النوع."
              action={
                <button
                  type="button"
                  className="btn btn--sm"
                  onClick={() => {
                    setSearch('');
                    setRoleFilter('all');
                  }}
                >
                  مسح التصفية
                </button>
              }
            />
          </div>
        )}
      </div>

      {sorted.length > PAGE_SIZE && (
        <div className="pagination">
          <span className="pagination__info">
            صفحة {safePage} من {totalPages} · {formatNumber(sorted.length)} أشخاص
          </span>
          <div className="pagination__buttons">
            <button
              type="button"
              className="btn btn--sm"
              onClick={() => setPage(Math.max(1, safePage - 1))}
              disabled={safePage === 1}
            >
              <Icon name="chevron-left" size={13} />
              السابق
            </button>
            <button
              type="button"
              className="btn btn--sm"
              onClick={() => setPage(Math.min(totalPages, safePage + 1))}
              disabled={safePage === totalPages}
            >
              التالي
              <Icon name="chevron-right" size={13} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default LoginHistoryPage;
