import { useState } from 'react';
import { Outlet, NavLink, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { useLanguage } from '../i18n/LanguageContext';

function AdminLayout() {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const { t } = useLanguage();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const sidebarNav = [
    { to: '/admin/dashboard', label: t('common.dashboard'), icon: '⊞' },
    { to: '/admin/workers', label: t('admin.workers.title'), icon: '☰' },
    { to: '/admin/doctors', label: t('admin.doctors.title'), icon: '◉' },
    { to: '/admin/hospitals', label: t('admin.hospitals.title'), icon: '⊕' },
    { to: '/admin/camps', label: t('camps.adminManageCamps'), icon: '🏥' },
    { to: '/admin/records', label: t('admin.records.title'), icon: '⊞' },
    { to: '/admin/consents', label: t('admin.consents.title'), icon: '◈' },
    { to: '/admin/audit', label: t('admin.audit.title'), icon: '⊞' },
    { to: '/', label: t('common.home'), icon: '⌂' },
  ];

  return (
    <div className="worker-layout">
      <aside className={`worker-sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-brand">
          <Link to="/" className="sidebar-logo" onClick={() => setSidebarOpen(false)}>
            ✦ HealthRaahi
          </Link>
          <span className="sidebar-role-badge">Admin</span>
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
          <span className="worker-topbar-role">Admin Panel</span>
        </header>

        <div className="worker-content">
          <Outlet />
        </div>
      </div>
    </div>
  );
}

export default AdminLayout;
