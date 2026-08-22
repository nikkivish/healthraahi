import { useState } from 'react';
import { Outlet, NavLink, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { useLanguage } from '../i18n/LanguageContext';

function DoctorLayout() {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const { t } = useLanguage();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const sidebarNav = [
    { to: '/doctor/dashboard', label: t('common.dashboard'), icon: '⊞' },
    { to: '/doctor/profile', label: t('doctor.dashboard.myProfile'), icon: '◉' },
    { to: '/doctor/verification', label: t('doctor.dashboard.verification'), icon: '✓' },
    { to: '/doctor/hospital', label: t('doctor.dashboard.hospital'), icon: '⊕' },
    { to: '/doctor/workers', label: t('doctor.dashboard.workers'), icon: '☰' },
    { to: '/doctor/access', label: t('doctor.dashboard.workerAccess') || 'Worker Access', icon: '🔍' },
    { to: '/doctor/consents', label: t('doctor.dashboard.consentRequests'), icon: '◈' },
    { to: '/doctor/records', label: t('doctor.dashboard.clinicalRecords'), icon: '⊞' },
    { to: '/doctor/camps', label: t('camps.doctorCamps'), icon: '🏥' },
    { to: '/', label: t('common.home'), icon: '⌂' },
  ];

  return (
    <div className="worker-layout">
      <aside className={`worker-sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-brand">
          <Link to="/" className="sidebar-logo" onClick={() => setSidebarOpen(false)}>
            ✦ HealthRaahi
          </Link>
        </div>

        <nav className="sidebar-nav">
          {sidebarNav.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
              onClick={() => setSidebarOpen(false)}
            >
              <span className="sidebar-icon">{item.icon}</span>
              {item.label}
            </NavLink>
          ))}
        </nav>

        <div className="sidebar-footer">
          <button className="sidebar-logout" type="button" onClick={() => { logout(); navigate('/login', { replace: true }); }}>
            <span className="sidebar-icon">⏻</span>
            {t('common.logout')}
          </button>
        </div>
      </aside>

      <div className={`sidebar-overlay ${sidebarOpen ? 'visible' : ''}`} onClick={() => setSidebarOpen(false)} />

      <div className="worker-main">
        <header className="worker-topbar">
          <button className="hamburger" type="button" aria-label="Toggle menu" onClick={() => setSidebarOpen(!sidebarOpen)}>
            ☰
          </button>
          <span className="worker-topbar-brand">✦ HealthRaahi</span>
        </header>

        <div className="worker-content">
          <Outlet />
        </div>
      </div>
    </div>
  );
}

export default DoctorLayout;
