import { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './auth/AuthContext';
import { LanguageProvider, useLanguage } from './i18n/LanguageContext';
import Home from './Home';
import Login from './Login';
import Register from './Register';
import WorkerLayout from './worker/WorkerLayout';
import WorkerDashboard from './worker/WorkerDashboard';
import WorkerProfile from './worker/WorkerProfile';
import WorkerRecords from './worker/WorkerRecords';
import WorkerConsent from './worker/WorkerConsent';
import WorkerHealthId from './worker/WorkerHealthId';
import WorkerLookup from './worker/WorkerLookup';
import DoctorLayout from './doctor/DoctorLayout';
import DoctorDashboard from './doctor/DoctorDashboard';
import DoctorProfile from './doctor/DoctorProfile';
import DoctorVerification from './doctor/DoctorVerification';
import DoctorHospital from './doctor/DoctorHospital';
import DoctorWorkers from './doctor/DoctorWorkers';
import DoctorWorkerProfile from './doctor/DoctorWorkerProfile';
import DoctorConsents from './doctor/DoctorConsents';
import DoctorRecords from './doctor/DoctorRecords';
import DoctorRecordDetail from './doctor/DoctorRecordDetail';
import WorkerRecordDetail from './worker/WorkerRecordDetail';
import AdminLayout from './admin/AdminLayout';
import AdminDashboard from './admin/AdminDashboard';
import AdminWorkers from './admin/AdminWorkers';
import AdminDoctors from './admin/AdminDoctors';
import AdminHospitals from './admin/AdminHospitals';
import AdminRecords from './admin/AdminRecords';
import AdminConsents from './admin/AdminConsents';
import AdminAudit from './admin/AdminAudit';
import AdminCamps from './admin/AdminCamps';
import DoctorCamps from './doctor/DoctorCamps';
import WorkerCamps from './worker/WorkerCamps';
import WorkerDocuments from './worker/WorkerDocuments';
import MedicalCamps from './MedicalCamps';
import './App.css';

function AuthGuard({ children, allowedRoles }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="auth-container">
        <div className="auth-card" style={{ textAlign: 'center', padding: '40px' }}>
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    const fallback = { WORKER: '/worker/dashboard', DOCTOR: '/doctor/dashboard', ADMIN: '/admin/dashboard' };
    return <Navigate to={fallback[user.role] || '/'} replace />;
  }

  return children;
}

function AppContent() {
  const location = useLocation();
  const { user, loading } = useAuth();
  const { language, setLanguage, t, availableLanguages } = useLanguage();
  const [langOpen, setLangOpen] = useState(false);
  const isDashboardRoute = (location.pathname.startsWith('/worker') && !location.pathname.startsWith('/worker/lookup')) || location.pathname.startsWith('/doctor') || location.pathname.startsWith('/admin');

  const currentLangName = availableLanguages.find((l) => l.code === language)?.name || 'English';

  const navItems = [
    { label: t('nav.about'), href: '#about' },
    { label: t('nav.howItWorks'), href: '#how-it-works' },
    { label: t('nav.healthcareServices'), href: '#healthcare-services' },
    { label: t('nav.governmentSchemes'), href: '#government-schemes' },
    { label: t('nav.medicalCamps'), href: '#medical-camps' },
  ];

  if (loading && isDashboardRoute) {
    return (
      <div className="page-shell">
        <div className="auth-container">
          <div className="auth-card" style={{ textAlign: 'center', padding: '40px' }}>
            <p>{t('common.loading')}</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-shell">
      {!isDashboardRoute && (
        <header className="topbar">
          <Link to="/" className="brand-text">
            ✦ HealthRaahi
          </Link>

          <nav className="nav-links" aria-label={t('nav.mainNavigation')}>
            {navItems.map((item) => (
              <a key={item.href} href={item.href} className="nav-item">
                {item.label}
              </a>
            ))}
          </nav>

          <div className="nav-actions">
            <div className="language-toggle-wrap">
              <button
                className="language-toggle"
                type="button"
                aria-label={t('nav.selectLanguage')}
                onClick={() => setLangOpen(!langOpen)}
              >
                <span className="lang-icon">🌐</span>
                <span>{currentLangName}</span>
                <span className="caret">▾</span>
              </button>
              {langOpen && (
                <div className="lang-dropdown">
                  {availableLanguages.map((lang) => (
                    <button
                      key={lang.code}
                      className={`lang-option ${language === lang.code ? 'active' : ''}`}
                      onClick={() => { setLanguage(lang.code); setLangOpen(false); }}
                    >
                      {lang.name}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {user ? (
              <Link
                to={user.role === 'WORKER' ? '/worker/dashboard' : user.role === 'DOCTOR' ? '/doctor/dashboard' : '/admin/dashboard'}
                className="login-button"
              >
                {user.name}
              </Link>
            ) : (
              <Link to="/login" className="login-button">
                {t('nav.loginRegister')}
              </Link>
            )}

            <button className="user-button" type="button" aria-label={t('nav.userProfile')}>
              <span>◔</span>
            </button>
          </div>
        </header>
      )}

      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={<Login />} />
        <Route path="/register" element={<Register />} />
        <Route path="/camps" element={<MedicalCamps />} />
        <Route path="/worker" element={
          <AuthGuard allowedRoles={['WORKER']}>
            <WorkerLayout />
          </AuthGuard>
        }>
          <Route index element={<Navigate to="/worker/dashboard" replace />} />
          <Route path="dashboard" element={<WorkerDashboard />} />
          <Route path="profile" element={<WorkerProfile />} />
          <Route path="records" element={<WorkerRecords />} />
          <Route path="records/:recordId" element={<WorkerRecordDetail />} />
          <Route path="consent" element={<WorkerConsent />} />
          <Route path="health-id" element={<WorkerHealthId />} />
          <Route path="camps" element={<WorkerCamps />} />
          <Route path="documents" element={<WorkerDocuments />} />
        </Route>
        <Route path="/worker/lookup/:healthId" element={<WorkerLookup />} />
        <Route path="/doctor" element={
          <AuthGuard allowedRoles={['DOCTOR']}>
            <DoctorLayout />
          </AuthGuard>
        }>
          <Route index element={<Navigate to="/doctor/dashboard" replace />} />
          <Route path="dashboard" element={<DoctorDashboard />} />
          <Route path="profile" element={<DoctorProfile />} />
          <Route path="verification" element={<DoctorVerification />} />
          <Route path="hospital" element={<DoctorHospital />} />
          <Route path="workers" element={<DoctorWorkers />} />
          <Route path="workers/:healthId" element={<DoctorWorkerProfile />} />
          <Route path="consents" element={<DoctorConsents />} />
          <Route path="records" element={<DoctorRecords />} />
          <Route path="records/:recordId" element={<DoctorRecordDetail />} />
          <Route path="camps" element={<DoctorCamps />} />
        </Route>
        <Route path="/admin" element={
          <AuthGuard allowedRoles={['ADMIN']}>
            <AdminLayout />
          </AuthGuard>
        }>
          <Route index element={<Navigate to="/admin/dashboard" replace />} />
          <Route path="dashboard" element={<AdminDashboard />} />
          <Route path="workers" element={<AdminWorkers />} />
          <Route path="doctors" element={<AdminDoctors />} />
          <Route path="hospitals" element={<AdminHospitals />} />
          <Route path="records" element={<AdminRecords />} />
          <Route path="consents" element={<AdminConsents />} />
          <Route path="audit" element={<AdminAudit />} />
          <Route path="camps" element={<AdminCamps />} />
        </Route>
      </Routes>
    </div>
  );
}

function App() {
  return (
    <Router>
      <AuthProvider>
        <LanguageProvider>
          <AppContent />
        </LanguageProvider>
      </AuthProvider>
    </Router>
  );
}

export default App;
