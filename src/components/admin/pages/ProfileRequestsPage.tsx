import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { apiFetch } from '../../../utils/api';
import { AdminNotification, DirectoryUser } from '../types';
import {
  Banner,
  EmptyState,
  Loading,
  PageHeader,
  RoleStamp,
  StatusStamp,
  formatDateTime,
  formatNumber,
} from '../ui';
import Icon from '../Icons';

type StatusFilter = 'all' | 'pending' | 'approved' | 'rejected';

interface RequestRecord extends AdminNotification {
  status: 'pending' | 'approved' | 'rejected';
}

const FIELD_LABELS: Record<string, string> = {
  name: 'الاسم الكامل',
  phone: 'الهاتف',
  school: 'المدرسة',
  directorate: 'المديرية',
  role: 'النوع',
  nationalNumber: 'الرقم الوطني',
};

const STATUS_LABELS: Record<StatusFilter, string> = {
  all: 'الكل',
  pending: 'قيد الانتظار',
  approved: 'موافق عليه',
  rejected: 'مرفوض',
};

const ProfileRequestsPage: React.FC = () => {
  const [requests, setRequests] = useState<RequestRecord[]>([]);
  const [users, setUsers] = useState<DirectoryUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('pending');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [busy, setBusy] = useState<'approve' | 'reject' | null>(null);
  const [actionError, setActionError] = useState('');

  const fetchAll = useCallback(async () => {
    try {
      const [notificationsResponse, usersResponse] = await Promise.all([
        apiFetch('/api/admin/notifications'),
        apiFetch('/api/users'),
      ]);
      const notificationData = await notificationsResponse.json();
      const userData = await usersResponse.json();
      const profileRequests = (notificationData.notifications || [])
        .filter((item: AdminNotification) => item.type === 'profile_edit_request')
        .map((item: AdminNotification) => ({
          ...item,
          status: item.status || 'pending',
        })) as RequestRecord[];
      setRequests(profileRequests);
      setUsers(userData.users || []);
      setError('');
    } catch (err: any) {
      setError(err.message || 'تعذّر قراءة طلبات تعديل الملف.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
    const interval = setInterval(fetchAll, 12000);
    return () => clearInterval(interval);
  }, [fetchAll]);

  const counts = useMemo(
    () => ({
      all: requests.length,
      pending: requests.filter((item) => item.status === 'pending').length,
      approved: requests.filter((item) => item.status === 'approved').length,
      rejected: requests.filter((item) => item.status === 'rejected').length,
    }),
    [requests]
  );

  const sorted = useMemo(() => {
    const filtered =
      statusFilter === 'all'
        ? requests
        : requests.filter((item) => item.status === statusFilter);
    return [...filtered].sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
  }, [requests, statusFilter]);

  useEffect(() => {
    if (sorted.length === 0) {
      setSelectedId(null);
      return;
    }
    if (!selectedId || !sorted.some((item) => item.id === selectedId)) {
      setSelectedId(sorted[0].id);
    }
  }, [sorted, selectedId]);

  const selected = sorted.find((item) => item.id === selectedId) || null;
  const selectedUser = selected
    ? users.find((user) => user.nationalNumber === selected.userId) || null
    : null;

  const handleDecision = async (decision: 'approve' | 'reject') => {
    if (!selected) return;
    if (
      decision === 'reject' &&
      !window.confirm(`رفض تعديل الملف الذي طلبه ${selected.userName}؟`)
    ) {
      return;
    }
    try {
      setBusy(decision);
      setActionError('');
      await apiFetch(`/api/admin/profile-requests/${selected.id}/${decision}`, {
        method: 'POST',
      });
      await fetchAll();
    } catch (err: any) {
      setActionError(
        err.message ||
          (decision === 'approve' ? 'تعذّرت الموافقة على الطلب.' : 'تعذّر رفض الطلب.')
      );
    } finally {
      setBusy(null);
    }
  };

  if (loading && requests.length === 0) {
    return <Loading label="جارٍ فتح طلبات تعديل الملف" />;
  }

  return (
    <div>
      <PageHeader
        title="طلبات تعديل الملف"
        description="تُعرض هنا التعديلات التي يرسلها المستخدمون للمراجعة. اقرأ القيمة القديمة والجديدة جنبًا إلى جنب ثم وافق أو ارفض."
        actions={
          <button type="button" className="btn" onClick={fetchAll} disabled={loading}>
            <Icon name="refresh" size={14} />
            {loading ? 'جارٍ التحديث…' : 'تحديث'}
          </button>
        }
      />

      {error && (
        <Banner
          tone="error"
          action={
            <button type="button" className="btn btn--sm" onClick={fetchAll}>
              إعادة المحاولة
            </button>
          }
        >
          {error}
        </Banner>
      )}

      {actionError && (
        <Banner
          tone="error"
          action={
            <button type="button" className="btn btn--sm" onClick={() => setActionError('')}>
              إغلاق
            </button>
          }
        >
          {actionError}
        </Banner>
      )}

      <div className="period-bar">
        <span className="period-bar__label">الحالة</span>
        <div className="chip-row">
          {(['all', 'pending', 'approved', 'rejected'] as StatusFilter[]).map((status) => (
            <button
              type="button"
              key={status}
              className={`chip ${statusFilter === status ? 'active' : ''}`}
              onClick={() => setStatusFilter(status)}
            >
              {STATUS_LABELS[status]}
              <span className="chip__count">{counts[status]}</span>
            </button>
          ))}
        </div>
        <span className="period-bar__spacer" />
        <span className="report-note">
          {formatNumber(counts.pending)} بانتظار قرار · {formatNumber(counts.all)} الإجمالي
        </span>
      </div>

      <div className="requests-layout">
        <section className="requests-list-panel">
          <div className="requests-list-panel__head">
            <h3 className="requests-list-panel__title">
              {statusFilter === 'all' ? 'كل الطلبات' : STATUS_LABELS[statusFilter]}
            </h3>
            <p className="panel__sub">{formatNumber(sorted.length)} معروض</p>
          </div>
          <div className="request-list">
            {sorted.length === 0 ? (
              <EmptyState
                title="لا توجد طلبات"
                body={
                  statusFilter === 'pending'
                    ? 'لا يوجد شيء بانتظار قرار الآن.'
                    : 'جرّب تصفية حالة أخرى.'
                }
              />
            ) : (
              sorted.map((request) => (
                <button
                  type="button"
                  key={request.id}
                  className={`request-list__item ${selectedId === request.id ? 'active' : ''}`}
                  onClick={() => setSelectedId(request.id)}
                >
                  <div className="request-list__top">
                    <span className="request-list__name">{request.userName || 'غير معروف'}</span>
                    <StatusStamp status={request.status} />
                  </div>
                  <div className="request-list__time">{formatDateTime(request.timestamp)}</div>
                  <div className="request-list__summary">
                    {request.changes
                      .map((change) => FIELD_LABELS[change.field] || change.field)
                      .join(' · ') || 'لا توجد حقول مدرجة'}
                  </div>
                </button>
              ))
            )}
          </div>
        </section>

        <section className="request-detail">
          {!selected ? (
            <EmptyState
              title="اختر طلبًا"
              body="اختر طلبًا من القائمة لمقارنة الملف الحالي والملف المطلوب."
            />
          ) : (
            <>
              <div className="request-detail__head">
                <div>
                  <h3 className="request-detail__name">{selected.userName || 'مستخدم غير معروف'}</h3>
                  <div className="request-detail__meta">
                    {selected.userId} · أُرسل {formatDateTime(selected.timestamp)}
                    {selected.status === 'approved' && selected.approvedAt
                      ? ` · تمت الموافقة ${formatDateTime(selected.approvedAt)}`
                      : ''}
                    {selected.status === 'rejected' && selected.rejectedAt
                      ? ` · تم الرفض ${formatDateTime(selected.rejectedAt)}`
                      : ''}
                  </div>
                </div>
                <StatusStamp status={selected.status} />
              </div>

              <div className="request-detail__body">
                <div className="request-detail__section">
                  <h4>الملف الحالي</h4>
                  {selectedUser ? (
                    <div className="profile-grid">
                      <div>
                        <div className="profile-grid__label">الاسم</div>
                        <div className="profile-grid__value">{selectedUser.name}</div>
                      </div>
                      <div>
                        <div className="profile-grid__label">النوع</div>
                        <div className="profile-grid__value">
                          <RoleStamp role={selectedUser.role} />
                        </div>
                      </div>
                      <div>
                        <div className="profile-grid__label">الرقم الوطني</div>
                        <div className="profile-grid__value num">{selectedUser.nationalNumber}</div>
                      </div>
                      <div>
                        <div className="profile-grid__label">المدرسة</div>
                        <div className="profile-grid__value">{selectedUser.school || '—'}</div>
                      </div>
                      <div>
                        <div className="profile-grid__label">الهاتف</div>
                        <div className="profile-grid__value num">{selectedUser.phone || '—'}</div>
                      </div>
                      <div>
                        <div className="profile-grid__label">المديرية</div>
                        <div className="profile-grid__value">{selectedUser.directorate || '—'}</div>
                      </div>
                    </div>
                  ) : (
                    <div className="chart-empty">هذا الحساب غير موجود في الدليل الحالي.</div>
                  )}
                </div>

                <div className="request-detail__section">
                  <h4>التعديلات المطلوبة</h4>
                  <table className="compare-table">
                    <thead>
                      <tr>
                        <th>الحقل</th>
                        <th>القيمة الحالية</th>
                        <th>القيمة المطلوبة</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selected.changes.map((change, index) => (
                        <tr key={`${change.field}-${index}`}>
                          <td>{FIELD_LABELS[change.field] || change.field}</td>
                          <td className="old">{change.oldValue || '—'}</td>
                          <td className="new">{change.newValue || '—'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {selected.changes.length === 0 && (
                    <div className="chart-empty" style={{ minHeight: 90 }}>
                      هذا الطلب لا يدرج أي تغييرات على الحقول.
                    </div>
                  )}
                </div>
              </div>

              <div className="request-detail__actions">
                {selected.status === 'pending' ? (
                  <>
                    <button
                      type="button"
                      className="btn btn--primary"
                      onClick={() => handleDecision('approve')}
                      disabled={busy !== null}
                    >
                      <Icon name="check" size={14} />
                      {busy === 'approve' ? 'جارٍ الموافقة…' : 'الموافقة على التعديلات'}
                    </button>
                    <button
                      type="button"
                      className="btn btn--danger"
                      onClick={() => handleDecision('reject')}
                      disabled={busy !== null}
                    >
                      {busy === 'reject' ? 'جارٍ الرفض…' : 'رفض الطلب'}
                    </button>
                  </>
                ) : (
                  <span className="report-note">
                    هذا الطلب {STATUS_LABELS[selected.status]}. لا يمكن الموافقة عليه أو رفضه مرة
                    أخرى.
                  </span>
                )}
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
};

export default ProfileRequestsPage;
