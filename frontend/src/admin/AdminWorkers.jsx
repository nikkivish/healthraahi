import { useState, useEffect } from 'react';
import { useAuth } from '../auth/AuthContext';
import { getAdminOverview } from '../api';
import { useLanguage } from '../i18n/LanguageContext';

function AdminWorkers() {
  const { token } = useAuth();
  const { t } = useLanguage();
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    getAdminOverview(token)
      .then((res) => {
        setTotal(res.data.overview?.totals?.workers || 0);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [token]);

  return (
    <div className="workers-page">
      <div className="page-header">
        <h1>{t('admin.workers.title')}</h1>
        <span className="page-count">{loading ? '...' : `${total} ${t('common.registered')}`}</span>
      </div>

      <div className="admin-info-banner">
        <p>{t('admin.workers.banner')}</p>
      </div>
    </div>
  );
}

export default AdminWorkers;
