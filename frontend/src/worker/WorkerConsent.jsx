import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../auth/AuthContext';
import { useLanguage } from '../i18n/LanguageContext';
import { getWorkerConsents, approveConsent, rejectConsent, revokeConsent } from '../api';

function formatDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function WorkerConsent() {
  const { token } = useAuth();
  const { t } = useLanguage();
  const [activeTab, setActiveTab] = useState('ACTIVE');
  const [consentList, setConsentList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState(null);

  const tabs = [
    { key: 'ACTIVE', label: t('worker.consent.active') },
    { key: 'PENDING', label: t('worker.consent.pending') },
    { key: 'REVOKED', label: t('worker.consent.revokedExpired') },
  ];

  const fetchConsents = useCallback(() => {
    setLoading(true);
    setError('');
    getWorkerConsents(token)
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
    if (activeTab === 'REVOKED') {
      return c.status === 'REVOKED' || c.status === 'EXPIRED';
    }
    return c.status === activeTab;
  });

  const handleAction = async (id, action) => {
    setActionLoading(id);
    try {
      if (action === 'approve') await approveConsent(token, id);
      else if (action === 'reject') await rejectConsent(token, id);
      else if (action === 'revoke') await revokeConsent(token, id);
      fetchConsents();
    } catch (err) {
      setError(err.message || `Failed to ${action} consent`);
    } finally {
      setActionLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="consent-page">
        <div className="page-header">
          <h1>{t('worker.consent.title')}</h1>
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
        <h1>{t('worker.consent.title')}</h1>
      </div>
      <p className="page-subtitle">{t('worker.consent.subtitle')}</p>

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
          <div className="consent-empty">{t('worker.consent.noConsents')}</div>
        )}
        {filtered.map((consent) => (
          <div key={consent.id} className="consent-card">
            <div className="consent-card-header">
              <div>
                <div className="consent-requester">{t('worker.consent.doctor')}: {consent.doctorId}</div>
                {consent.hospitalId && (
                  <div className="consent-hospital">{t('worker.consent.hospital')}: {consent.hospitalId}</div>
                )}
              </div>
              <span className={`consent-status ${consent.status.toLowerCase()}`}>
                {consent.status}
              </span>
            </div>

            <div className="consent-details">
              <div className="consent-detail">
                <span className="consent-detail-label">{t('worker.consent.categories')}</span>
                <span className="consent-detail-value">
                  {consent.categories?.join(', ') || '—'}
                </span>
              </div>
              <div className="consent-detail">
                <span className="consent-detail-label">{t('worker.consent.purpose')}</span>
                <span className="consent-detail-value">{consent.purpose || '—'}</span>
              </div>
              <div className="consent-detail">
                <span className="consent-detail-label">{t('worker.consent.requested')}</span>
                <span className="consent-detail-value">{formatDate(consent.createdAt)}</span>
              </div>
              <div className="consent-detail">
                <span className="consent-detail-label">{t('worker.consent.validFrom')}</span>
                <span className="consent-detail-value">{formatDate(consent.validFrom)}</span>
              </div>
              <div className="consent-detail">
                <span className="consent-detail-label">{t('worker.consent.validUntil')}</span>
                <span className="consent-detail-value">{formatDate(consent.validUntil)}</span>
              </div>
            </div>

            <div className="consent-actions">
              {consent.status === 'PENDING' && (
                <>
                  <button
                    className="consent-btn approve"
                    type="button"
                    disabled={actionLoading === consent.id}
                    onClick={() => handleAction(consent.id, 'approve')}
                  >
                    {actionLoading === consent.id ? t('worker.consent.approving') : t('worker.consent.approve')}
                  </button>
                  <button
                    className="consent-btn reject"
                    type="button"
                    disabled={actionLoading === consent.id}
                    onClick={() => handleAction(consent.id, 'reject')}
                  >
                    {actionLoading === consent.id ? t('worker.consent.rejecting') : t('worker.consent.reject')}
                  </button>
                </>
              )}
              {(consent.status === 'APPROVED' || consent.status === 'PENDING') && (
                <button
                  className="consent-btn revoke"
                  type="button"
                  disabled={actionLoading === consent.id}
                  onClick={() => handleAction(consent.id, 'revoke')}
                >
                  {actionLoading === consent.id ? t('worker.consent.revoking') : t('worker.consent.revoke')}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default WorkerConsent;
