import { useState, useEffect } from 'react';
import { useAuth } from '../auth/AuthContext';
import { getAdminOverview } from '../api';
import { useLanguage } from '../i18n/LanguageContext';

function AdminRecords() {
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
        <h1>{t('admin.records.title')}</h1>
        <span className="page-count">{loading ? '...' : `${overview?.totals?.clinicalRecords || 0} ${t('common.total')}`}</span>
      </div>

      <div className="admin-info-banner">
        <p>{t('admin.records.banner')}</p>
      </div>

      {!loading && (
        <div className="admin-stats-grid" style={{ marginTop: '1.5rem' }}>
          <div className="admin-stat-card">
            <span className="admin-stat-icon">⊞</span>
            <div className="admin-stat-content">
              <span className="admin-stat-value">{overview?.totals?.clinicalRecords || 0}</span>
              <span className="admin-stat-label">{t('admin.records.totalRecords')}</span>
            </div>
          </div>
          <div className="admin-stat-card">
            <span className="admin-stat-icon">◈</span>
            <div className="admin-stat-content">
              <span className="admin-stat-value">{consent.approved || 0}</span>
              <span className="admin-stat-label">{t('admin.records.approvedConsents')}</span>
            </div>
          </div>
          <div className="admin-stat-card">
            <span className="admin-stat-icon">⏳</span>
            <div className="admin-stat-content">
              <span className="admin-stat-value">{consent.pending || 0}</span>
              <span className="admin-stat-label">{t('admin.records.pendingConsents')}</span>
            </div>
          </div>
          <div className="admin-stat-card">
            <span className="admin-stat-icon">⊘</span>
            <div className="admin-stat-content">
              <span className="admin-stat-value">{consent.revoked || 0}</span>
              <span className="admin-stat-label">{t('admin.records.revokedConsents')}</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminRecords;
