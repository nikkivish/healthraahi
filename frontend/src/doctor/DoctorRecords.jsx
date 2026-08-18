import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { getDoctorRecords } from '../api';
import { useLanguage } from '../i18n/LanguageContext';

function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function DoctorRecords() {
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

    getDoctorRecords(token)
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
          <h1>{t('doctor.records.title')}</h1>
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
          <h1>{t('doctor.records.title')}</h1>
        </div>
        <div className="auth-error">{error}</div>
      </div>
    );
  }

  return (
    <div className="records-page">
      <div className="page-header">
        <h1>{t('doctor.records.title')}</h1>
      </div>

      <div className="records-table-wrapper">
        <table className="records-table">
          <thead>
            <tr>
              <th>{t('doctor.records.worker')}</th>
              <th>{t('doctor.records.date')}</th>
              <th>{t('doctor.records.recordType')}</th>
              <th>{t('doctor.records.titleCol')}</th>
              <th>{t('doctor.records.category')}</th>
              <th>{t('doctor.records.action')}</th>
            </tr>
          </thead>
          <tbody>
            {records.length === 0 ? (
              <tr>
                <td colSpan={6} className="empty-table-cell">
                  {t('doctor.records.noRecords')}
                </td>
              </tr>
            ) : (
              records.map((record) => (
                <tr key={record.id}>
                  <td>
                    <div className="record-worker-cell">
                      <span className="record-worker-name">{record.workerName || '—'}</span>
                      <span className="record-worker-id">{record.workerHealthId || record.workerId}</span>
                    </div>
                  </td>
                  <td>{formatDate(record.createdAt)}</td>
                  <td>
                    <span className="record-type-badge">{record.recordType}</span>
                  </td>
                  <td>{record.title || '—'}</td>
                  <td>{record.category || '—'}</td>
                  <td>
                    <button
                      className="view-btn"
                      type="button"
                      onClick={() => navigate(`/doctor/records/${record.id}`)}
                    >
                      {t('doctor.records.view')}
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

export default DoctorRecords;
