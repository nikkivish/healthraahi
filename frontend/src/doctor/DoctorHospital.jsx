import { useState, useEffect } from 'react';
import { useAuth } from '../auth/AuthContext';
import { getDoctorProfile } from '../api';
import { useLanguage } from '../i18n/LanguageContext';

function DoctorHospital() {
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
        if (!cancelled) setError(err.message || 'Failed to load hospital info');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [token]);

  if (loading) {
    return (
      <div className="hospital-page">
        <div className="page-header">
          <h1>{t('doctor.hospital.title')}</h1>
        </div>
        <div className="auth-card" style={{ textAlign: 'center', padding: '40px' }}>
          <p>{t('common.loadingHospital')}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="hospital-page">
        <div className="page-header">
          <h1>{t('doctor.hospital.title')}</h1>
        </div>
        <div className="auth-error">{error}</div>
      </div>
    );
  }

  const hospital = profile?.hospital;

  if (!hospital) {
    return (
      <div className="hospital-page">
        <div className="page-header">
          <h1>{t('doctor.hospital.title')}</h1>
        </div>
        <div className="hospital-card">
          <div className="consent-empty">{t('doctor.hospital.noHospital')}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="hospital-page">
      <div className="page-header">
        <h1>{t('doctor.hospital.title')}</h1>
      </div>

      <div className="hospital-card">
        <div className="hospital-name">{hospital.name}</div>
        <div className="hospital-address">{hospital.address || '—'}</div>

        <div className="hospital-info-grid">
          <div className="hospital-info-item">
            <span className="hospital-info-label">{t('doctor.hospital.hospitalId')}</span>
            <span className="hospital-info-value">{hospital.id}</span>
          </div>
          <div className="hospital-info-item">
            <span className="hospital-info-label">{t('doctor.hospital.affiliatedDoctor')}</span>
            <span className="hospital-info-value">{profile?.fullName || '—'}</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default DoctorHospital;
