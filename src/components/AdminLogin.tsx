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
        setError(data.error || 'Login failed');
      }
    } catch (err: any) {
      setError(err.message || 'Network error. Please check if the server is running.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="admin-login">
      <aside className="admin-login__brand">
        <div className="admin-login__brand-top">
          <div className="admin-login__glyph" aria-hidden="true">
            ك
          </div>
          <div>
            <div className="admin-login__brand-name">KETAB</div>
            <div className="admin-login__brand-sub">ADMIN DESK</div>
          </div>
        </div>

        <div className="admin-login__statement">
          <h1>سجلّ المدرسة الرقمي</h1>
          <p>
            Every login, every school, every profile change — kept in one register. Sign in to read
            the ledger and keep the platform in order.
          </p>
        </div>

        <div className="admin-login__brand-foot">
          <span>KETAB · منصة تعليمية للصم</span>
          <span>EST. 2024</span>
        </div>

        <div className="admin-login__watermark" aria-hidden="true">
          ك
        </div>
      </aside>

      <main className="admin-login__panel">
        <div className="admin-login__form-wrap">
          <div className="admin-login__kicker">RESTRICTED · STAFF ONLY</div>
          <h2 className="admin-login__title">Open the register</h2>
          <p className="admin-login__lede">
            Use the administrator credentials issued for this platform. Sessions expire when you
            close the browser or log out.
          </p>

          <form className="admin-login__form" onSubmit={handleSubmit}>
            <div className="admin-login__field">
              <label htmlFor="admin-username">Username</label>
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
              <label htmlFor="admin-password">Password</label>
              <div style={{ position: 'relative' }}>
                <input
                  id="admin-password"
                  className="admin-login__input"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  required
                  disabled={loading}
                  style={{ paddingRight: 64 }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((current) => !current)}
                  style={{
                    position: 'absolute',
                    top: '50%',
                    right: 10,
                    transform: 'translateY(-50%)',
                    border: 0,
                    background: 'transparent',
                    color: 'var(--admin-muted)',
                    fontFamily: 'var(--admin-mono)',
                    fontSize: 9.5,
                    cursor: 'pointer',
                  }}
                >
                  {showPassword ? 'HIDE' : 'SHOW'}
                </button>
              </div>
            </div>

            {error && (
              <div className="admin-login__error" role="alert">
                {error}
              </div>
            )}

            <button type="submit" className="admin-login__submit" disabled={loading}>
              {loading ? 'Checking the register…' : 'Sign in'}
            </button>
          </form>

          <div className="admin-login__foot">
            <button type="button" className="admin-login__back" onClick={() => navigate('/')}>
              ← Back to the site
            </button>
            <span className="admin-login__note">SESSION · ENCRYPTED</span>
          </div>
        </div>
      </main>
    </div>
  );
};

export default AdminLogin;
