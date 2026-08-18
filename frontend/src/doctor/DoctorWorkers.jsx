import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { lookupWorkerByHealthId } from '../api';
import { useLanguage } from '../i18n/LanguageContext';

function DoctorWorkers() {
  const { token } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState('');
  const [worker, setWorker] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searched, setSearched] = useState(false);

  const handleSearch = async () => {
    const q = searchQuery.trim();
    if (!q) {
      setError(t('doctor.workers.pleaseEnterHealthId'));
      return;
    }

    setLoading(true);
    setError('');
    setWorker(null);
    setSearched(true);

    try {
      const res = await lookupWorkerByHealthId(token, q);
      setWorker(res.data.worker);
    } catch (err) {
      setError(err.message || t('doctor.workers.workerNotFound'));
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleSearch();
  };

  return (
    <div className="workers-page">
      <div className="page-header">
        <h1>{t('doctor.workers.title')}</h1>
      </div>

      <div className="search-bar">
        <input
          type="text"
          className="search-input"
          placeholder={t('doctor.workers.searchPlaceholder')}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onKeyDown={handleKeyDown}
        />
        <button className="primary-btn" type="button" onClick={handleSearch} disabled={loading} style={{ marginLeft: '10px', flexShrink: 0 }}>
          {loading ? t('common.searching') : 'Search'}
        </button>
      </div>

      {error && <div className="auth-error">{error}</div>}

      <div className="worker-list">
        {worker && (
          <div className="worker-list-card">
            <div className="worker-list-info">
              <span className="worker-list-name">{worker.name}</span>
              <span className="worker-list-id">{worker.healthId}</span>
            </div>
            <div className="worker-list-actions">
              <span className={`worker-status-badge ${worker.isActive ? 'active' : 'inactive'}`}>
                {worker.isActive ? 'Active' : 'Inactive'}
              </span>
              <button
                className="view-btn"
                type="button"
                onClick={() => navigate(`/doctor/workers/${encodeURIComponent(worker.healthId)}`)}
              >
                {t('common.viewProfile')}
              </button>
            </div>
          </div>
        )}
        {searched && !loading && !worker && !error && (
          <div className="consent-empty">{t('doctor.workers.noWorkerFound')}</div>
        )}
        {!searched && (
          <div className="consent-empty">{t('doctor.workers.enterHealthId')}</div>
        )}
      </div>
    </div>
  );
}

export default DoctorWorkers;
