import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { loginWithNationalNumber, clearAuthOnStart, getLastNationalNumber, loginAsGuest } from '../utils/auth';

const Cover: React.FC = () => {
  const navigate = useNavigate();
  const [showNotice, setShowNotice] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [nationalNumber, setNationalNumber] = useState('');
  const [guestFullName, setGuestFullName] = useState('');
  const [guestPhoneNumber, setGuestPhoneNumber] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Clear auth on mount and load last national number
  useEffect(() => {
    // Always clear authentication so users start from cover page
    clearAuthOnStart();
    
    // Load last entered national number
    const lastNationalNumber = getLastNationalNumber();
    if (lastNationalNumber) {
      setNationalNumber(lastNationalNumber);
    }
  }, []);

  const handleEnter = () => {
    // Always show login form (auth is cleared on mount)
    setShowLogin(true);
    // Restore last national number if it exists and field is empty
    if (!nationalNumber) {
      const lastNationalNumber = getLastNationalNumber();
      if (lastNationalNumber) {
        setNationalNumber(lastNationalNumber);
      }
    }
  };

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    loginWithNationalNumber(nationalNumber)
      .then((ok) => {
        if (ok) {
          setError('');
          navigate('/letters');
        } else {
          setError('الرقم الوطني غير صحيح');
        }
      })
      .catch(() => setError('فشل تسجيل الدخول'))
      .finally(() => setLoading(false));
  };

  const handleGuestLogin = () => {
    const trimmedName = guestFullName.trim();
    const trimmedPhone = guestPhoneNumber.trim();
    if (!trimmedName || !trimmedPhone) {
      setError('الاسم الكامل ورقم الهاتف مطلوبان لدخول الضيف');
      return;
    }

    setLoading(true);
    loginAsGuest(trimmedName, trimmedPhone)
      .then((ok) => {
        if (ok) {
          setError('');
          navigate('/letters');
        }
      })
      .catch(() => setError('فشل دخول الضيف'))
      .finally(() => setLoading(false));
  };

  const handleCloseLogin = () => {
    setShowLogin(false);
    setError('');
    // Keep the national number value (don't clear it)
    // It will be restored from localStorage if user opens login again
  };

  useEffect(() => {
    setShowNotice(true);
  }, []);

  // Polling removed; App now reacts to auth change and handles redirect.

  return (
    <div className="min-h-screen flex justify-center items-center text-center p-0">
      <div className="flex flex-col lg:flex-row items-center justify-center gap-5 w-full max-w-[2000px]">
        <div className="shrink-0">
          <img 
            src={`${process.env.PUBLIC_URL}/cover.png`} 
            alt="غلاف الكتاب" 
            className="block h-[100vh] w-[90vw] lg:w-[70vw] max-w-[600px] lg:max-w-[700px] max-h-screen object-contain" 
          />
        </div>
        
        <div className="flex items-center justify-center w-full max-w-[400px] lg:min-w-[300px]">
          {!showLogin ? (
            <button 
              className="bg-[#84333c] text-white border-none rounded-lg py-[18px] px-[48px] text-[1.3em] font-bold cursor-pointer shadow-[0_4px_16px_rgba(132,51,60,0.12)] transition-all duration-300 w-full hover:bg-[#a45a64] hover:scale-105" 
              onClick={handleEnter}
            >
              الدخول
            </button>
          ) : (
            <div className="bg-white border-[3px] border-[#84333c] rounded-xl p-6 w-full max-w-[400px] shadow-[0_12px_28px_rgba(0,0,0,0.2)] relative">
              <button 
                className="absolute top-2 right-2.5 bg-transparent border-none text-[26px] text-[#84333c] cursor-pointer p-0 w-[30px] h-[30px] flex items-center justify-center rounded-full transition-colors duration-200 hover:bg-[#f0f0f0]" 
                onClick={handleCloseLogin}
              >
                &times;
              </button>
              <div className="text-[1.5em] text-[#84333c] font-[800] text-center mb-5 mt-2.5">تسجيل الدخول</div>
              <form onSubmit={handleLoginSubmit} className="flex flex-col gap-3">
                <label className="flex flex-col text-[#5a2428] font-[600] gap-1.5 text-right">
                  الرقم الوطني
                  <input 
                    className="border-2 border-[#84333c] rounded-lg py-[10px] px-[12px] text-[1em] w-full box-border"
                    value={nationalNumber} 
                    onChange={(e) => setNationalNumber(e.target.value)} 
                    placeholder="9781048130" 
                    type="text" 
                    required 
                    autoFocus
                  />
                </label>
                <label className="flex flex-col text-[#5a2428] font-[600] gap-1.5 text-right">
                  الاسم الكامل (للضيف)
                  <input
                    className="border-2 border-[#84333c] rounded-lg py-[10px] px-[12px] text-[1em] w-full box-border"
                    value={guestFullName}
                    onChange={(e) => setGuestFullName(e.target.value)}
                    placeholder="الاسم الكامل"
                    type="text"
                  />
                </label>
                <label className="flex flex-col text-[#5a2428] font-[600] gap-1.5 text-right">
                  رقم الهاتف (للضيف)
                  <input
                    className="border-2 border-[#84333c] rounded-lg py-[10px] px-[12px] text-[1em] w-full box-border"
                    value={guestPhoneNumber}
                    onChange={(e) => setGuestPhoneNumber(e.target.value)}
                    placeholder="07XXXXXXXX"
                    type="tel"
                  />
                </label>
                <p className="text-[0.9em] text-[#5a2428] my-2 text-center">للدعم الفني والاستفسار: التواصل مع هاتف :  0792022316</p>
                {error && <div className="text-[#b00020] font-[700] text-center">{error}</div>}
                <div className="flex gap-3 mt-1.5">
                  <button 
                    type="submit" 
                    className="bg-[#84333c] text-white border-none rounded-lg py-[10px] px-[24px] text-[1em] cursor-pointer transition-colors duration-200 flex-1 hover:bg-[#a45a64] disabled:opacity-60 disabled:cursor-not-allowed" 
                    disabled={loading}
                  >
                    {loading ? '...' : 'دخول'}
                  </button>
                  <button 
                    type="button" 
                    className="bg-[#fdf2f3] text-[#84333c] border-2 border-[#84333c] rounded-lg py-[8px] px-[24px] text-[1em] cursor-pointer transition-all duration-200 flex-1 font-[600] hover:bg-[#f8e1e3] disabled:opacity-60 disabled:cursor-not-allowed" 
                    onClick={handleGuestLogin} 
                    disabled={loading || !guestFullName.trim() || !guestPhoneNumber.trim()}
                  >
                    {loading ? '...' : 'دخول كضيف'}
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>

      {showNotice && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-[1000]" onClick={() => setShowNotice(false)}>
          <div className="bg-white border-[3px] border-[#84333c] rounded-xl w-[90vw] max-w-[700px] p-[24px_24px_18px_24px] text-center relative shadow-[0_12px_28px_rgba(0,0,0,0.2)]" onClick={(e) => e.stopPropagation()}>
            <button className="absolute top-2 right-2.5 bg-transparent border-none text-[28px] text-[#84333c] cursor-pointer" onClick={() => setShowNotice(false)}>&times;</button>
            <div className="text-[1.6em] text-[#84333c] font-[800] mb-2.5">تنبيه</div>
            <div className="text-[1.1em] text-[#5a2428] my-2 leading-relaxed">
              <p className="mb-4">
                جميع الحقوق محفوظة © لجمعية جائزة الملكة رانيا العبدالله للتميز التربوي . أي استخدام غير قانوني ، يخضع للمساءلة القانونية.
              </p>
              <p className="font-bold">
                المنصة مجانية بالكامل و لجميع المستخدمين .
              </p>
            </div>
            <button className="mt-[14px] bg-[#84333c] text-white border-none rounded-lg py-[10px] px-[24px] text-[1em] cursor-pointer hover:bg-[#a45a64]" onClick={() => setShowNotice(false)}>حسناً</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Cover;
