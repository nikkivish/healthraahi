import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { getClinicalRecord } from '../api';
import { useLanguage } from '../i18n/LanguageContext';

function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatDateTime(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });
}

function WorkerRecordDetail() {
  const { recordId } = useParams();
  const { token } = useAuth();
  const { t } = useLanguage();
  const [record, setRecord] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token || !recordId) return;

    setLoading(true);
    setError('');

    getClinicalRecord(token, recordId)
      .then((res) => {
        setRecord(res.data.record);
      })
      .catch((err) => {
        setError(err.message || t('worker.recordDetail.notFound'));
      })
      .finally(() => {
        setLoading(false);
      });
  }, [token, recordId, t]);

  if (loading) {
    return (
      <div className="record-detail-page">
        <div className="page-header">
          <h1>{t('worker.recordDetail.title')}</h1>
        </div>
        <div className="auth-card" style={{ textAlign: 'center', padding: '40px' }}>
          <p>{t('common.loadingRecords')}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="record-detail-page">
        <div className="page-header">
          <h1>{t('worker.recordDetail.title')}</h1>
        </div>
        <div className="auth-error">{error}</div>
        <div style={{ marginTop: 16 }}>
          <Link to="/worker/records" className="secondary-btn" style={{ textDecoration: 'none' }}>
            {t('worker.recordDetail.backToRecords')}
          </Link>
        </div>
      </div>
    );
  }

  if (!record) return null;

  return (
    <div className="record-detail-page">
      <div className="page-header">
        <h1>{t('worker.recordDetail.title')}</h1>
      </div>

      <div className="record-detail-card">
        <div className="record-detail-header">
          <span className="record-type-badge">{record.recordType}</span>
          <span className="record-detail-date">{formatDate(record.createdAt)}</span>
        </div>

        <div className="record-detail-section">
          <h3>{t('worker.recordDetail.recordInformation')}</h3>
          <div className="worker-profile-fields">
            <div className="worker-profile-field">
              <span className="worker-profile-label">{t('worker.recordDetail.category')}</span>
              <span className="worker-profile-value">{record.category || '—'}</span>
            </div>
            <div className="worker-profile-field">
              <span className="worker-profile-label">{t('worker.recordDetail.title')}</span>
              <span className="worker-profile-value">{record.title || '—'}</span>
            </div>
            <div className="worker-profile-field">
              <span className="worker-profile-label">{t('worker.recordDetail.summary')}</span>
              <span className="worker-profile-value">{record.summary || '—'}</span>
            </div>
            {record.hospitalName && (
              <div className="worker-profile-field">
                <span className="worker-profile-label">{t('worker.recordDetail.hospital')}</span>
                <span className="worker-profile-value">{record.hospitalName}</span>
              </div>
            )}
          </div>
        </div>

        {(record.diagnosis?.length > 0 || record.prescriptions?.length > 0 || record.followUpPlan) && (
          <div className="record-detail-section">
            <h3>{t('worker.recordDetail.clinicalDetails')}</h3>
            <div className="worker-profile-fields">
              {record.diagnosis?.length > 0 && (
                <div className="worker-profile-field">
                  <span className="worker-profile-label">{t('worker.recordDetail.diagnosis')}</span>
                  <span className="worker-profile-value">{record.diagnosis.join(', ')}</span>
                </div>
              )}
              {record.prescriptions?.length > 0 && (
                <div className="worker-profile-field">
                  <span className="worker-profile-label">{t('worker.recordDetail.prescriptions')}</span>
                  <span className="worker-profile-value">{record.prescriptions.join(', ')}</span>
                </div>
              )}
              {record.followUpPlan && (
                <div className="worker-profile-field">
                  <span className="worker-profile-label">{t('worker.recordDetail.followUpPlan')}</span>
                  <span className="worker-profile-value">{record.followUpPlan}</span>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="record-detail-section">
          <h3>{t('worker.recordDetail.metadata')}</h3>
          <div className="worker-profile-fields">
            <div className="worker-profile-field">
              <span className="worker-profile-label">{t('worker.recordDetail.createdBy')}</span>
              <span className="worker-profile-value">{record.doctorName || '—'}</span>
            </div>
            <div className="worker-profile-field">
              <span className="worker-profile-label">{t('worker.recordDetail.createdAt')}</span>
              <span className="worker-profile-value">{formatDateTime(record.createdAt)}</span>
            </div>
          </div>
        </div>

        <div className="worker-profile-actions">
          <Link to="/worker/records" className="secondary-btn" style={{ textDecoration: 'none' }}>
            {t('worker.recordDetail.backToRecords')}
          </Link>
        </div>
      </div>
    </div>
  );
}

export default WorkerRecordDetail;
