import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { useLanguage } from '../i18n/LanguageContext';
import { getWorkerProfile } from '../api';

function WorkerDashboard() {
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
      <div className="dashboard">
        <div className="auth-card" style={{ textAlign: 'center', padding: '40px' }}>
          <p>{t('common.loadingDashboard')}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="dashboard">
        <div className="auth-error">{error}</div>
      </div>
    );
  }

  const displayName = user?.name || 'Worker';
  const firstName = displayName.split(' ')[0];
  const healthId = profile?.healthId || '—';

  const quickActions = [
    { to: '/worker/profile', label: t('worker.dashboard.myProfile'), desc: t('worker.dashboard.myProfileDesc'), icon: '◉' },
    { to: '/worker/records', label: t('worker.dashboard.medicalRecords'), desc: t('worker.dashboard.medicalRecordsDesc'), icon: '☰' },
    { to: '/worker/consent', label: t('worker.dashboard.consent'), desc: t('worker.dashboard.consentDesc'), icon: '◈' },
    { to: '/worker/health-id', label: t('worker.dashboard.healthIdQr'), desc: t('worker.dashboard.healthIdQrDesc'), icon: '⊕' },
  ];

  return (
    <div className="dashboard">
      <section className="dashboard-welcome">
        <h1>{t('worker.dashboard.welcome', { name: firstName })}</h1>
        <p>{t('worker.dashboard.overview')}</p>
      </section>

      <div className="dashboard-info-cards">
        <div className="info-card">
          <span className="info-card-label">{t('worker.dashboard.healthId')}</span>
          <span className="info-card-value">{healthId}</span>
        </div>
        <div className="info-card">
          <span className="info-card-label">{t('worker.dashboard.profileCompletion')}</span>
          <div className="progress-bar-track">
            <div
              className="progress-bar-fill"
              style={{ width: profile ? '100%' : '0%' }}
            />
          </div>
          <span className="info-card-sub">{profile ? 'Profile created' : 'No profile yet'}</span>
        </div>
      </div>

      <section className="quick-actions">
        <h2>{t('worker.dashboard.quickActions')}</h2>
        <div className="actions-grid">
          {quickActions.map((action) => (
            <Link key={action.to} to={action.to} className="action-card">
              <span className="action-icon">{action.icon}</span>
              <div className="action-card-text">
                <h3>{action.label}</h3>
                <p>{action.desc}</p>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}

export default WorkerDashboard;
