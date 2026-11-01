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
      setError(err.message || 'تعذّرت قراءة النظرة العامة.');
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
    return <Loading label="جارٍ فتح السجل" />;
  }

  return (
    <div>
      <PageHeader
        title="اليوم في لمحة"
        description="صفحة واحدة لحالة المنصة: عمليات الدخول والمدارس والمستخدمون وعناصر الإشعارات التي تنتظرك."
        actions={
          <>
            <button type="button" className="btn" onClick={fetchOverview} disabled={loading}>
              <Icon name="refresh" size={14} />
              {loading ? 'جارٍ التحديث…' : 'تحديث'}
            </button>
            <button type="button" className="btn btn--primary" onClick={() => onNavigate('reports')}>
              فتح التقارير
            </button>
          </>
        }
      />

      {error && (
        <Banner
          tone="error"
          action={
            <button type="button" className="btn btn--sm" onClick={fetchOverview}>
              إعادة المحاولة
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
              <div className="hero-logins__label">إجمالي عمليات الدخول المسجّلة</div>
              <div className="hero-logins__number">{formatNumber(totalVisits)}</div>
              <div className="hero-logins__meta">
                {schools.length} مدرسة · {users.length} مستخدمًا نشطًا · منذ{' '}
                {daily.length > 0 ? daily[0].day : '—'}
              </div>
            </div>
            <div className="admin-live">
              <span className="admin-live__dot" />
              تحديث تلقائي
            </div>
          </div>
          <div className="hero-logins__chart">
            <div className="hero-logins__label" style={{ padding: '0 18px 4px' }}>
              الدخول اليومي · آخر {last14.length} يومًا
            </div>
            <LineChart data={last14} height={150} valueLabel="عمليات الدخول" />
          </div>
        </section>

        <section className="hero-today">
          <div>
            <div className="hero-today__label">اليوم</div>
            <div className="hero-today__number">{formatNumber(todayCount)}</div>
            <div className="hero-today__hint">
              {delta === null
                ? 'لا توجد مقارنة مع الأمس'
                : `${delta >= 0 ? '+' : ''}${delta}% مقابل الأمس`}
            </div>
          </div>
          <div className="hero-today__divider" />
          <div className="hero-today__row">
            <span>أعلى يوم</span>
            <strong>{peak.day ? `${formatNumber(peak.count)}` : '—'}</strong>
          </div>
          <div className="hero-today__row">
            <span>المتوسط اليومي</span>
            <strong>{formatNumber(avgPerDay)}</strong>
          </div>
          <div className="hero-today__row">
            <span>أكثر مدرسة نشاطًا</span>
            <strong style={{ fontFamily: 'inherit', fontSize: 11 }}>
              {schools[0]?.school || '—'}
            </strong>
          </div>
        </section>
      </div>

      <div className="kpi-grid">
        <Kpi
          label="المدارس ذات النشاط"
          value={formatNumber(schools.length)}
          hint={schools[0] ? `الأكبر: ${schools[0].school}` : 'لا توجد بيانات مدرسية بعد'}
        />
        <Kpi
          label="المستخدمون النشطون"
          value={formatNumber(users.length)}
          hint={users[0] ? `الأكثر نشاطًا: ${users[0].name}` : 'لا يوجد نشاط للمستخدمين بعد'}
        />
        <Kpi
          label="متوسط الدخول اليومي"
          value={formatNumber(avgPerDay)}
          hint={`خلال ${daily.length} يومًا مسجّلًا`}
          spark={<Sparkline values={sparkValues} width={108} height={30} />}
        />
        <Kpi
          label="بانتظار في الإشعارات"
          value={formatNumber(unreadCount)}
          hint={`عدد طلبات تعديل الملف: ${pendingCount}`}
        />
      </div>

      <div className="overview-split">
        <section className="panel">
          <div className="panel__head">
            <div>
              <h3 className="panel__title">النشاط الأخير</h3>
              <p className="panel__sub">أحدث عمليات الدخول المسجّلة عبر الشبكة.</p>
            </div>
            <button type="button" className="btn btn--sm" onClick={() => onNavigate('history')}>
              سجل الدخول الكامل
            </button>
          </div>
          {recent.length === 0 ? (
            <EmptyState title="لا توجد عمليات دخول مسجّلة" body="سيظهر النشاط هنا عند تسجيل المستخدمين لدخولهم." />
          ) : (
            <div className="activity-list">
              {recent.map((event, index) => (
                <div className="activity-item" key={`${event.nationalNumber}-${index}`}>
                  <span className="activity-item__time">
                    {event.timestamp ? formatDateTime(event.timestamp).split(', ').slice(-1)[0] : '—'}
                  </span>
                  <div>
                    <div className="activity-item__name">{event.name || 'مستخدم غير معروف'}</div>
                    <span className="activity-item__school">{event.school || 'لا توجد مدرسة'}</span>
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
              <h3 className="panel__title">يتطلب الانتباه</h3>
              <p className="panel__sub">التحديثات غير المقروءة وطلبات تعديل الملف.</p>
            </div>
            <button
              type="button"
              className="btn btn--sm"
              onClick={async () => {
                await onRefreshInbox();
                onNavigate('notifications');
              }}
            >
              فتح الإشعارات
            </button>
          </div>
          {attention.length === 0 ? (
            <EmptyState title="لا توجد إشعارات جديدة" body="ستظهر هنا تحديثات الملف والطلبات الجديدة." />
          ) : (
            <div className="notif-preview">
              {attention.map((item) => (
                <div className="notif-preview__item" key={item.id}>
                  <div>
                    <div className="notif-preview__name">{item.userName}</div>
                    <div className="notif-preview__body">
                      {item.type === 'profile_edit_request'
                        ? item.status === 'pending'
                          ? 'طلب تعديل الملف'
                          : `طلب تعديل الملف: ${item.status}`
                        : `تحديث ${item.changes.length} حقلًا في الملف`}
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
        <span className="section-rule__label">الانتقال إلى</span>
        <span className="section-rule__line" />
      </div>

      <div className="quick-actions">
        <button type="button" className="quick-action" onClick={() => onNavigate('statistics')}>
          <Icon name="chart" size={18} />
          <span className="quick-action__title">الإحصاءات</span>
          <span className="quick-action__hint">أنماط الزيارات والنشاط</span>
        </button>
        <button type="button" className="quick-action" onClick={() => onNavigate('users')}>
          <Icon name="users" size={18} />
          <span className="quick-action__title">إضافة مستخدم أو تعديله</span>
          <span className="quick-action__hint">فتح سجل المستخدمين</span>
        </button>
        <button type="button" className="quick-action" onClick={() => onNavigate('requests')}>
          <Icon name="inbox" size={18} />
          <span className="quick-action__title">مراجعة الطلبات</span>
          <span className="quick-action__hint">{pendingCount} بانتظار قرار</span>
        </button>
        <button type="button" className="quick-action" onClick={() => onNavigate('courses')}>
          <Icon name="layers" size={18} />
          <span className="quick-action__title">الوصول إلى المقررات</span>
          <span className="quick-action__hint">قفل مقرر أو إلغاء قفله</span>
        </button>
      </div>
    </div>
  );
};

export default OverviewPage;
