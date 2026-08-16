import { useState, useEffect } from 'react';
import { useAuth } from '../auth/AuthContext';
import { getAdminOverview, getAdminAuditLogs, getPendingDoctors } from '../api';
import { useLanguage } from '../i18n/LanguageContext';

function AdminDashboard() {
  const { token } = useAuth();
  const { t } = useLanguage();
  const [overview, setOverview] = useState(null);
  const [auditLogs, setAuditLogs] = useState([]);
  const [pendingDoctors, setPendingDoctors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    Promise.all([
      getAdminOverview(token),
      getAdminAuditLogs(token, { limit: 8 }),
      getPendingDoctors(token),
    ])
      .then(([overviewRes, auditRes, doctorsRes]) => {
        setOverview(overviewRes.data.overview);
        setAuditLogs(auditRes.data.logs || []);
        setPendingDoctors(doctorsRes.data.profiles || []);
        setLoading(false);
      })
      .catch(() => {
        setError(t('admin.dashboard.failedLoad'));
        setLoading(false);
      });
  }, [token]);

  if (loading) return <div className="dashboard"><p className="loading-text">{t('common.loading')}</p></div>;
  if (error) return <div className="dashboard"><p className="error-text">{error}</p></div>;

  const totals = overview?.totals || {};
  const verification = overview?.verification || {};
  const consent = overview?.consent || {};

  const statCards = [
    { label: t('admin.dashboard.totalWorkers'), value: (totals.workers || 0).toLocaleString(), icon: '☰' },
    { label: t('admin.dashboard.totalDoctors'), value: (totals.doctors || 0).toLocaleString(), icon: '◉' },
    { label: t('admin.dashboard.totalHospitals'), value: (totals.hospitals || 0).toLocaleString(), icon: '⊕' },
    { label: t('admin.dashboard.pendingVerifications'), value: verification.pending || 0, icon: '⏳' },
    { label: t('admin.dashboard.totalClinicalRecords'), value: (totals.clinicalRecords || 0).toLocaleString(), icon: '⊞' },
    { label: t('admin.dashboard.totalConsents'), value: (totals.consents || 0).toLocaleString(), icon: '◈' },
  ];

  const actionLabel = (action) => {
    return t('admin.actionLabels.' + action) || action;
  };

  const roleLabel = (role) => {
    return t('admin.roleLabels.' + role) || role;
  };

  return (
    <div className="dashboard">
      <section className="dashboard-welcome">
        <h1>{t('admin.dashboard.title')}</h1>
        <p>{t('admin.dashboard.subtitle')}</p>
      </section>

      <div className="admin-stats-grid">
        {statCards.map((stat) => (
          <div key={stat.label} className="admin-stat-card">
            <span className="admin-stat-icon">{stat.icon}</span>
            <div className="admin-stat-content">
              <span className="admin-stat-value">{stat.value}</span>
              <span className="admin-stat-label">{stat.label}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="admin-two-col">
        <section className="admin-section-card">
          <h2>{t('admin.dashboard.pendingDoctorVerifications')}</h2>
          <div className="admin-list">
            {pendingDoctors.length === 0 && (
              <div className="admin-list-empty">{t('admin.dashboard.noPendingVerifications')}</div>
            )}
            {pendingDoctors.map((doc) => (
              <div key={doc.id} className="admin-list-item">
                <div className="admin-list-info">
                  <span className="admin-list-name">{doc.fullName}</span>
                  <span className="admin-list-sub">{doc.doctorId}</span>
                </div>
                <div className="admin-list-meta">
                  <span className="admin-role-badge doctor">{t('admin.roleLabels.DOCTOR')}</span>
                  <span className="admin-list-date">{doc.specialization}</span>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="admin-section-card">
          <h2>{t('admin.dashboard.recentActivity')}</h2>
          <div className="admin-list">
            {auditLogs.length === 0 && (
              <div className="admin-list-empty">{t('admin.dashboard.noRecentActivity')}</div>
            )}
            {auditLogs.map((log) => (
              <div key={log.id} className="admin-list-item">
                <div className="admin-list-info">
                  <span className="admin-list-name">{actionLabel(log.action)}</span>
                  <span className="admin-list-sub">{roleLabel(log.actorRole)}</span>
                </div>
                <div className="admin-list-meta">
                  <span className={`admin-activity-dot ${log.result === 'SUCCESS' ? 'success' : log.result === 'DENIED' ? 'denied' : 'failed'}`} />
                  <span className="admin-list-date">
                    {log.createdAt ? new Date(log.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : ''}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

export default AdminDashboard;
