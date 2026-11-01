import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiFetch } from '../utils/api';
import './admin/admin.css';

interface Props {
  onLoginSuccess: (sessionToken: string) => void;
}

const AdminLogin: React.FC<Props> = ({ onLoginSuccess }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await apiFetch('/api/admin/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (data.success) {
        localStorage.setItem('adminToken', data.sessionToken);
        onLoginSuccess(data.sessionToken);
        navigate('/admin/dashboard');
      } else {
        setError(data.error || 'تعذّر تسجيل الدخول');
      }
    } catch (err: any) {
      setError(err.message || 'حدث خطأ في الشبكة. تأكد من تشغيل الخادم.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="admin-login">
      <aside className="admin-login__brand">
        <div className="admin-login__brand-top">
          <img className="admin-login__logo" src="/admin-logo.png" alt="أصواتٌ تُرى" />
          <div>
            <div className="admin-login__brand-name">أصواتٌ تُرى</div>
            <div className="admin-login__brand-sub">لوحة الإدارة</div>
          </div>
        </div>

        <div className="admin-login__statement">
          <h1>سجلّ المنصّة الرقمي</h1>
          <p>
            كل عملية دخول، وكل مدرسة، وكل تعديل على الملف — في سجل واحد. سجّل الدخول لقراءة
            السجل ومتابعة المنصّة.
          </p>
        </div>

        <div className="admin-login__brand-foot">
          <span>أصواتٌ تُرى · منصّة تعليمية للصم</span>
          <span>جمعية جائزة الملكة رانيا العبدالله</span>
        </div>

        <div className="admin-login__watermark" aria-hidden="true">
          ص
        </div>
      </aside>

      <main className="admin-login__panel">
        <div className="admin-login__form-wrap">
          <div className="admin-login__kicker">للمشرفين فقط</div>
          <h2 className="admin-login__title">الدخول إلى السجل</h2>
          <p className="admin-login__lede">
            استخدم بيانات مدير النظام الخاصة بهذه المنصّة. تنتهي الجلسة عند إغلاق المتصفح أو
            تسجيل الخروج.
          </p>

          <form className="admin-login__form" onSubmit={handleSubmit}>
            <div className="admin-login__field">
              <label htmlFor="admin-username">اسم المستخدم</label>
              <input
                id="admin-username"
                className="admin-login__input"
                type="text"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                placeholder="admin"
                autoComplete="username"
                autoFocus
                required
                disabled={loading}
              />
            </div>

            <div className="admin-login__field">
              <label htmlFor="admin-password">كلمة المرور</label>
              <div style={{ position: 'relative' }}>
                <input
                  id="admin-password"
                  className="admin-login__input"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="أدخل كلمة المرور"
                  autoComplete="current-password"
                  required
                  disabled={loading}
                  style={{ paddingLeft: 68 }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((current) => !current)}
                  style={{
                    position: 'absolute',
                    top: '50%',
                    left: 10,
                    transform: 'translateY(-50%)',
                    border: 0,
                    background: 'transparent',
                    color: 'var(--admin-muted)',
                    fontFamily: 'var(--admin-body)',
                    fontSize: 11,
                    cursor: 'pointer',
                  }}
                >
                  {showPassword ? 'إخفاء' : 'إظهار'}
                </button>
              </div>
            </div>

            {error && (
              <div className="admin-login__error" role="alert">
                {error}
              </div>
            )}

            <button type="submit" className="admin-login__submit" disabled={loading}>
              {loading ? 'جارٍ التحقق…' : 'تسجيل الدخول'}
            </button>
          </form>

          <div className="admin-login__foot">
            <button type="button" className="admin-login__back" onClick={() => navigate('/')}>
              العودة إلى الموقع ←
            </button>
            <span className="admin-login__note">جلسة آمنة</span>
          </div>
        </div>
      </main>
    </div>
  );
};

export default AdminLogin;
