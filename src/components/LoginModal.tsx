import React, { useState } from 'react';
import { loginWithNationalNumber, loginAsGuest } from '../utils/auth';
import './LoginModal.css';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const LoginModal: React.FC<Props> = ({ isOpen, onClose, onSuccess }) => {
  const [nationalNumber, setNationalNumber] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    loginWithNationalNumber(nationalNumber)
      .then((ok) => {
        if (ok) {
          setError('');
          onSuccess();
          onClose();
        } else {
          setError('الرقم الوطني غير صحيح');
        }
      })
      .catch(() => setError('فشل تسجيل الدخول'))
      .finally(() => setLoading(false));
  };

  const handleGuestLogin = () => {
    setLoading(true);
    loginAsGuest()
      .then((ok) => {
        if (ok) {
          setError('');
          onSuccess();
          onClose();
        }
      })
      .catch(() => setError('فشل دخول الضيف'))
      .finally(() => setLoading(false));
  };

  return (
    <div className="login-overlay" onClick={onClose}>
      <div className="login-modal" onClick={(e) => e.stopPropagation()}>
        <button className="login-close" onClick={onClose}>&times;</button>
        <div className="login-title">تسجيل الدخول</div>
        <form onSubmit={handleSubmit} className="login-form">
          <label>
            الرقم الوطني
            <input value={nationalNumber} onChange={(e) => setNationalNumber(e.target.value)} placeholder="9781048130" type="text" required />
          </label>
          <p>للدعم الفني والاستفسار: التواصل مع هاتف :  0792022316</p>
          {error && <div className="login-error">{error}</div>}
          <div className="login-buttons">
            <button type="submit" className="login-ok" disabled={loading}>
              {loading ? '...' : 'دخول'}
            </button>
            <button type="button" className="login-guest" onClick={handleGuestLogin} disabled={loading}>
              {loading ? '...' : 'دخول كضيف'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default LoginModal;

