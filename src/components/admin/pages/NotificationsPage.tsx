import React, { useMemo, useState } from 'react';
import { AdminNotification } from '../types';
import {
  Banner,
  EmptyState,
  Loading,
  PageHeader,
  StatusStamp,
  formatDateTime,
  formatNumber,
} from '../ui';
import Icon from '../Icons';

interface NotificationsPageProps {
  notifications: AdminNotification[];
  loading: boolean;
  error: string;
  unreadCount: number;
  onRefresh: () => Promise<void> | void;
  onMarkRead: (id: string) => Promise<void> | void;
  onRemove: (id: string) => Promise<void> | void;
  onClearAll: () => Promise<{ clearedCount?: number; remainingRequests?: number }>;
  onApprove: (id: string) => Promise<void> | void;
  onReject: (id: string) => Promise<void> | void;
  onOpenRequests: () => void;
}

type Filter = 'all' | 'unread' | 'requests' | 'updates' | 'resolved';

const FIELD_LABELS: Record<string, string> = {
  name: 'Full name',
  phone: 'Phone',
  school: 'School',
  directorate: 'Directorate',
  role: 'Role',
  nationalNumber: 'National number',
};

const FILTER_LABELS: Array<{ id: Filter; label: string }> = [
  { id: 'all', label: 'Everything' },
  { id: 'unread', label: 'Unread' },
  { id: 'requests', label: 'Pending requests' },
  { id: 'updates', label: 'Profile updates' },
  { id: 'resolved', label: 'Resolved' },
];

function isPendingRequest(item: AdminNotification): boolean {
  return item.type === 'profile_edit_request' && item.status === 'pending';
}

function isUnread(item: AdminNotification): boolean {
  return !item.read || isPendingRequest(item);
}

const NotificationsPage: React.FC<NotificationsPageProps> = ({
  notifications,
  loading,
  error,
  unreadCount,
  onRefresh,
  onMarkRead,
  onRemove,
  onClearAll,
  onApprove,
  onReject,
  onOpenRequests,
}) => {
  const [filter, setFilter] = useState<Filter>('all');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [clearing, setClearing] = useState(false);
  const [notice, setNotice] = useState('');
  const [actionError, setActionError] = useState('');

  const counts = useMemo(
    () => ({
      all: notifications.length,
      unread: notifications.filter(isUnread).length,
      requests: notifications.filter(isPendingRequest).length,
      updates: notifications.filter((item) => item.type === 'profile_update').length,
      resolved: notifications.filter(
        (item) => item.type === 'profile_edit_request' && item.status !== 'pending'
      ).length,
    }),
    [notifications]
  );

  const visible = useMemo(() => {
    const sorted = [...notifications].sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );
    if (filter === 'unread') return sorted.filter(isUnread);
    if (filter === 'requests') return sorted.filter(isPendingRequest);
    if (filter === 'updates') return sorted.filter((item) => item.type === 'profile_update');
    if (filter === 'resolved')
      return sorted.filter(
        (item) => item.type === 'profile_edit_request' && item.status !== 'pending'
      );
    return sorted;
  }, [notifications, filter]);

  const runAction = async (id: string, action: () => Promise<void> | void) => {
    try {
      setBusyId(id);
      setActionError('');
      await action();
    } catch (err: any) {
      setActionError(err?.message || 'That action could not be completed.');
    } finally {
      setBusyId(null);
    }
  };

  const handleClearAll = async () => {
    if (!window.confirm('Clear every profile update from the inbox? Pending requests are kept.')) {
      return;
    }
    try {
      setClearing(true);
      const result = await onClearAll();
      const cleared = result?.clearedCount ?? 0;
      const remaining = result?.remainingRequests ?? 0;
      setNotice(
        `Cleared ${formatNumber(cleared)} update${cleared === 1 ? '' : 's'}${
          remaining > 0 ? ` · ${formatNumber(remaining)} request${remaining === 1 ? '' : 's'} kept` : ''
        }.`
      );
      setTimeout(() => setNotice(''), 5000);
    } finally {
      setClearing(false);
    }
  };

  if (loading && notifications.length === 0) {
    return <Loading label="Opening the inbox" />;
  }

  return (
    <div>
      <PageHeader
        title="Inbox"
        description="Profile updates land here for the record. Edit requests wait here until you approve or reject them."
        actions={
          <>
            <button type="button" className="btn" onClick={onRefresh} disabled={loading}>
              <Icon name="refresh" size={14} />
              {loading ? 'Refreshing…' : 'Refresh'}
            </button>
            <button
              type="button"
              className="btn btn--danger"
              onClick={handleClearAll}
              disabled={clearing || counts.updates === 0}
            >
              <Icon name="trash" size={14} />
              {clearing ? 'Clearing…' : 'Clear updates'}
            </button>
          </>
        }
      />

      {error && (
        <Banner
          tone="error"
          action={
            <button type="button" className="btn btn--sm" onClick={onRefresh}>
              Retry
            </button>
          }
        >
          {error}
        </Banner>
      )}

      {notice && <Banner tone="success">{notice}</Banner>}

      {actionError && (
        <Banner
          tone="error"
          action={
            <button type="button" className="btn btn--sm" onClick={() => setActionError('')}>
              Dismiss
            </button>
          }
        >
          {actionError}
        </Banner>
      )}

      <div className="inbox-layout">
        <aside className="inbox-filters">
          <div className="inbox-filters__label">Filter</div>
          {FILTER_LABELS.map((item) => (
            <button
              type="button"
              key={item.id}
              className={`inbox-filter ${filter === item.id ? 'active' : ''}`}
              onClick={() => setFilter(item.id)}
            >
              <span>{item.label}</span>
              <span className="inbox-filter__count">{formatNumber(counts[item.id])}</span>
            </button>
          ))}
          <div className="inbox-filters__label" style={{ marginTop: 16 }}>
            Summary
          </div>
          <div className="register-summary__row">
            <span>Unread</span>
            <span className="register-summary__count">{formatNumber(unreadCount)}</span>
          </div>
          <div className="register-summary__row">
            <span>Awaiting decision</span>
            <span className="register-summary__count">{formatNumber(counts.requests)}</span>
          </div>
          {counts.requests > 0 && (
            <button
              type="button"
              className="btn btn--sm btn--primary"
              style={{ width: '100%', marginTop: 12 }}
              onClick={onOpenRequests}
            >
              Review requests
            </button>
          )}
        </aside>

        <div>
          {visible.length === 0 ? (
            <EmptyState
              title={filter === 'all' ? 'The inbox is empty' : 'Nothing in this filter'}
              body={
                filter === 'all'
                  ? 'Profile updates and edit requests will appear here as they happen.'
                  : 'Try another filter to see the rest of the inbox.'
              }
              action={
                filter !== 'all' ? (
                  <button type="button" className="btn btn--sm" onClick={() => setFilter('all')}>
                    Show everything
                  </button>
                ) : undefined
              }
            />
          ) : (
            <div className="inbox-list">
              {visible.map((item) => {
                const pending = isPendingRequest(item);
                const unread = isUnread(item);
                const busy = busyId === item.id;
                return (
                  <article
                    className={`inbox-item ${unread ? 'unread' : ''} ${pending ? 'pending' : ''}`}
                    key={item.id}
                    onClick={() => {
                      if (!item.read) runAction(item.id, () => onMarkRead(item.id));
                    }}
                  >
                    {item.type !== 'profile_edit_request' && (
                      <button
                        type="button"
                        className="inbox-item__delete"
                        aria-label={`Delete notification from ${item.userName}`}
                        onClick={(event) => {
                          event.stopPropagation();
                          runAction(item.id, () => onRemove(item.id));
                        }}
                      >
                        ×
                      </button>
                    )}

                    <div className="inbox-item__top">
                      <div className="inbox-item__name">{item.userName || 'Unknown user'}</div>
                      <div className="inbox-item__time">{formatDateTime(item.timestamp)}</div>
                    </div>

                    <div className="inbox-item__body">
                      {item.type === 'profile_edit_request' ? (
                        <>
                          Requested a profile change
                          {item.status && (
                            <>
                              {' '}
                              <StatusStamp status={item.status} />
                            </>
                          )}
                        </>
                      ) : (
                        <>Updated {item.changes.length} profile field{item.changes.length === 1 ? '' : 's'}</>
                      )}
                    </div>

                    {item.changes.length > 0 && (
                      <div className="inbox-item__changes">
                        {item.changes.slice(0, 4).map((change, index) => (
                          <span className="inbox-change" key={`${item.id}-${change.field}-${index}`}>
                            {FIELD_LABELS[change.field] || change.field}:{' '}
                            <em>{change.oldValue || '—'}</em> → {change.newValue || '—'}
                          </span>
                        ))}
                        {item.changes.length > 4 && (
                          <span className="inbox-change">+{item.changes.length - 4} more</span>
                        )}
                      </div>
                    )}

                    <div className="inbox-item__actions">
                      {pending ? (
                        <>
                          <button
                            type="button"
                            className="btn btn--sm btn--primary"
                            disabled={busy}
                            onClick={(event) => {
                              event.stopPropagation();
                              runAction(item.id, () => onApprove(item.id));
                            }}
                          >
                            <Icon name="check" size={12} />
                            {busy ? 'Working…' : 'Approve'}
                          </button>
                          <button
                            type="button"
                            className="btn btn--sm btn--danger"
                            disabled={busy}
                            onClick={(event) => {
                              event.stopPropagation();
                              runAction(item.id, () => onReject(item.id));
                            }}
                          >
                            Reject
                          </button>
                        </>
                      ) : (
                        <>
                          {unread && (
                            <button
                              type="button"
                              className="btn btn--sm"
                              disabled={busy}
                              onClick={(event) => {
                                event.stopPropagation();
                                runAction(item.id, () => onMarkRead(item.id));
                              }}
                            >
                              Mark read
                            </button>
                          )}
                          {item.type === 'profile_update' ? (
                            <button
                              type="button"
                              className="btn btn--sm btn--danger"
                              disabled={busy}
                              onClick={(event) => {
                                event.stopPropagation();
                                runAction(item.id, () => onRemove(item.id));
                              }}
                            >
                              Remove
                            </button>
                          ) : (
                            <span className="report-note">
                              Resolved · kept for the record
                            </span>
                          )}
                        </>
                      )}
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default NotificationsPage;
