import { useCallback, useEffect, useMemo, useState } from 'react';
import { apiFetch } from '../../utils/api';
import { AdminNotification } from './types';

/**
 * One source of truth for the admin inbox. The shell uses it for the
 * sidebar badge, and the inbox / overview pages render the same list.
 */
export function useNotifications(pollMs = 15000) {
  const [notifications, setNotifications] = useState<AdminNotification[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchNotifications = useCallback(async () => {
    try {
      const response = await apiFetch('/api/admin/notifications');
      const data = await response.json();
      setNotifications(data.notifications || []);
      setError('');
    } catch (err: any) {
      setError(err.message || 'Could not read notifications');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchNotifications();
    if (!pollMs) return undefined;
    const interval = setInterval(fetchNotifications, pollMs);
    return () => clearInterval(interval);
  }, [fetchNotifications, pollMs]);

  const unreadCount = useMemo(
    () =>
      notifications.filter(
        (item) => !item.read || (item.type === 'profile_edit_request' && item.status === 'pending')
      ).length,
    [notifications]
  );

  const pendingCount = useMemo(
    () =>
      notifications.filter(
        (item) => item.type === 'profile_edit_request' && item.status === 'pending'
      ).length,
    [notifications]
  );

  const markRead = useCallback(
    async (id: string) => {
      await apiFetch(`/api/admin/notifications/${id}/read`, { method: 'POST' });
      setNotifications((current) =>
        current.map((item) => (item.id === id ? { ...item, read: true } : item))
      );
    },
    []
  );

  const remove = useCallback(
    async (id: string) => {
      await apiFetch(`/api/admin/notifications/${id}`, { method: 'DELETE' });
      setNotifications((current) => current.filter((item) => item.id !== id));
    },
    []
  );

  const clearAll = useCallback(async () => {
    const response = await apiFetch('/api/admin/notifications', { method: 'DELETE' });
    const data = await response.json();
    await fetchNotifications();
    return data as { clearedCount?: number; remainingRequests?: number };
  }, [fetchNotifications]);

  const approve = useCallback(
    async (id: string) => {
      await apiFetch(`/api/admin/profile-requests/${id}/approve`, { method: 'POST' });
      await fetchNotifications();
    },
    [fetchNotifications]
  );

  const reject = useCallback(
    async (id: string) => {
      await apiFetch(`/api/admin/profile-requests/${id}/reject`, { method: 'POST' });
      await fetchNotifications();
    },
    [fetchNotifications]
  );

  return {
    notifications,
    loading,
    error,
    unreadCount,
    pendingCount,
    refresh: fetchNotifications,
    markRead,
    remove,
    clearAll,
    approve,
    reject,
  };
}
