import { useState, useEffect } from 'react';
import { useAuth } from '../auth/AuthContext';
import { useLanguage } from '../i18n/LanguageContext';
import { getActiveCamps, getCampRegistrations } from '../api';

function formatDate(dateStr) {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString('en-IN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function DoctorCamps() {
  const { token } = useAuth();
  const { t } = useLanguage();
  const [camps, setCamps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedCampId, setSelectedCampId] = useState(null);
  const [registrations, setRegistrations] = useState([]);
  const [regLoading, setRegLoading] = useState(false);
  const [regError, setRegError] = useState('');

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    getActiveCamps()
      .then((res) => setCamps(res.data.camps))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [token]);

  const handleSelectCamp = async (campId) => {
    setSelectedCampId(campId);
    setRegLoading(true);
    setRegError('');
    try {
      const res = await getCampRegistrations(token, campId);
      setRegistrations(res.data.registrations);
    } catch (err) {
      setRegError(err.message);
      setRegistrations([]);
    } finally {
      setRegLoading(false);
    }
  };

  const statusLabel = (status) => {
    const map = {
      CONFIRMED: t('camps.statusConfirmed'),
      CANCELLED: t('camps.statusCancelled'),
      ATTENDED: t('camps.statusAttended'),
      NO_SHOW: t('camps.statusNoShow'),
    };
    return map[status] || status;
  };

  return (
    <div className="camps-page">
      <section className="dashboard-welcome">
        <h1>{t('camps.doctorCamps')}</h1>
        <p>{t('camps.doctorCampsDesc')}</p>
      </section>

      {loading && <p>{t('common.loading')}</p>}
      {error && <p style={{ color: '#c0392b' }}>{error}</p>}

      {!loading && !error && camps.length === 0 && (
        <div className="camps-empty">
          <span className="camps-empty-icon">🏥</span>
          <p>{t('camps.noCamps')}</p>
        </div>
      )}

      {!loading && !error && camps.length > 0 && (
        <div className="camps-grid">
          {camps.map((camp) => {
            const totalReg = (camp.timeSlots || []).reduce((s, sl) => s + sl.registeredCount, 0);
            return (
              <div
                key={camp.id}
                className={`camp-card ${selectedCampId === camp.id ? 'camp-card-selected' : ''}`}
                style={{ cursor: 'pointer' }}
                onClick={() => handleSelectCamp(camp.id)}
              >
                <div className="camp-card-header">
                  <span className={`camp-fee-badge ${(camp.feeType || 'FREE').toLowerCase()}`}>
                    {camp.feeType === 'FREE' ? t('camps.free') : t('camps.paid')}
                  </span>
                </div>
                <h3 className="camp-card-title">{camp.name}</h3>
                <div className="camp-card-details">
                  <div className="camp-detail-row">
                    <span className="camp-detail-icon">📅</span>
                    <span>{formatDate(camp.date)}</span>
                  </div>
                  <div className="camp-detail-row">
                    <span className="camp-detail-icon">📍</span>
                    <span>{camp.location}{camp.city ? `, ${camp.city}` : ''}</span>
                  </div>
                  <div className="camp-detail-row">
                    <span className="camp-detail-icon">👥</span>
                    <span>{totalReg} {t('camps.registered')}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {selectedCampId && (
        <div className="camps-registrations-section">
          <h2>{t('camps.registeredWorkers')}</h2>

          {regLoading && <p>{t('common.loading')}</p>}
          {regError && <p style={{ color: '#c0392b' }}>{regError}</p>}

          {!regLoading && !regError && registrations.length === 0 && (
            <p>{t('camps.noRegistrationsForCamp')}</p>
          )}

          {!regLoading && !regError && registrations.length > 0 && (
            <div className="admin-list">
              {registrations.map((reg) => (
                <div key={reg.id} className="admin-list-item">
                  <div className="admin-list-main">
                    <span className="admin-list-name">{reg.worker?.name || '—'}</span>
                    <span className="admin-list-meta-text">{reg.worker?.phone || '—'}</span>
                    {reg.timeSlotIndex !== undefined && reg.camp && (
                      <span className="admin-list-meta-text">
                        Slot {reg.timeSlotIndex + 1}
                      </span>
                    )}
                  </div>
                  <span className={`camp-status-badge ${(reg.status || '').toLowerCase()}`}>
                    {statusLabel(reg.status)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default DoctorCamps;
