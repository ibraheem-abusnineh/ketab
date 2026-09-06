import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import UserManagement from './UserManagement';
import Statistics from './Statistics';
import UserLoginHistory from './UserLoginHistory';
import ProfileRequests from './ProfileRequests';
import Reports from './Reports';
import CourseManagement from './CourseManagement';
import './AdminDashboard.css';
import { apiFetch } from '../utils/api';

interface Notification {
  id: string;
  type: 'profile_update' | 'profile_edit_request';
  userId: string;
  userName: string;
  timestamp: string;
  changes: {
    field: string;
    oldValue: string;
    newValue: string;
  }[];
  read: boolean;
  status?: 'pending' | 'approved' | 'rejected';
  approvedAt?: string;
  rejectedAt?: string;
}

interface Props {
  sessionToken: string;
}

const AdminDashboard: React.FC<Props> = ({ sessionToken }) => {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [visitCount, setVisitCount] = useState<number>(0);
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [activeTab, setActiveTab] = useState<'statistics' | 'users' | 'history' | 'notifications' | 'requests' | 'reports' | 'courses'>('statistics');
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const navigate = useNavigate();

  const fetchVisitCount = async () => {
    try {
      const response = await apiFetch('/api/visit-count');
      const data = await response.json();
      setVisitCount(data.totalVisits);
      setLastUpdated(new Date());
      setError('');
    } catch (error: any) {
      setError(error.message || 'Failed to fetch visit count');
    } finally {
      setLoading(false);
    }
  };

  const fetchNotifications = async () => {
    try {
      const response = await apiFetch('/api/admin/notifications');
      const data = await response.json();
      setNotifications(data.notifications || []);
      // Count unread and pending requests
      setUnreadCount((data.notifications || []).filter((n: Notification) => 
        !n.read || (n.type === 'profile_edit_request' && n.status === 'pending')
      ).length);
    } catch (error) {
      console.error('Error fetching notifications:', error);
    }
  };

  const markNotificationAsRead = async (notificationId: string) => {
    try {
      await apiFetch(`/api/admin/notifications/${notificationId}/read`, {
        method: 'POST'
      });
      setNotifications(notifications.map(n => 
        n.id === notificationId ? { ...n, read: true } : n
      ));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  };

  const deleteNotification = async (notificationId: string) => {
    const notification = notifications.find(n => n.id === notificationId);
    
    // Don't allow deleting profile edit requests
    if (notification && notification.type === 'profile_edit_request') {
      alert('Profile edit requests cannot be deleted. Please approve or reject them instead.');
      return;
    }
    
    if (!window.confirm('Are you sure you want to delete this notification?')) {
      return;
    }
    try {
      await apiFetch(`/api/admin/notifications/${notificationId}`, {
        method: 'DELETE'
      });
      await fetchNotifications();
    } catch (error: any) {
      console.error('Error deleting notification:', error);
      alert(error.message || 'Failed to delete notification');
    }
  };

  const clearAllNotifications = async () => {
    const regularNotifications = notifications.filter(n => n.type !== 'profile_edit_request');
    const pendingRequests = notifications.filter(n => n.type === 'profile_edit_request' && n.status === 'pending');
    
    if (regularNotifications.length === 0) {
      alert('No notifications to clear. Profile edit requests are preserved.');
      return;
    }
    
    const message = `Are you sure you want to clear ${regularNotifications.length} notification(s)?\n\n` +
      `Note: Profile edit requests (${pendingRequests.length} pending) will be preserved and cannot be cleared.`;
    
    if (!window.confirm(message)) {
      return;
    }
    try {
      const response = await apiFetch('/api/admin/notifications', {
        method: 'DELETE'
      });
      const data = await response.json();
      await fetchNotifications();
      if (data.remainingRequests > 0) {
        alert(`Cleared ${data.clearedCount} notification(s). ${data.remainingRequests} profile edit request(s) preserved.`);
      }
    } catch (error: any) {
      console.error('Error clearing notifications:', error);
      alert(error.message || 'Failed to clear notifications');
    }
  };

  useEffect(() => {
    // Initial fetch
    fetchVisitCount();
    fetchNotifications();
    
    // Set up polling every 10 seconds
    const interval = setInterval(() => {
      fetchVisitCount();
      fetchNotifications();
    }, 10000);
    
    return () => clearInterval(interval);
  }, []);

  const handleLogout = () => {
    // Clear any admin session data
    localStorage.removeItem('adminToken');
    navigate('/admin');
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('en-US', { timeZone: 'Asia/Amman' });
  };

  const handleApproveRequest = async (requestId: string) => {
    try {
      await apiFetch(`/api/admin/profile-requests/${requestId}/approve`, {
        method: 'POST'
      });
      await fetchNotifications();
      await fetchVisitCount(); // Refresh data
    } catch (error: any) {
      console.error('Error approving request:', error);
      alert(error.message || 'Failed to approve request');
    }
  };

  const handleRejectRequest = async (requestId: string) => {
    if (!window.confirm('Are you sure you want to reject this profile edit request?')) {
      return;
    }
    try {
      await apiFetch(`/api/admin/profile-requests/${requestId}/reject`, {
        method: 'POST'
      });
      await fetchNotifications();
    } catch (error: any) {
      console.error('Error rejecting request:', error);
      alert(error.message || 'Failed to reject request');
    }
  };

  const resetPasswordForm = () => {
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setPasswordError('');
    setPasswordMessage('');
  };

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError('');
    setPasswordMessage('');

    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordError('All password fields are required.');
      return;
    }

    if (newPassword.length < 6) {
      setPasswordError('New password must be at least 6 characters.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('New password and confirmation do not match.');
      return;
    }

    try {
      setPasswordLoading(true);
      const response = await apiFetch('/api/admin/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          currentPassword,
          newPassword
        })
      });
      const data = await response.json();
      setPasswordMessage(data.message || 'Password changed successfully.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error: any) {
      setPasswordError(error.message || 'Failed to change password.');
    } finally {
      setPasswordLoading(false);
    }
  };

  const renderNotifications = () => (
    <div className="notifications-container">
      <div className="notifications-header">
        <h2>Notifications {unreadCount > 0 && <span className="badge">{unreadCount}</span>}</h2>
        {notifications.length > 0 && (
          <button 
            className="clear-all-btn" 
            onClick={clearAllNotifications}
            title="Clear all notifications"
          >
            🗑️ Clear All
          </button>
        )}
      </div>
      {notifications.length === 0 ? (
        <div className="no-notifications">
          <p>No notifications available</p>
        </div>
      ) : (
        <div className="notifications-list">
          {notifications.map(notification => {
            const isRequest = notification.type === 'profile_edit_request';
            const isPending = isRequest && notification.status === 'pending';
            
            return (
              <div 
                key={notification.id} 
                className={`notification-item ${!notification.read || isPending ? 'unread' : ''} ${isPending ? 'pending-request' : ''}`}
                onClick={() => !notification.read && !isPending && markNotificationAsRead(notification.id)}
              >
                <div className="notification-header">
                  <span className="notification-user">{notification.userName}</span>
                  <span className="notification-time">{formatDate(notification.timestamp)}</span>
                </div>
                <div className="notification-content">
                  <p>
                    {isRequest 
                      ? notification.status === 'pending' 
                        ? 'Requested to update their profile:' 
                        : notification.status === 'approved'
                        ? 'Profile update approved:'
                        : 'Profile update rejected:'
                      : 'Updated their profile:'}
                  </p>
                  <ul className="changes-list">
                    {notification.changes.map((change, index) => (
                      <li key={index}>
                        <strong>{change.field}</strong>: "{change.oldValue || 'empty'}" → "{change.newValue}"
                      </li>
                    ))}
                  </ul>
                  {isPending && (
                    <div className="request-actions" onClick={(e) => e.stopPropagation()}>
                      <button 
                        className="approve-btn" 
                        onClick={() => handleApproveRequest(notification.id)}
                      >
                        ✓ Approve
                      </button>
                      <button 
                        className="reject-btn" 
                        onClick={() => handleRejectRequest(notification.id)}
                      >
                        ✗ Reject
                      </button>
                    </div>
                  )}
                  {isRequest && notification.status === 'approved' && notification.approvedAt && (
                    <div className="request-status approved">
                      Approved on {formatDate(notification.approvedAt)}
                    </div>
                  )}
                  {isRequest && notification.status === 'rejected' && notification.rejectedAt && (
                    <div className="request-status rejected">
                      Rejected on {formatDate(notification.rejectedAt)}
                    </div>
                  )}
                </div>
                {/* Don't show delete button for profile edit requests */}
                {notification.type !== 'profile_edit_request' && (
                  <button 
                    className="delete-notification-btn"
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteNotification(notification.id);
                    }}
                    title="Delete notification"
                  >
                    ×
                  </button>
                )}
                {(!notification.read || isPending) && (
                  <div className="notification-badge">
                    {isPending ? 'Pending' : 'New'}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );

  return (
    <div className="admin-dashboard">
      <div className="dashboard-header">
        <h1>Admin Dashboard</h1>
        <div className="header-actions">
          <button
            onClick={() => {
              setShowPasswordForm(prev => !prev);
              resetPasswordForm();
            }}
            className="admin-password-btn"
          >
            Change Password
          </button>
          <button onClick={() => navigate('/')} className="admin-home-btn">
            View Site
          </button>
          <button onClick={handleLogout} className="admin-logout-btn">
            Logout
          </button>
        </div>
      </div>

      <div className="dashboard-tabs">
        <button 
          className={`tab-button ${activeTab === 'statistics' ? 'active' : ''}`}
          onClick={() => setActiveTab('statistics')}
        >
          📊 Statistics
        </button>
        <button 
          className={`tab-button ${activeTab === 'users' ? 'active' : ''}`}
          onClick={() => setActiveTab('users')}
        >
          👥 User Management
        </button>
        <button 
          className={`tab-button ${activeTab === 'history' ? 'active' : ''}`}
          onClick={() => setActiveTab('history')}
        >
          📋 Login History
        </button>
        <button
          className={`tab-button ${activeTab === 'notifications' ? 'active' : ''}`}
          onClick={() => setActiveTab('notifications')}
        >
          🔔 Notifications {unreadCount > 0 && <span className="badge">{unreadCount}</span>}
        </button>
        <button
          className={`tab-button ${activeTab === 'requests' ? 'active' : ''}`}
          onClick={() => setActiveTab('requests')}
        >
          📝 Profile Requests
        </button>
        <button
          className={`tab-button ${activeTab === 'reports' ? 'active' : ''}`}
          onClick={() => setActiveTab('reports')}
        >
          📊 Reports
        </button>
        <button
          className={`tab-button ${activeTab === 'courses' ? 'active' : ''}`}
          onClick={() => setActiveTab('courses')}
        >
          🎓 Courses
        </button>
      </div>

      <div className="dashboard-content">
        {showPasswordForm && (
          <div className="password-card">
            <h2>Change Admin Password</h2>
            <form className="password-form" onSubmit={handleChangePassword}>
              <label>
                Current Password
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  autoComplete="current-password"
                  required
                />
              </label>
              <label>
                New Password
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  autoComplete="new-password"
                  minLength={6}
                  required
                />
              </label>
              <label>
                Confirm New Password
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  autoComplete="new-password"
                  minLength={6}
                  required
                />
              </label>
              <div className="password-actions">
                <button type="submit" className="save-password-btn" disabled={passwordLoading}>
                  {passwordLoading ? 'Saving...' : 'Save Password'}
                </button>
                <button
                  type="button"
                  className="cancel-password-btn"
                  onClick={() => {
                    setShowPasswordForm(false);
                    resetPasswordForm();
                  }}
                  disabled={passwordLoading}
                >
                  Cancel
                </button>
              </div>
            </form>
            {passwordError && <p className="password-error">{passwordError}</p>}
            {passwordMessage && <p className="password-success">{passwordMessage}</p>}
          </div>
        )}

        {error && (
          <div className="error-message">
            <p>{error}</p>
          </div>
        )}

        {activeTab === 'statistics' && <Statistics />}
        {activeTab === 'users' && <UserManagement />}
        {activeTab === 'history' && <UserLoginHistory />}
        {activeTab === 'notifications' && renderNotifications()}
        {activeTab === 'requests' && <ProfileRequests />}
        {activeTab === 'reports' && <Reports />}
        {activeTab === 'courses' && <CourseManagement />}
      </div>
    </div>
  );
};

export default AdminDashboard;
