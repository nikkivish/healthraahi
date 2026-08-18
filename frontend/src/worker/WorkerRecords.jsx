import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { useLanguage } from '../i18n/LanguageContext';
import { getWorkerRecords } from '../api';

function formatDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function WorkerRecords() {
  const { token } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');

    getWorkerRecords(token)
      .then((res) => {
        if (!cancelled) setRecords(res.data.records || []);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message || 'Failed to load records');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [token]);

  if (loading) {
    return (
      <div className="records-page">
        <div className="page-header">
          <h1>{t('worker.records.title')}</h1>
        </div>
        <div className="auth-card" style={{ textAlign: 'center', padding: '40px' }}>
          <p>{t('common.loadingRecords')}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="records-page">
        <div className="page-header">
          <h1>{t('worker.records.title')}</h1>
        </div>
        <div className="auth-error">{error}</div>
      </div>
    );
  }

  return (
    <div className="records-page">
      <div className="page-header">
        <h1>{t('worker.records.title')}</h1>
      </div>

      <div className="records-table-wrapper">
        <table className="records-table">
          <thead>
            <tr>
              <th>{t('worker.records.date')}</th>
              <th>{t('worker.records.recordType')}</th>
              <th>{t('worker.records.titleCol')}</th>
              <th>{t('worker.records.category')}</th>
              <th>{t('worker.records.doctor')}</th>
              <th>{t('worker.records.action')}</th>
            </tr>
          </thead>
          <tbody>
            {records.length === 0 ? (
              <tr>
                <td colSpan={6} className="empty-table-cell">
                  {t('worker.records.noRecords')}
                </td>
              </tr>
            ) : (
              records.map((record) => (
                <tr key={record.id}>
                  <td>{formatDate(record.createdAt)}</td>
                  <td>
                    <span className="record-type-badge">{record.recordType}</span>
                  </td>
                  <td>{record.title || '—'}</td>
                  <td>{record.category || '—'}</td>
                  <td>{record.doctorName || '—'}</td>
                  <td>
                    <button
                      className="view-btn"
                      type="button"
                      onClick={() => navigate(`/worker/records/${record.id}`)}
                    >
                      {t('worker.records.view')}
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default WorkerRecords;
