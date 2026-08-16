import { useState, useEffect } from 'react';
import { useAuth } from '../auth/AuthContext';
import { getDoctorProfile } from '../api';
import { useLanguage } from '../i18n/LanguageContext';

function DoctorProfile() {
  const { user, token } = useAuth();
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
        if (!cancelled) setError(err.message || 'Failed to load profile');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [token]);

  if (loading) {
    return (
      <div className="profile-page">
        <div className="auth-card" style={{ textAlign: 'center', padding: '40px' }}>
          <p>{t('common.loadingProfile')}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="profile-page">
        <div className="auth-error">{error}</div>
      </div>
    );
  }

  const name = profile?.fullName || user?.name || '—';
  const initials = name !== '—' ? name.replace('Dr. ', '').split(' ').map((n) => n[0]).join('') : '?';

  const fields = [
    { label: t('doctor.profile.fullName'), value: name },
    { label: t('doctor.profile.phoneNumber'), value: profile?.phone || user?.phone || '—' },
    { label: t('doctor.profile.email'), value: user?.email || '—' },
    { label: t('doctor.profile.doctorId'), value: profile?.doctorId || '—' },
    { label: t('doctor.profile.specialization'), value: profile?.specialization || '—' },
    { label: t('doctor.profile.registrationNumber'), value: profile?.medicalRegistrationNumber || '—' },
    { label: t('doctor.profile.hospital'), value: profile?.hospital?.name || '—' },
    { label: t('doctor.profile.verificationStatus'), value: profile?.verificationStatus || '—' },
  ];

  return (
    <div className="profile-page">
      <div className="page-header">
        <h1>{t('doctor.profile.title')}</h1>
        <button className="primary-btn" type="button">Edit Profile</button>
      </div>

      <div className="profile-card">
        <div className="profile-avatar">{initials}</div>
        <div className="profile-name">{name}</div>
        <div className="profile-role">{profile?.specialization || 'DOCTOR'}</div>

        <div className="profile-fields">
          {fields.map((field) => (
            <div key={field.label} className="profile-field">
              <span className="profile-field-label">{field.label}</span>
              <span className="profile-field-value">{field.value}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default DoctorProfile;
