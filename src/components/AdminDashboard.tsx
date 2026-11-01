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
    label: 'المتابعة',
    items: [
      { id: 'overview', label: 'نظرة عامة', icon: 'grid' },
      { id: 'statistics', label: 'الإحصاءات', icon: 'chart' },
      { id: 'reports', label: 'التقارير', icon: 'document' },
      { id: 'history', label: 'سجل الدخول', icon: 'clock' },
    ],
  },
  {
    label: 'الإدارة',
    items: [
      { id: 'users', label: 'المستخدمون', icon: 'users' },
      { id: 'requests', label: 'طلبات تعديل الملف', icon: 'inbox' },
      { id: 'notifications', label: 'الإشعارات', icon: 'bell' },
    ],
  },
  {
    label: 'النظام',
    items: [
      { id: 'courses', label: 'المقررات', icon: 'layers' },
      { id: 'data', label: 'النسخ الاحتياطي والاستعادة', icon: 'database' },
    ],
  },
];

const TAB_TITLES: Record<AdminTab, string> = {
  overview: 'نظرة عامة',
  statistics: 'الإحصاءات',
  reports: 'التقارير',
  history: 'سجل الدخول',
  users: 'المستخدمون',
  requests: 'طلبات تعديل الملف',
  notifications: 'الإشعارات',
  courses: 'المقررات',
  data: 'النسخ الاحتياطي والاستعادة',
};

const TAB_META: Record<AdminTab, string> = {
  overview: 'حالة المنصة اليوم',
  statistics: 'الزيارات والمدارس وأنماط النشاط',
  reports: 'بناء التقرير وتصديره وطباعته',
  history: 'كل مستخدم وكل دخول في سجل واحد',
  users: 'دليل أولياء الأمور والمعلمين والموظفين',
  requests: 'مراجعة تعديلات الملف قبل اعتمادها',
  notifications: 'تحديثات الملف والطلبات المعلّقة',
  courses: 'التحكم في المقررات المتاحة للمتعلمين',
  data: 'تنزيل نسخة احتياطية واستعادتها',
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
      setPasswordError('جميع حقول كلمة المرور مطلوبة.');
      return;
    }
    if (newPassword.length < 6) {
      setPasswordError('يجب أن تتكوّن كلمة المرور الجديدة من 6 أحرف على الأقل.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError('كلمة المرور الجديدة وتأكيدها غير متطابقين.');
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
      setPasswordMessage(data.message || 'تم تغيير كلمة المرور.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (error: any) {
      setPasswordError(error.message || 'تعذّر تغيير كلمة المرور.');
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('adminToken');
    navigate('/admin');
  };

  const todayLabel = new Date().toLocaleDateString('ar-JO-u-nu-latn', {
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
            <img className="admin-brand__logo" src="/admin-logo.png" alt="أصواتٌ تُرى" />
            <div>
              <div className="admin-brand__name">أصواتٌ تُرى</div>
              <div className="admin-brand__sub">لوحة الإدارة</div>
            </div>
          </div>
          <p className="admin-brand__note">سجلّ المنصة الرقمي</p>
        </div>

        <nav className="admin-nav" aria-label="أقسام الإدارة">
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
            <span>تغيير كلمة المرور</span>
          </button>
          <button type="button" onClick={() => navigate('/')}>
            <Icon name="home" size={14} />
            <span>عرض الموقع</span>
          </button>
          <button type="button" onClick={handleLogout}>
            <Icon name="logout" size={14} />
            <span>تسجيل الخروج</span>
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
              بيانات مباشرة
            </span>
            <button
              type="button"
              className="btn btn--sm btn--ghost"
              onClick={() => navigate('/')}
            >
              عرض الموقع
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
              <h3>تغيير كلمة مرور المدير</h3>
              <button
                type="button"
                className="modal-close"
                onClick={closePasswordForm}
                aria-label="إغلاق"
              >
                ×
              </button>
            </div>
            <form onSubmit={handleChangePassword}>
              <div className="modal-card__body">
                <div className="password-form">
                  <div className="field">
                    <label htmlFor="current-password">كلمة المرور الحالية</label>
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
                    <label htmlFor="new-password">كلمة المرور الجديدة</label>
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
                    <label htmlFor="confirm-password">تأكيد كلمة المرور الجديدة</label>
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
                  إلغاء
                </button>
                <button type="submit" className="btn btn--primary" disabled={passwordLoading}>
                  {passwordLoading ? 'جارٍ الحفظ…' : 'حفظ كلمة المرور'}
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
