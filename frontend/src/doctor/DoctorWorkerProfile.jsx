import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { getWorkerProfileForDoctor, requestConsent, createClinicalRecord, getWorkerRecords } from '../api';
import { useLanguage } from '../i18n/LanguageContext';

function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function DoctorWorkerProfile() {
  const { healthId } = useParams();
  const { token } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [worker, setWorker] = useState(null);
  const [consent, setConsent] = useState(null);
  const [latestConsent, setLatestConsent] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showConsentModal, setShowConsentModal] = useState(false);
  const [consentLoading, setConsentLoading] = useState(false);
  const [consentSuccess, setConsentSuccess] = useState('');
  const [consentError, setConsentError] = useState('');
  const [consentForm, setConsentForm] = useState({
    categories: [],
    purpose: '',
    validUntil: '',
  });
  const [workerRecords, setWorkerRecords] = useState([]);
  const [recordsLoading, setRecordsLoading] = useState(false);
  const [showRecordModal, setShowRecordModal] = useState(false);
  const [recordLoading, setRecordLoading] = useState(false);
  const [recordSuccess, setRecordSuccess] = useState('');
  const [recordError, setRecordError] = useState('');
  const [recordForm, setRecordForm] = useState({
    recordType: 'CONSULTATION',
    category: '',
    title: '',
    summary: '',
    diagnosis: '',
    prescriptions: '',
    followUpPlan: '',
  });

  const hasMedicalConsent = consent && consent.categories && consent.categories.includes('MEDICAL_RECORDS');

  useEffect(() => {
    if (!token || !healthId) return;

    setLoading(true);
    setError('');

    getWorkerProfileForDoctor(token, healthId)
      .then((res) => {
        setWorker(res.data.worker);
        setConsent(res.data.consent);
        setLatestConsent(res.data.latestConsent || null);
      })
      .catch((err) => {
        setError(err.message || t('doctor.workerProfile.notFound'));
      })
      .finally(() => {
        setLoading(false);
      });
  }, [token, healthId, t]);

  useEffect(() => {
    if (!hasMedicalConsent || !worker?.userId) return;

    setRecordsLoading(true);
    getWorkerRecords(token)
      .then((res) => {
        const allRecords = res.data.records || [];
        const filtered = allRecords.filter((r) => r.workerId === worker.userId);
        setWorkerRecords(filtered);
      })
      .catch(() => {
        setWorkerRecords([]);
      })
      .finally(() => {
        setRecordsLoading(false);
      });
  }, [hasMedicalConsent, worker, token]);

  const genderLabel = (g) => {
    const map = { MALE: t('worker.profile.genderOptions.MALE'), FEMALE: t('worker.profile.genderOptions.FEMALE'), OTHER: t('worker.profile.genderOptions.OTHER'), PREFER_NOT_TO_SAY: t('worker.profile.genderOptions.PREFER_NOT_TO_SAY') };
    return map[g] || g || '—';
  };

  const categoryOptions = [
    { value: 'HEALTH_INFORMATION', label: t('doctor.consentModal.categories.HEALTH_INFORMATION') },
    { value: 'MEDICAL_RECORDS', label: t('doctor.consentModal.categories.MEDICAL_RECORDS') },
    { value: 'GENERAL', label: t('doctor.consentModal.categories.GENERAL') },
  ];

  const recordTypeOptions = [
    { value: 'CONSULTATION', label: 'CONSULTATION' },
    { value: 'DIAGNOSIS', label: 'DIAGNOSIS' },
    { value: 'PRESCRIPTION', label: 'PRESCRIPTION' },
    { value: 'LAB', label: 'LAB' },
    { value: 'TREATMENT', label: 'TREATMENT' },
    { value: 'FOLLOW_UP', label: 'FOLLOW_UP' },
  ];

  const handleCategoryToggle = (catValue) => {
    setConsentForm((prev) => {
      const next = prev.categories.includes(catValue)
        ? prev.categories.filter((c) => c !== catValue)
        : [...prev.categories, catValue];
      return { ...prev, categories: next };
    });
  };

  const openConsentModal = () => {
    setConsentForm({ categories: [], purpose: '', validUntil: '' });
    setConsentError('');
    setShowConsentModal(true);
  };

  const closeConsentModal = () => {
    setShowConsentModal(false);
    setConsentError('');
  };

  const handleConsentSubmit = async (e) => {
    e.preventDefault();
    setConsentError('');

    if (!worker || !worker.userId) {
      setConsentError(t('doctor.consentModal.errors.missingWorker'));
      return;
    }

    if (consentForm.categories.length === 0) {
      setConsentError(t('doctor.consentModal.errors.categoryRequired'));
      return;
    }

    if (!consentForm.purpose.trim()) {
      setConsentError(t('doctor.consentModal.errors.purposeRequired'));
      return;
    }

    if (!consentForm.validUntil) {
      setConsentError(t('doctor.consentModal.errors.validUntilRequired'));
      return;
    }

    const validUntil = new Date(consentForm.validUntil);
    if (isNaN(validUntil.getTime())) {
      setConsentError(t('doctor.consentModal.errors.invalidDate'));
      return;
    }

    const now = new Date();
    if (validUntil <= now) {
      setConsentError(t('doctor.consentModal.errors.validUntilPast'));
      return;
    }

    setConsentLoading(true);

    try {
      await requestConsent(token, {
        workerId: worker.userId,
        categories: consentForm.categories,
        purpose: consentForm.purpose.trim(),
        validUntil: validUntil.toISOString(),
      });

      setShowConsentModal(false);
      setConsentSuccess(t('doctor.consentModal.success'));

      const res = await getWorkerProfileForDoctor(token, healthId);
      setWorker(res.data.worker);
      setConsent(res.data.consent);
      setLatestConsent(res.data.latestConsent || null);
    } catch (err) {
      setConsentError(err.message || t('doctor.consentModal.errors.general'));
    } finally {
      setConsentLoading(false);
    }
  };

  const openRecordModal = () => {
    setRecordForm({
      recordType: 'CONSULTATION',
      category: '',
      title: '',
      summary: '',
      diagnosis: '',
      prescriptions: '',
      followUpPlan: '',
    });
    setRecordError('');
    setRecordSuccess('');
    setShowRecordModal(true);
  };

  const closeRecordModal = () => {
    setShowRecordModal(false);
    setRecordError('');
  };

  const handleRecordSubmit = async (e) => {
    e.preventDefault();
    setRecordError('');

    if (!worker || !worker.userId) {
      setRecordError(t('doctor.createRecord.errors.missingWorker'));
      return;
    }

    if (!consent || !consent.id) {
      setRecordError(t('doctor.createRecord.errors.noConsent'));
      return;
    }

    if (!recordForm.category.trim()) {
      setRecordError(t('doctor.createRecord.errors.categoryRequired'));
      return;
    }

    if (!recordForm.title.trim()) {
      setRecordError(t('doctor.createRecord.errors.titleRequired'));
      return;
    }

    if (!recordForm.summary.trim()) {
      setRecordError(t('doctor.createRecord.errors.summaryRequired'));
      return;
    }

    setRecordLoading(true);

    try {
      const payload = {
        workerId: worker.userId,
        consentId: consent.id,
        recordType: recordForm.recordType,
        category: recordForm.category.trim(),
        title: recordForm.title.trim(),
        summary: recordForm.summary.trim(),
      };

      if (recordForm.diagnosis.trim()) {
        payload.diagnosis = recordForm.diagnosis.split(',').map((s) => s.trim()).filter(Boolean);
      }
      if (recordForm.prescriptions.trim()) {
        payload.prescriptions = recordForm.prescriptions.split(',').map((s) => s.trim()).filter(Boolean);
      }
      if (recordForm.followUpPlan.trim()) {
        payload.followUpPlan = recordForm.followUpPlan.trim();
      }

      await createClinicalRecord(token, payload);

      setShowRecordModal(false);
      setRecordSuccess(t('doctor.createRecord.success'));

      const res = await getWorkerRecords(token);
      const allRecords = res.data.records || [];
      setWorkerRecords(allRecords.filter((r) => r.workerId === worker.userId));
    } catch (err) {
      setRecordError(err.message || t('doctor.createRecord.errors.general'));
    } finally {
      setRecordLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="worker-profile-page">
        <div className="page-header">
          <h1>{t('doctor.workerProfile.title')}</h1>
        </div>
        <div className="auth-card" style={{ textAlign: 'center', padding: '40px' }}>
          <p>{t('common.loadingProfile')}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="worker-profile-page">
        <div className="page-header">
          <h1>{t('doctor.workerProfile.title')}</h1>
        </div>
        <div className="auth-error">{error}</div>
        <div style={{ marginTop: 16 }}>
          <Link to="/doctor/workers" className="secondary-btn" style={{ textDecoration: 'none' }}>
            {t('doctor.workerProfile.backToSearch')}
          </Link>
        </div>
      </div>
    );
  }

  if (!worker) return null;

  return (
    <div className="worker-profile-page">
      <div className="page-header">
        <h1>{t('doctor.workerProfile.title')}</h1>
      </div>

      <div className="worker-profile-card">
        <div className="worker-profile-header">
          <div className="worker-profile-name">{worker.name}</div>
          <div className="worker-profile-id">{worker.healthId}</div>
          <span className={`worker-status-badge ${worker.isActive ? 'active' : 'inactive'}`}>
            {worker.isActive ? t('common.active') : t('common.inactive')}
          </span>
        </div>

        <div className="worker-profile-section">
          <h3>{t('doctor.workerProfile.basicInformation')}</h3>
          <div className="worker-profile-fields">
            <div className="worker-profile-field">
              <span className="worker-profile-label">{t('doctor.workerProfile.fullName')}</span>
              <span className="worker-profile-value">{worker.name || '—'}</span>
            </div>
            <div className="worker-profile-field">
              <span className="worker-profile-label">{t('doctor.workerProfile.phoneNumber')}</span>
              <span className="worker-profile-value">{worker.phone || '—'}</span>
            </div>
            {worker.email && (
              <div className="worker-profile-field">
                <span className="worker-profile-label">{t('doctor.workerProfile.email')}</span>
                <span className="worker-profile-value">{worker.email}</span>
              </div>
            )}
            <div className="worker-profile-field">
              <span className="worker-profile-label">{t('doctor.workerProfile.healthId')}</span>
              <span className="worker-profile-value">{worker.healthId || '—'}</span>
            </div>
            {worker.dateOfBirth && (
              <div className="worker-profile-field">
                <span className="worker-profile-label">{t('doctor.workerProfile.dateOfBirth')}</span>
                <span className="worker-profile-value">{formatDate(worker.dateOfBirth)}</span>
              </div>
            )}
            {worker.gender && (
              <div className="worker-profile-field">
                <span className="worker-profile-label">{t('doctor.workerProfile.gender')}</span>
                <span className="worker-profile-value">{genderLabel(worker.gender)}</span>
              </div>
            )}
          </div>
        </div>

        {consent ? (
          <div className="worker-profile-section">
            <h3>{t('doctor.workerProfile.medicalInformation')}</h3>
            <div className="worker-profile-fields">
              {worker.bloodGroup && (
                <div className="worker-profile-field">
                  <span className="worker-profile-label">{t('doctor.workerProfile.bloodGroup')}</span>
                  <span className="worker-profile-value">{worker.bloodGroup}</span>
                </div>
              )}
              {worker.address && (
                <div className="worker-profile-field">
                  <span className="worker-profile-label">{t('doctor.workerProfile.address')}</span>
                  <span className="worker-profile-value">{worker.address}</span>
                </div>
              )}
              {worker.emergencyContact && (
                <div className="worker-profile-field">
                  <span className="worker-profile-label">{t('doctor.workerProfile.emergencyContact')}</span>
                  <span className="worker-profile-value">
                    {worker.emergencyContact.name} ({worker.emergencyContact.relationship}) — {worker.emergencyContact.phone}
                  </span>
                </div>
              )}
              {worker.allergies && worker.allergies.length > 0 && (
                <div className="worker-profile-field">
                  <span className="worker-profile-label">{t('doctor.workerProfile.allergies')}</span>
                  <span className="worker-profile-value">{worker.allergies.join(', ')}</span>
                </div>
              )}
              {!worker.bloodGroup && !worker.address && !worker.emergencyContact && (!worker.allergies || worker.allergies.length === 0) && (
                <div className="consent-empty">{t('doctor.workerProfile.noMedicalData')}</div>
              )}
            </div>
          </div>
        ) : (
          <div className="worker-profile-section">
            <div className="worker-profile-consent-notice">
              <p>{t('doctor.workerProfile.consentRequired')}</p>
            </div>
          </div>
        )}

        {hasMedicalConsent && (
          <div className="worker-profile-section">
            <div className="worker-profile-section-header">
              <h3>{t('doctor.workerProfile.medicalRecords')}</h3>
              <button
                className="primary-btn"
                type="button"
                onClick={openRecordModal}
              >
                {t('doctor.workerProfile.addRecord')}
              </button>
            </div>
            {recordSuccess && (
              <div className="auth-success" style={{ marginBottom: 12 }}>{recordSuccess}</div>
            )}
            {recordsLoading ? (
              <p style={{ color: 'var(--muted)', fontSize: '0.9rem' }}>{t('common.loadingRecords')}</p>
            ) : workerRecords.length === 0 ? (
              <div className="consent-empty">{t('doctor.workerProfile.noRecords')}</div>
            ) : (
              <div className="worker-records-list">
                {workerRecords.map((record) => (
                  <div key={record.id} className="worker-record-item">
                    <div className="worker-record-item-header">
                      <span className="record-type-badge">{record.recordType}</span>
                      <span className="worker-record-item-date">{formatDate(record.createdAt)}</span>
                    </div>
                    <div className="worker-record-item-title">{record.title || '—'}</div>
                    <div className="worker-record-item-category">{record.category || '—'}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {!hasMedicalConsent && latestConsent && latestConsent.status === 'PENDING' && (
          <div className="worker-profile-section">
            <h3>{t('doctor.workerProfile.medicalRecords')}</h3>
            <div className="worker-profile-consent-notice">
              <p>{t('doctor.workerProfile.consentPending')}</p>
            </div>
          </div>
        )}

        {!hasMedicalConsent && latestConsent && latestConsent.status === 'REJECTED' && (
          <div className="worker-profile-section">
            <h3>{t('doctor.workerProfile.medicalRecords')}</h3>
            <div className="worker-profile-consent-notice">
              <p>{t('doctor.workerProfile.consentRejected')}</p>
            </div>
          </div>
        )}

        {!hasMedicalConsent && latestConsent && (latestConsent.status === 'REVOKED' || latestConsent.status === 'EXPIRED') && (
          <div className="worker-profile-section">
            <h3>{t('doctor.workerProfile.medicalRecords')}</h3>
            <div className="worker-profile-consent-notice">
              <p>{t('doctor.workerProfile.consentRevoked')}</p>
            </div>
          </div>
        )}

        {!hasMedicalConsent && !latestConsent && (
          <div className="worker-profile-section">
            <h3>{t('doctor.workerProfile.medicalRecords')}</h3>
            <div className="worker-profile-consent-notice">
              <p>{t('doctor.workerProfile.medicalConsentRequired')}</p>
            </div>
          </div>
        )}

        <div className="worker-profile-actions">
          {consentSuccess && (
            <div className="auth-success" style={{ marginBottom: 12, width: '100%' }}>{consentSuccess}</div>
          )}
          {(!consent || (latestConsent && (latestConsent.status === 'REJECTED' || latestConsent.status === 'REVOKED' || latestConsent.status === 'EXPIRED'))) && !consentSuccess && (
            <button
              className="primary-btn"
              type="button"
              onClick={openConsentModal}
            >
              {t('doctor.workerProfile.requestConsent')}
            </button>
          )}
          <button
            className="secondary-btn"
            type="button"
            onClick={() => navigate('/doctor/workers')}
          >
            {t('doctor.workerProfile.backToSearch')}
          </button>
        </div>
      </div>

      {showConsentModal && (
        <div className="modal-overlay" onClick={closeConsentModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{t('doctor.consentModal.title')}</h2>
              <button className="modal-close" onClick={closeConsentModal}>×</button>
            </div>
            <form onSubmit={handleConsentSubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">{t('doctor.consentModal.workerLabel')}</label>
                  <div style={{ color: 'var(--text)', fontWeight: 500 }}>{worker.name}</div>
                </div>
                <div className="form-group">
                  <label className="form-label">{t('doctor.consentModal.healthIdLabel')}</label>
                  <div style={{ color: 'var(--text)', fontWeight: 500 }}>{worker.healthId}</div>
                </div>
                <div className="form-group">
                  <label className="form-label">{t('doctor.consentModal.accessLabel')}</label>
                  {categoryOptions.map((opt) => (
                    <label key={opt.value} className="consent-checkbox-label">
                      <input
                        type="checkbox"
                        checked={consentForm.categories.includes(opt.value)}
                        onChange={() => handleCategoryToggle(opt.value)}
                        disabled={consentLoading}
                      />
                      <span>{opt.label}</span>
                    </label>
                  ))}
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="consent-purpose">{t('doctor.consentModal.purposeLabel')}</label>
                  <textarea
                    id="consent-purpose"
                    className="form-input"
                    rows="3"
                    value={consentForm.purpose}
                    onChange={(e) => setConsentForm((prev) => ({ ...prev, purpose: e.target.value }))}
                    disabled={consentLoading}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="consent-valid-until">{t('doctor.consentModal.validUntilLabel')}</label>
                  <input
                    id="consent-valid-until"
                    type="date"
                    className="form-input"
                    value={consentForm.validUntil}
                    onChange={(e) => setConsentForm((prev) => ({ ...prev, validUntil: e.target.value }))}
                    disabled={consentLoading}
                  />
                </div>
                {consentError && (
                  <div className="auth-error" style={{ marginBottom: 8 }}>{consentError}</div>
                )}
              </div>
              <div className="modal-footer">
                <button
                  className="secondary-btn"
                  type="button"
                  onClick={closeConsentModal}
                  disabled={consentLoading}
                >
                  {t('doctor.consentModal.cancel')}
                </button>
                <button
                  className="primary-btn"
                  type="submit"
                  disabled={consentLoading}
                >
                  {consentLoading ? t('doctor.consentModal.sending') : t('doctor.consentModal.sendRequest')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showRecordModal && (
        <div className="modal-overlay" onClick={closeRecordModal}>
          <div className="modal-content modal-lg" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{t('doctor.createRecord.title')}</h2>
              <button className="modal-close" onClick={closeRecordModal}>×</button>
            </div>
            <form onSubmit={handleRecordSubmit}>
              <div className="modal-body">
                <div className="form-group">
                  <label className="form-label">{t('doctor.createRecord.workerLabel')}</label>
                  <div style={{ color: 'var(--text)', fontWeight: 500 }}>{worker.name} ({worker.healthId})</div>
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="record-type">{t('doctor.createRecord.recordTypeLabel')}</label>
                  <select
                    id="record-type"
                    className="form-input"
                    value={recordForm.recordType}
                    onChange={(e) => setRecordForm((prev) => ({ ...prev, recordType: e.target.value }))}
                    disabled={recordLoading}
                  >
                    {recordTypeOptions.map((opt) => (
                      <option key={opt.value} value={opt.value}>{opt.label}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="record-category">{t('doctor.createRecord.categoryLabel')}</label>
                  <input
                    id="record-category"
                    type="text"
                    className="form-input"
                    value={recordForm.category}
                    onChange={(e) => setRecordForm((prev) => ({ ...prev, category: e.target.value }))}
                    disabled={recordLoading}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="record-title">{t('doctor.createRecord.titleLabel')}</label>
                  <input
                    id="record-title"
                    type="text"
                    className="form-input"
                    value={recordForm.title}
                    onChange={(e) => setRecordForm((prev) => ({ ...prev, title: e.target.value }))}
                    disabled={recordLoading}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="record-summary">{t('doctor.createRecord.summaryLabel')}</label>
                  <textarea
                    id="record-summary"
                    className="form-input"
                    rows="3"
                    value={recordForm.summary}
                    onChange={(e) => setRecordForm((prev) => ({ ...prev, summary: e.target.value }))}
                    disabled={recordLoading}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="record-diagnosis">{t('doctor.createRecord.diagnosisLabel')}</label>
                  <input
                    id="record-diagnosis"
                    type="text"
                    className="form-input"
                    value={recordForm.diagnosis}
                    onChange={(e) => setRecordForm((prev) => ({ ...prev, diagnosis: e.target.value }))}
                    disabled={recordLoading}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="record-prescriptions">{t('doctor.createRecord.prescriptionsLabel')}</label>
                  <input
                    id="record-prescriptions"
                    type="text"
                    className="form-input"
                    value={recordForm.prescriptions}
                    onChange={(e) => setRecordForm((prev) => ({ ...prev, prescriptions: e.target.value }))}
                    disabled={recordLoading}
                  />
                </div>
                <div className="form-group">
                  <label className="form-label" htmlFor="record-followup">{t('doctor.createRecord.followUpLabel')}</label>
                  <textarea
                    id="record-followup"
                    className="form-input"
                    rows="2"
                    value={recordForm.followUpPlan}
                    onChange={(e) => setRecordForm((prev) => ({ ...prev, followUpPlan: e.target.value }))}
                    disabled={recordLoading}
                  />
                </div>
                {recordError && (
                  <div className="auth-error" style={{ marginBottom: 8 }}>{recordError}</div>
                )}
              </div>
              <div className="modal-footer">
                <button
                  className="secondary-btn"
                  type="button"
                  onClick={closeRecordModal}
                  disabled={recordLoading}
                >
                  {t('doctor.createRecord.cancel')}
                </button>
                <button
                  className="primary-btn"
                  type="submit"
                  disabled={recordLoading}
                >
                  {recordLoading ? t('doctor.createRecord.saving') : t('doctor.createRecord.save')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default DoctorWorkerProfile;
