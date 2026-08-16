import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { getDoctorProfile, getDoctorConsents } from '../api';
import { useLanguage } from '../i18n/LanguageContext';

function DoctorDashboard() {
  const { user, token } = useAuth();
  const { t } = useLanguage();
  const [profile, setProfile] = useState(null);
  const [pendingCount, setPendingCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const quickActions = [
    { to: '/doctor/profile', label: t('doctor.dashboard.myProfile'), desc: t('doctor.dashboard.myProfileDesc'), icon: '◉' },
    { to: '/doctor/workers', label: t('doctor.dashboard.workers'), desc: t('doctor.dashboard.workersDesc'), icon: '☰' },
    { to: '/doctor/consents', label: t('doctor.dashboard.consentRequests'), desc: t('doctor.dashboard.consentRequestsDesc'), icon: '◈' },
    { to: '/doctor/records', label: t('doctor.dashboard.clinicalRecords'), desc: t('doctor.dashboard.clinicalRecordsDesc'), icon: '⊞' },
  ];

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');

    Promise.all([
      getDoctorProfile(token).catch(() => null),
      getDoctorConsents(token).catch(() => null),
    ])
      .then(([profileRes, consentsRes]) => {
        if (cancelled) return;
        if (profileRes) setProfile(profileRes.data.profile);
        if (consentsRes) {
          const consents = consentsRes.data.consents || [];
          setPendingCount(consents.filter((c) => c.status === 'PENDING').length);
        }
      })
      .catch((err) => {
        if (!cancelled) setError(err.message || 'Failed to load dashboard');
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

  const displayName = user?.name || 'Doctor';
  const doctorId = profile?.doctorId || '—';
  const isVerified = profile?.verificationStatus === 'VERIFIED';
  const hospitalName = profile?.hospital?.name || '—';

  return (
    <div className="dashboard">
      <section className="dashboard-welcome">
        <h1>{t('doctor.dashboard.welcome', { name: displayName })}</h1>
        <p>{t('doctor.dashboard.overview')}</p>
      </section>

      <div className="dashboard-info-cards">
        <div className="info-card">
          <span className="info-card-label">{t('doctor.dashboard.doctorId')}</span>
          <span className="info-card-value">{doctorId}</span>
        </div>
        <div className="info-card">
          <span className="info-card-label">{t('doctor.dashboard.verification')}</span>
          <span className={`verification-status-badge ${isVerified ? 'verified' : 'pending'}`}>
            {isVerified ? '✓ ' + t('common.verified') : '⏳ ' + (profile?.verificationStatus || t('common.pending'))}
          </span>
        </div>
        <div className="info-card">
          <span className="info-card-label">{t('doctor.dashboard.hospital')}</span>
          <span className="info-card-value">{hospitalName}</span>
        </div>
        <div className="info-card">
          <span className="info-card-label">{t('doctor.dashboard.pendingConsents')}</span>
          <span className="info-card-value">{pendingCount} requests</span>
        </div>
      </div>

      <section className="quick-actions">
        <h2>{t('doctor.dashboard.quickActions')}</h2>
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

export default DoctorDashboard;
