import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './admin/admin.css';
import { apiFetch } from '../utils/api';
import Icon, { IconName } from './admin/Icons';
import { AdminTab } from './admin/types';
import { useNotifications } from './admin/useNotifications';
import OverviewPage from './admin/pages/OverviewPage';
import StatisticsPage from './admin/pages/StatisticsPage';
import ReportsPage from './admin/pages/ReportsPage';
import UsersPage from './admin/pages/UsersPage';
import LoginHistoryPage from './admin/pages/LoginHistoryPage';
import ProfileRequestsPage from './admin/pages/ProfileRequestsPage';
import NotificationsPage from './admin/pages/NotificationsPage';
import CoursesPage from './admin/pages/CoursesPage';
import DataPage from './admin/pages/DataPage';

interface Props {
  sessionToken: string;
}

interface NavItem {
  id: AdminTab;
  label: string;
  icon: IconName;
}

interface NavGroup {
  label: string;
  items: NavItem[];
}

const NAV_GROUPS: NavGroup[] = [
  {
    label: 'Monitor',
    items: [
      { id: 'overview', label: 'Overview', icon: 'grid' },
      { id: 'statistics', label: 'Statistics', icon: 'chart' },
      { id: 'reports', label: 'Reports', icon: 'document' },
      { id: 'history', label: 'Login history', icon: 'clock' },
    ],
  },
  {
    label: 'Manage',
    items: [
      { id: 'users', label: 'Users', icon: 'users' },
      { id: 'requests', label: 'Profile requests', icon: 'inbox' },
      { id: 'notifications', label: 'Inbox', icon: 'bell' },
    ],
  },
  {
    label: 'System',
    items: [
      { id: 'courses', label: 'Courses', icon: 'layers' },
      { id: 'data', label: 'Backup & restore', icon: 'database' },
    ],
  },
];

const TAB_TITLES: Record<AdminTab, string> = {
  overview: 'Overview',
  statistics: 'Statistics',
  reports: 'Reports',
  history: 'Login history',
  users: 'Users',
  requests: 'Profile requests',
  notifications: 'Inbox',
  courses: 'Courses',
  data: 'Backup & restore',
};

const TAB_META: Record<AdminTab, string> = {
  overview: 'The state of the platform today',
  statistics: 'Traffic, schools, and activity patterns',
  reports: 'Build, export, and print a period report',
  history: 'Every user, every login, on one ledger',
  users: 'The directory of parents, teachers, and staff',
  requests: 'Review profile changes before they go live',
  notifications: 'Profile updates and pending requests',
  courses: 'Control which courses learners can open',
  data: 'Download a backup, restore it after a re-clone',
};

const AdminDashboard: React.FC<Props> = ({ sessionToken }) => {
  const [activeTab, setActiveTab] = useState<AdminTab>('overview');
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const navigate = useNavigate();

  const inbox = useNotifications(15000);

  const resetPasswordForm = () => {
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');
    setPasswordError('');
    setPasswordMessage('');
  };

  const closePasswordForm = () => {
    setShowPasswordForm(false);
    resetPasswordForm();
  };

  const handleChangePassword = async (event: React.FormEvent) => {
    event.preventDefault();
    setPasswordError('');
    setPasswordMessage('');

    if (!currentPassword || !newPassword || !confirmPassword) {
      setPasswordError('All password fields are required.');
      return;
    }
    if (newPassword.length < 6) {
      setPasswordError('The new password must be at least 6 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('The new password and confirmation do not match.');
      return;
    }

    try {
      setPasswordLoading(true);
      const response = await apiFetch('/api/admin/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await response.json();
      setPasswordMessage(data.message || 'Password changed.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error: any) {
      setPasswordError(error.message || 'Could not change the password.');
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('adminToken');
    navigate('/admin');
  };

  const todayLabel = new Date().toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });

  return (
    <div className="admin-shell" data-session={sessionToken ? 'active' : 'none'}>
      <aside className="admin-sidebar">
        <div className="admin-brand">
          <div className="admin-brand__row">
            <div className="admin-brand__glyph" aria-hidden="true">ك</div>
            <div>
              <div className="admin-brand__name">KETAB</div>
              <div className="admin-brand__sub">ADMIN DESK</div>
            </div>
          </div>
          <p className="admin-brand__note">سجلّ المدرسة الرقمي</p>
        </div>

        <nav className="admin-nav" aria-label="Admin sections">
          {NAV_GROUPS.map((group) => (
            <div className="admin-nav__group" key={group.label}>
              <div className="admin-nav__label">{group.label}</div>
              {group.items.map((item) => (
                <button
                  type="button"
                  key={item.id}
                  className={`admin-nav__item ${activeTab === item.id ? 'active' : ''}`}
                  onClick={() => setActiveTab(item.id)}
                  aria-current={activeTab === item.id ? 'page' : undefined}
                >
                  <Icon name={item.icon} className="admin-nav__icon" />
                  <span>{item.label}</span>
                  {item.id === 'notifications' && inbox.unreadCount > 0 && (
                    <span className="admin-nav__badge">{inbox.unreadCount}</span>
                  )}
                </button>
              ))}
            </div>
          ))}
        </nav>

        <div className="admin-sidebar__foot">
          <button type="button" onClick={() => setShowPasswordForm(true)}>
            <Icon name="key" size={14} />
            <span>Change password</span>
          </button>
          <button type="button" onClick={() => navigate('/')}>
            <Icon name="home" size={14} />
            <span>View site</span>
          </button>
          <button type="button" onClick={handleLogout}>
            <Icon name="logout" size={14} />
            <span>Log out</span>
          </button>
        </div>
      </aside>

      <main className="admin-main">
        <header className="admin-topbar">
          <div>
            <h1 className="admin-topbar__title">{TAB_TITLES[activeTab]}</h1>
            <div className="admin-topbar__meta">
              {todayLabel} · {TAB_META[activeTab]}
            </div>
          </div>
          <div className="admin-topbar__actions">
            <span className="admin-live">
              <span className="admin-live__dot" />
              Live data
            </span>
            <button
              type="button"
              className="btn btn--sm btn--ghost"
              onClick={() => navigate('/')}
            >
              View site
            </button>
          </div>
        </header>

        <div className="admin-content">
          {activeTab === 'overview' && (
            <OverviewPage
              onNavigate={setActiveTab}
              notifications={inbox.notifications}
              unreadCount={inbox.unreadCount}
              pendingCount={inbox.pendingCount}
              onRefreshInbox={inbox.refresh}
            />
          )}
          {activeTab === 'statistics' && <StatisticsPage />}
          {activeTab === 'reports' && <ReportsPage />}
          {activeTab === 'history' && <LoginHistoryPage />}
          {activeTab === 'users' && <UsersPage />}
          {activeTab === 'requests' && <ProfileRequestsPage />}
          {activeTab === 'notifications' && (
            <NotificationsPage
              notifications={inbox.notifications}
              loading={inbox.loading}
              error={inbox.error}
              unreadCount={inbox.unreadCount}
              onRefresh={inbox.refresh}
              onMarkRead={inbox.markRead}
              onRemove={inbox.remove}
              onClearAll={inbox.clearAll}
              onApprove={inbox.approve}
              onReject={inbox.reject}
              onOpenRequests={() => setActiveTab('requests')}
            />
          )}
          {activeTab === 'courses' && <CoursesPage />}
          {activeTab === 'data' && <DataPage />}
        </div>
      </main>

      {showPasswordForm && (
        <div className="modal-backdrop" onClick={closePasswordForm}>
          <div className="modal-card" onClick={(event) => event.stopPropagation()}>
            <div className="modal-card__head">
              <h3>Change admin password</h3>
              <button
                type="button"
                className="modal-close"
                onClick={closePasswordForm}
                aria-label="Close"
              >
                ×
              </button>
            </div>
            <form onSubmit={handleChangePassword}>
              <div className="modal-card__body">
                <div className="password-form">
                  <div className="field">
                    <label htmlFor="current-password">Current password</label>
                    <input
                      id="current-password"
                      className="input"
                      type="password"
                      value={currentPassword}
                      onChange={(event) => setCurrentPassword(event.target.value)}
                      autoComplete="current-password"
                      required
                    />
                  </div>
                  <div className="field">
                    <label htmlFor="new-password">New password</label>
                    <input
                      id="new-password"
                      className="input"
                      type="password"
                      value={newPassword}
                      onChange={(event) => setNewPassword(event.target.value)}
                      autoComplete="new-password"
                      minLength={6}
                      required
                    />
                  </div>
                  <div className="field">
                    <label htmlFor="confirm-password">Confirm new password</label>
                    <input
                      id="confirm-password"
                      className="input"
                      type="password"
                      value={confirmPassword}
                      onChange={(event) => setConfirmPassword(event.target.value)}
                      autoComplete="new-password"
                      minLength={6}
                      required
                    />
                  </div>
                </div>
                {passwordError && <div className="banner banner--error" style={{ marginTop: 14 }}>{passwordError}</div>}
                {passwordMessage && <div className="banner banner--success" style={{ marginTop: 14 }}>{passwordMessage}</div>}
              </div>
              <div className="modal-card__foot">
                <button type="button" className="btn" onClick={closePasswordForm} disabled={passwordLoading}>
                  Cancel
                </button>
                <button type="submit" className="btn btn--primary" disabled={passwordLoading}>
                  {passwordLoading ? 'Saving…' : 'Save password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
