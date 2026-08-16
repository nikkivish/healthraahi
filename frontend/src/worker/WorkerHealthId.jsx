import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../auth/AuthContext';
import { useLanguage } from '../i18n/LanguageContext';
import { getWorkerProfile } from '../api';
import { QRCodeSVG } from 'qrcode.react';

function WorkerHealthId() {
  const { user, token } = useAuth();
  const { t } = useLanguage();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showQR, setShowQR] = useState(false);
  const qrRef = useRef(null);

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

  const handleDownload = () => {
    if (!qrRef.current) return;
    const svg = qrRef.current.querySelector('svg');
    if (!svg) return;

    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();

    img.onload = () => {
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);
      const link = document.createElement('a');
      link.download = `healthraahi-${profile?.healthId || 'qr'}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    };

    img.src = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgData)));
  };

  if (loading) {
    return (
      <div className="healthid-page">
        <div className="auth-card" style={{ textAlign: 'center', padding: '40px' }}>
          <p>{t('common.loadingHealthId')}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="healthid-page">
        <div className="auth-error">{error}</div>
      </div>
    );
  }

  const name = user?.name || '—';
  const healthId = profile?.healthId || '—';
  const qrUrl = `${window.location.origin}/worker/lookup/${encodeURIComponent(healthId)}`;

  return (
    <div className="healthid-page">
      <div className="page-header">
        <h1>{t('worker.healthId.title')}</h1>
      </div>
      <p className="page-subtitle">{t('worker.healthId.subtitle')}</p>

      <div className="healthid-card">
        <div className="healthid-badge">
          <span className="healthid-badge-dot" />
          {t('worker.healthId.verified')}
        </div>

        <div className="healthid-value">{healthId}</div>

        <div className="healthid-info-row">
          <div className="healthid-info-item">
            <span className="healthid-info-label">{t('worker.healthId.name')}</span>
            <span className="healthid-info-value">{name}</span>
          </div>
          <div className="healthid-info-item">
            <span className="healthid-info-label">{t('worker.healthId.role')}</span>
            <span className="healthid-info-value">{user?.role || t('auth.worker')}</span>
          </div>
        </div>

        <div className="qr-section">
          {showQR ? (
            <div className="qr-display" ref={qrRef}>
              <QRCodeSVG
                value={qrUrl}
                size={180}
                bgColor="#ffffff"
                fgColor="#16343b"
                level="M"
                includeMargin={false}
              />
              <span className="qr-label">{t('worker.healthId.scanToVerify')}</span>
            </div>
          ) : (
            <div className="qr-placeholder qr-hidden">
              <span className="qr-hidden-icon">⊞</span>
              <span className="qr-hidden-text">{t('worker.healthId.qrHidden')}</span>
            </div>
          )}
        </div>

        <div className="healthid-actions">
          <button
            className="primary-btn"
            type="button"
            onClick={() => setShowQR(!showQR)}
          >
            {showQR ? t('worker.healthId.hideQr') : t('worker.healthId.showQr')}
          </button>
          <button
            className="secondary-btn"
            type="button"
            onClick={handleDownload}
            disabled={!showQR}
          >
            {t('worker.healthId.downloadQr')}
          </button>
        </div>
      </div>
    </div>
  );
}

export default WorkerHealthId;
