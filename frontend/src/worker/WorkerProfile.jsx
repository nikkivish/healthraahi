import { useState, useEffect } from 'react';
import { useAuth } from '../auth/AuthContext';
import { useLanguage } from '../i18n/LanguageContext';
import { getWorkerProfile } from '../api';

function WorkerProfile() {
  const { user, token } = useAuth();
  const { t } = useLanguage();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');

    getWorkerProfile(token)
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

  const name = user?.name || '—';
  const initials = name !== '—' ? name.split(' ').map((n) => n[0]).join('') : '?';

  const fields = [
    { label: t('worker.profile.fullName'), value: name },
    { label: t('worker.profile.phoneNumber'), value: user?.phone || '—' },
    { label: t('worker.profile.email'), value: user?.email || '—' },
    { label: t('worker.profile.healthId'), value: profile?.healthId || '—' },
    { label: t('worker.profile.dateOfBirth'), value: profile?.dateOfBirth || '—' },
    { label: t('worker.profile.gender'), value: profile?.gender || '—' },
    { label: t('worker.profile.bloodGroup'), value: profile?.bloodGroup || '—' },
    { label: t('worker.profile.role'), value: user?.role || '—' },
    { label: t('worker.profile.address'), value: profile?.address || '—' },
    { label: t('worker.profile.emergencyContact'), value: profile?.emergencyContact?.phone || '—' },
  ];

  return (
    <div className="profile-page">
      <div className="page-header">
        <h1>{t('worker.profile.title')}</h1>
        <button className="primary-btn" type="button">
          {t('common.editProfile')}
        </button>
      </div>

      <div className="profile-card">
        <div className="profile-avatar">{initials}</div>
        <div className="profile-name">{name}</div>
        <div className="profile-role">{user?.role || t('auth.worker')}</div>

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

export default WorkerProfile;
