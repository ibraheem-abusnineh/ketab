import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getAuthState, logout } from '../utils/auth';
import { useCourseState, CourseType } from '../utils/courseState';
import { lettersData, lettersOrder } from '../data/lettersData';
import './Profile.css';
import { apiFetch } from '../utils/api';
import { useCourseAvailability } from '../context/CourseAvailabilityContext';

interface ProfileData {
  nationalNumber: string;
  name: string;
  role: string;
  school: string;
  phone: string;
  directorate: string;
  totalLogins: number;
  firstLogin: string | null;
  lastLogin: string | null;
}

interface EditableFields {
  name: string;
  phone: string;
  school: string;
  directorate: string;
}

const Profile: React.FC = () => {
  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [course, setCourse] = useCourseState();
  const navigate = useNavigate();
  const [isEditing, setIsEditing] = useState(false);
  const [editedData, setEditedData] = useState<EditableFields | null>(null);
  const [saveLoading, setSaveLoading] = useState(false);
  const [lockedCourse, setLockedCourse] = useState<CourseType | null>(null);
  const { courses: availability } = useCourseAvailability();

  useEffect(() => {
    const auth = getAuthState();
    if (!auth.isAuthenticated || !auth.user) {
      navigate('/', { replace: true });
      return;
    }

    if (auth.user.nationalNumber === 'GUEST') {
      setProfileData({
        nationalNumber: 'GUEST',
        name: auth.user.name || 'ضيف',
        role: 'guest',
        school: 'زيارة عامة',
        phone: auth.user.phone || '',
        directorate: '',
        totalLogins: 1,
        firstLogin: new Date().toISOString(),
        lastLogin: new Date().toISOString(),
      });
      setLoading(false);
    } else {
      fetchProfileData(auth.user.nationalNumber);
    }
  }, [navigate]);

  const fetchProfileData = async (nationalNumber: string) => {
    try {
      setLoading(true);
  const response = await apiFetch(`/api/user/profile/${nationalNumber}`);
      // Try to parse JSON; if server returned HTML (index.html) the content-type won't be JSON
      const contentType = response.headers.get('content-type') || '';
      if (response.ok) {
        if (contentType.includes('application/json')) {
          const data = await response.json();
          setProfileData(data.data);
          setError('');
        } else {
          const text = await response.text();
          // likely HTML (unexpected) - surface a helpful error
          setError('استجابة غير متوقعة من الخادم. ' + (text.slice(0,200)));
        }
      } else {
        if (contentType.includes('application/json')) {
          const errorData = await response.json();
          setError(errorData.error || 'فشل تحميل الملف الشخصي');
        } else {
          const text = await response.text();
          setError('فشل تحميل الملف الشخصي: ' + (text.slice(0,200)));
        }
      }
    } catch (error) {
      setError('خطأ في الشبكة. يرجى التحقق من اتصالك.');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/', { replace: true });
  };

  const handleBackToLetters = () => {
    navigate('/letters');
  };

  const handleEdit = () => {
    if (profileData) {
      setEditedData({
        name: profileData.name,
        phone: profileData.phone,
        school: profileData.school,
        directorate: profileData.directorate
      });
      setIsEditing(true);
    }
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditedData(null);
  };

  const handleSave = async () => {
    if (!profileData || !editedData) return;

    setSaveLoading(true);
    try {
      // Submit a profile edit request instead of directly updating
      const response = await apiFetch(`/api/user/profile/${profileData.nationalNumber}/request-edit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(editedData)
      });
      const contentType = response.headers.get('content-type') || '';
      if (response.ok) {
        if (contentType.includes('application/json')) {
          const data = await response.json();
          // Show success message
          setError(''); // Clear any errors
          alert('تم إرسال طلب تعديل الملف الشخصي بنجاح. في انتظار موافقة المدير.');
          setIsEditing(false);
          setEditedData(null);
        } else {
          const text = await response.text();
          setError('استجابة غير متوقعة أثناء الحفظ: ' + text.slice(0,200));
        }
      } else {
        if (contentType.includes('application/json')) {
          const errorData = await response.json();
          setError(errorData.error || 'فشل إرسال طلب تعديل الملف الشخصي');
        } else {
          const text = await response.text();
          setError('فشل إرسال طلب تعديل الملف الشخصي: ' + text.slice(0,200));
        }
      }
    } catch (error) {
      setError('خطأ في الشبكة. يرجى التحقق من اتصالك.');
    } finally {
      setSaveLoading(false);
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      timeZone: 'Asia/Amman'
    });
  };

  const formatTime = (dateString: string | null) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      timeZone: 'Asia/Amman'
    });
  };

  if (loading) {
    return (
      <div className="profile-container">
        <div className="loading-spinner">
          <div className="spinner"></div>
          <p>جاري تحميل الملف الشخصي...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="profile-container">
        <div className="error-message">
          <p>❌ {error}</p>
          <button onClick={() => window.location.reload()} className="retry-btn">
            إعادة المحاولة
          </button>
        </div>
      </div>
    );
  }

  if (!profileData) {
    return (
      <div className="profile-container">
        <div className="error-message">
          <p>❌ لا توجد بيانات ملف شخصي متاحة</p>
        </div>
      </div>
    );
  }

  return (
    <div className="profile-container">
      <div className="profile-header">
        <h1 className="profile-title">ملفي الشخصي</h1>
          <div className="profile-actions">
            <button onClick={handleBackToLetters} className="back-btn">
              ← العودة إلى الحروف
            </button>
            <button onClick={handleLogout} className="logout-btn">
              تسجيل الخروج
            </button>
          </div>
        </div>

        {profileData.nationalNumber === 'GUEST' ? (
          <div className="bg-white rounded-xl shadow-lg border-[3px] border-[#84333c] p-10 text-center my-10">
            <h2 className="text-2xl text-[#84333c] font-bold mb-4">أنت مسجل كضيف</h2>
            <p className="text-lg text-[#5a2428]">مرحباً بك في منصة كتاب. يمكنك تصفح المحتوى التعليمي واستخدام الحروف.</p>
          </div>
        ) : (
          <div className="profile-grid">
            {/* Personal Information Card */}
            <div className="profile-card personal-info">
              <div className="card-header">
                <h2 className="card-title">المعلومات الشخصية</h2>
                {!isEditing ? (
                    <button onClick={handleEdit} className="edit-btn">
                    ✏️ تعديل
                  </button>
                ) : (
                  <div className="edit-actions">
                    <button onClick={handleSave} className="save-btn" disabled={saveLoading}>
                      {saveLoading ? 'جاري الإرسال...' : '📤 إرسال الطلب'}
                    </button>
                    <button onClick={handleCancelEdit} className="cancel-btn" disabled={saveLoading}>
                      ❌ إلغاء
                    </button>
                  </div>
                )}
              </div>
              <div className="info-grid">
                <div className="info-item">
                  <label>الاسم</label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={editedData?.name || ''}
                      onChange={(e) => setEditedData(prev => ({ ...prev!, name: e.target.value }))}
                      className="edit-input"
                    />
                  ) : (
                    <span>{profileData.name}</span>
                  )}
                </div>
                <div className="info-item">
                  <label>الرقم الوطني</label>
                  <span>{profileData.nationalNumber}</span>
                </div>
                <div className="info-item">
                  <label>الدور</label>
                  <span className={`role-badge role-${profileData.role}`}>
                    {profileData.role}
                  </span>
                </div>
                <div className="info-item">
                  <label>المدرسة</label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={editedData?.school || ''}
                      onChange={(e) => setEditedData(prev => ({ ...prev!, school: e.target.value }))}
                      className="edit-input"
                    />
                  ) : (
                    <span>{profileData.school || 'غير متوفر'}</span>
                  )}
                </div>
                <div className="info-item">
                  <label>الهاتف</label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={editedData?.phone || ''}
                      onChange={(e) => setEditedData(prev => ({ ...prev!, phone: e.target.value.replace(/\D/g, '').slice(0, 10) }))}
                      className="edit-input"
                      pattern="\d{10}"
                      title="رقم الهاتف يجب أن يكون 10 أرقام"
                      inputMode="numeric"
                    />
                  ) : (
                    <span>{profileData.phone || 'غير متوفر'}</span>
                  )}
                </div>
                <div className="info-item">
                  <label>المديرية</label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={editedData?.directorate || ''}
                      onChange={(e) => setEditedData(prev => ({ ...prev!, directorate: e.target.value }))}
                      className="edit-input"
                    />
                  ) : (
                    <span>{profileData.directorate || 'غير متوفر'}</span>
                  )}
                </div>
              </div>
            </div>

            {/* Login Statistics Card */}
            <div className="profile-card login-stats">
              <h2 className="card-title">إحصائيات الدخول</h2>
              <div className="stats-grid">
                <div className="stat-item">
                  <div className="stat-number">{profileData.totalLogins}</div>
                  <div className="stat-label">إجمالي الدخول</div>
                </div>
                <div className="stat-item">
                  <div className="stat-date">{formatDate(profileData.firstLogin)}</div>
                  <div className="stat-label">أول دخول</div>
                </div>
                <div className="stat-item">
                  <div className="stat-date">{formatDate(profileData.lastLogin)}</div>
                  <div className="stat-label">آخر دخول</div>
                </div>
              </div>
            </div>

            {/* Course Selection Card */}
            <div className="profile-card course-selection">
              <h2 className="card-title">اختيار المحتوى</h2>
              <div className="course-buttons">
                <button 
                  className={`course-button ${course === 'arabic' ? 'active' : ''}`}
                  onClick={() => {
                    setCourse('arabic');
                    navigate('/letters');
                  }}
                >
                  اللغة العربية
                </button>
                <button
                  className={`course-button ${course === 'english' ? 'active' : ''} ${availability.english.locked ? 'locked' : ''}`}
                  onClick={() => {
                    const isDev = getAuthState().user?.role === 'developer';
                    if (!isDev && availability.english.locked) {
                      setLockedCourse('english');
                      return;
                    }
                    setCourse('english');
                    navigate('/letters');
                  }}
                >
                  {availability.english.locked ? '🔒 اللغة الإنجليزية' : 'اللغة الإنجليزية'}
                </button>
              </div>
            </div>

            {/* Recent Activity Card - per-event history not preserved (ADR-0004 / #14) */}
            <div className="profile-card recent-activity">
              <h2 className="card-title">النشاط الأخير</h2>
              <div className="no-activity">
                <p>سجل الدخول التفصيلي غير محفوظ في هذه الصفحة. راجع إجمالي الدخول وأول وآخر دخول في الأعلى.</p>
              </div>
            </div>
          </div>
        )}

      <div className="profile-footer">
        <div className="footer-info">
          <p>للدعم الفني والاستفسار: التواصل مع هاتف :  0792022316</p>
        </div>
      </div>

      {lockedCourse && (
        <div className="coming-soon-overlay" onClick={() => setLockedCourse(null)}>
          <div className="coming-soon-modal" onClick={(e) => e.stopPropagation()}>
            <button className="coming-soon-close" onClick={() => setLockedCourse(null)}>&times;</button>
            <div className="coming-soon-title">المحتوى مقفل</div>
            <div className="coming-soon-content">
              <p>
                {'محتوى اللغة الإنجليزية مقفل حالياً.'}
              </p>
            </div>
            <button className="coming-soon-ok" onClick={() => setLockedCourse(null)}>حسناً</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Profile;
