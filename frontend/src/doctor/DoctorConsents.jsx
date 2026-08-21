import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../auth/AuthContext';
import { getDoctorConsents } from '../api';
import { useLanguage } from '../i18n/LanguageContext';

function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function DoctorConsents() {
  const { token } = useAuth();
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState('PENDING');
  const [consentList, setConsentList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const tabs = [
    { key: 'PENDING', label: t('doctor.consents.pending') },
    { key: 'APPROVED', label: t('doctor.consents.active') },
    { key: 'ALL', label: t('doctor.consents.all') },
  ];

  const fetchConsents = useCallback(() => {
    setLoading(true);
    setError('');
    getDoctorConsents(token)
      .then((res) => {
        setConsentList(res.data.consents || []);
      })
      .catch((err) => {
        setError(err.message || 'Failed to load consents');
      })
      .finally(() => {
        setLoading(false);
      });
  }, [token]);

  useEffect(() => {
    fetchConsents();
  }, [fetchConsents]);

  const filtered = consentList.filter((c) => {
    if (activeTab === 'ALL') return true;
    return c.status === activeTab;
  });

  if (loading) {
    return (
      <div className="consent-page">
        <div className="page-header">
          <h1>{t('doctor.consents.title')}</h1>
        </div>
        <div className="auth-card" style={{ textAlign: 'center', padding: '40px' }}>
          <p>{t('common.loadingConsents')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="consent-page">
      <div className="page-header">
        <h1>{t('doctor.consents.title')}</h1>
      </div>

      {error && <div className="auth-error">{error}</div>}

      <div className="consent-tabs">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            className={`consent-tab ${activeTab === tab.key ? 'active' : ''}`}
            type="button"
            onClick={() => setActiveTab(tab.key)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="consent-list">
        {filtered.length === 0 && (
          <div className="consent-empty">{t('doctor.consents.noConsents')}</div>
        )}
        {filtered.map((consent) => (
          <div key={consent.id} className="consent-card">
            <div className="consent-card-header">
              <div>
                <div className="consent-requester">{t('doctor.consents.worker')}: {consent.workerName || consent.workerId}{consent.workerName ? ` (${consent.workerId})` : ''}</div>
                {consent.hospitalId && (
                  <div className="consent-hospital">{t('doctor.consents.hospital')}: {consent.hospitalName || consent.hospitalId}</div>
                )}
              </div>
              <span className={`consent-status ${consent.status.toLowerCase()}`}>
                {consent.status}
              </span>
            </div>

            <div className="consent-details">
              <div className="consent-detail">
                <span className="consent-detail-label">{t('doctor.consents.categories')}</span>
                <span className="consent-detail-value">
                  {consent.categories?.join(', ') || '—'}
                </span>
              </div>
              <div className="consent-detail">
                <span className="consent-detail-label">{t('doctor.consents.purpose')}</span>
                <span className="consent-detail-value">{consent.purpose || '—'}</span>
              </div>
              <div className="consent-detail">
                <span className="consent-detail-label">{t('doctor.consents.requested')}</span>
                <span className="consent-detail-value">{formatDate(consent.createdAt)}</span>
              </div>
              <div className="consent-detail">
                <span className="consent-detail-label">{t('doctor.consents.validFrom')}</span>
                <span className="consent-detail-value">{formatDate(consent.validFrom)}</span>
              </div>
              <div className="consent-detail">
                <span className="consent-detail-label">{t('doctor.consents.validUntil')}</span>
                <span className="consent-detail-value">{formatDate(consent.validUntil)}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default DoctorConsents;
