import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { getAuthState, AUTH_CHANGED_EVENT } from './utils/auth';
import Cover from './components/Cover';
import LettersIndex from './components/LettersIndex';
import WorksheetRouter from './components/WorksheetRouter';
import Profile from './components/Profile';
import FeedbackButton from './components/FeedbackButton';
import AdminLogin from './components/AdminLogin';
import AdminDashboard from './components/AdminDashboard';
import './App.css';
import { CourseAvailabilityProvider } from './context/CourseAvailabilityContext';

function App() {
  const [isAuthed, setIsAuthed] = React.useState(getAuthState().isAuthenticated);
  const [adminSession, setAdminSession] = useState<string | null>(
    localStorage.getItem('admin_session')
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
    localStorage.setItem('admin_session', sessionToken);
    setAdminSession(sessionToken);
  };

  return (
    <CourseAvailabilityProvider>
    <Router basename={process.env.PUBLIC_URL}>
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
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        <FeedbackButton toEmail={process.env.REACT_APP_FEEDBACK_EMAIL || 'porpoise90947@aminating.com'} />
      </div>
    </Router>
    </CourseAvailabilityProvider>
  );
}

export default App;
