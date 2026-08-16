import { useState, useEffect } from 'react';
import { useAuth } from '../auth/AuthContext';
import { getDoctorProfile } from '../api';
import { useLanguage } from '../i18n/LanguageContext';

function DoctorVerification() {
  const { token } = useAuth();
  const { t } = useLanguage();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');

    getDoctorProfile(token)
      .then((res) => {
        if (!cancelled) setProfile(res.data.profile);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message || 'Failed to load verification status');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [token]);

  if (loading) {
    return (
      <div className="verification-page">
        <div className="page-header">
          <h1>{t('doctor.verification.title')}</h1>
        </div>
        <div className="auth-card" style={{ textAlign: 'center', padding: '40px' }}>
          <p>{t('common.loadingVerification')}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="verification-page">
        <div className="page-header">
          <h1>{t('doctor.verification.title')}</h1>
        </div>
        <div className="auth-error">{error}</div>
      </div>
    );
  }

  const status = profile?.verificationStatus || 'PENDING';
  const isVerified = status === 'VERIFIED';

  return (
    <div className="verification-page">
      <div className="page-header">
        <h1>{t('doctor.verification.title')}</h1>
      </div>

      <div className="verification-card">
        <span className={`verification-status-badge ${isVerified ? 'verified' : 'pending'}`}>
          {isVerified ? '✓' : '⏳'} {status}
        </span>

        <div className="verification-details">
          <div className="verification-detail">
            <span className="verification-detail-label">{t('doctor.verification.registrationNumber')}</span>
            <span className="verification-detail-value">{profile?.medicalRegistrationNumber || '—'}</span>
          </div>
          <div className="verification-detail">
            <span className="verification-detail-label">{t('doctor.verification.doctorId')}</span>
            <span className="verification-detail-value">{profile?.doctorId || '—'}</span>
          </div>
          <div className="verification-detail">
            <span className="verification-detail-label">{t('doctor.verification.specialization')}</span>
            <span className="verification-detail-value">{profile?.specialization || '—'}</span>
          </div>
          <div className="verification-detail">
            <span className="verification-detail-label">{t('doctor.verification.profileCreated')}</span>
            <span className="verification-detail-value">
              {profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString('en-IN') : '—'}
            </span>
          </div>
        </div>

        <div className="documents-section">
          <h3>{t('doctor.verification.documentsTitle')}</h3>
          <div className="document-item">
            <span className="document-name">{t('doctor.verification.medicalCouncil')}</span>
            <span className={`document-status ${isVerified ? 'verified' : 'pending'}`}>
              {isVerified ? t('doctor.verification.verifiedStatus') : t('doctor.verification.pendingStatus')}
            </span>
          </div>
          <div className="document-item">
            <span className="document-name">{t('doctor.verification.identityProof')}</span>
            <span className={`document-status ${isVerified ? 'verified' : 'pending'}`}>
              {isVerified ? t('doctor.verification.verifiedStatus') : t('doctor.verification.pendingStatus')}
            </span>
          </div>
          <div className="document-item">
            <span className="document-name">{t('doctor.verification.qualifications')}</span>
            <span className={`document-status ${isVerified ? 'verified' : 'pending'}`}>
              {isVerified ? t('doctor.verification.verifiedStatus') : t('doctor.verification.pendingStatus')}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default DoctorVerification;
