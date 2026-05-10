import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { getAuthState, AUTH_CHANGED_EVENT } from './utils/auth';
import Cover from './components/Cover';
import LettersIndex from './components/LettersIndex';
import WorksheetRouter from './components/WorksheetRouter';
import Profile from './components/Profile';
import FeedbackButton from './components/FeedbackButton';
import AdminLogin from './components/AdminLogin';
import AdminDashboard from './components/AdminDashboard';
import DevLogin from './components/DevLogin';
import './App.css';
import { CourseAvailabilityProvider } from './context/CourseAvailabilityContext';
import { useCourseState } from './utils/courseState';

interface AppRoutesProps {
  isAuthed: boolean;
  adminSession: string | null;
  handleAdminLogin: (sessionToken: string) => void;
}

const AppRoutes: React.FC<AppRoutesProps> = ({ isAuthed, adminSession, handleAdminLogin }) => {
  const location = useLocation();
  const [course] = useCourseState();

  React.useEffect(() => {
    const isAdminRoute = location.pathname.startsWith('/admin');
    const isEnglishLearnerRoute = !isAdminRoute && course === 'english';
    const dir = isAdminRoute || isEnglishLearnerRoute ? 'ltr' : 'rtl';
    const lang = isAdminRoute || isEnglishLearnerRoute ? 'en' : 'ar';

    document.documentElement.setAttribute('dir', dir);
    document.documentElement.setAttribute('lang', lang);
    document.body.setAttribute('dir', dir);
  }, [location.pathname, course]);

  return (
    <div className="App">
      <Routes>
        <Route path="/" element={<Cover />} />
        <Route path="/letters" element={isAuthed ? <LettersIndex /> : <Navigate to="/" replace />} />
        <Route path="/worksheet/:letter" element={isAuthed ? <WorksheetRouter /> : <Navigate to="/" replace />} />
        <Route path="/profile" element={isAuthed ? <Profile /> : <Navigate to="/" replace />} />
        <Route path="/admin" element={<AdminLogin onLoginSuccess={handleAdminLogin} />} />
        <Route path="/admin/dashboard" element={
          adminSession ? <AdminDashboard sessionToken={adminSession} /> : <Navigate to="/admin" replace />
        } />
        <Route path="/dev" element={<DevLogin onLoginSuccess={handleAdminLogin} />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
      <FeedbackButton toEmail={process.env.REACT_APP_FEEDBACK_EMAIL || 'visiblevoices@qra.jo'} />
    </div>
  );
};

function App() {
  const [isAuthed, setIsAuthed] = React.useState(getAuthState().isAuthenticated);
  const [adminSession, setAdminSession] = useState<string | null>(
    localStorage.getItem('adminToken')
  );

  React.useEffect(() => {
    const handler = () => setIsAuthed(getAuthState().isAuthenticated);
    window.addEventListener(AUTH_CHANGED_EVENT as any, handler as any);
    window.addEventListener('storage', handler);
    return () => {
      window.removeEventListener(AUTH_CHANGED_EVENT as any, handler as any);
      window.removeEventListener('storage', handler);
    };
  }, []);

  const handleAdminLogin = (sessionToken: string) => {
    localStorage.setItem('adminToken', sessionToken);
    setAdminSession(sessionToken);
  };

  // Only use basename in production/GitHub Pages
  const routerBasename = process.env.NODE_ENV === 'production' ? process.env.PUBLIC_URL : '';

  return (
    <CourseAvailabilityProvider>
      <Router basename={routerBasename}>
        <AppRoutes
          isAuthed={isAuthed}
          adminSession={adminSession}
          handleAdminLogin={handleAdminLogin}
        />
      </Router>
    </CourseAvailabilityProvider>
  );
}

export default App;
