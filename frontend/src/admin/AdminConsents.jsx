import { useState, useEffect } from 'react';
import { useAuth } from '../auth/AuthContext';
import { getAdminOverview } from '../api';
import { useLanguage } from '../i18n/LanguageContext';

function AdminConsents() {
  const { token } = useAuth();
  const { t } = useLanguage();
  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    getAdminOverview(token)
      .then((res) => {
        setOverview(res.data.overview);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [token]);

  const consent = overview?.consent || {};

  return (
    <div className="workers-page">
      <div className="page-header">
        <h1>{t('admin.consents.title')}</h1>
        <span className="page-count">{loading ? '...' : `${overview?.totals?.consents || 0} ${t('common.total')}`}</span>
      </div>

      <div className="admin-info-banner">
        <p>{t('admin.consents.banner')}</p>
      </div>

      {!loading && (
        <div className="admin-stats-grid" style={{ marginTop: '1.5rem' }}>
          <div className="admin-stat-card">
            <span className="admin-stat-icon">✓</span>
            <div className="admin-stat-content">
              <span className="admin-stat-value">{consent.approved || 0}</span>
              <span className="admin-stat-label">{t('admin.consents.approved')}</span>
            </div>
          </div>
          <div className="admin-stat-card">
            <span className="admin-stat-icon">⏳</span>
            <div className="admin-stat-content">
              <span className="admin-stat-value">{consent.pending || 0}</span>
              <span className="admin-stat-label">{t('admin.consents.pending')}</span>
            </div>
          </div>
          <div className="admin-stat-card">
            <span className="admin-stat-icon">⊘</span>
            <div className="admin-stat-content">
              <span className="admin-stat-value">{consent.revoked || 0}</span>
              <span className="admin-stat-label">{t('admin.consents.revoked')}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminConsents;
