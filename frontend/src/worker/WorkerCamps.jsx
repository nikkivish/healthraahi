import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { useLanguage } from '../i18n/LanguageContext';
import { getMyCampRegistrations, cancelCampRegistration } from '../api';

function formatDate(dateStr) {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString('en-IN', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function WorkerCamps() {
  const { token } = useAuth();
  const { t } = useLanguage();
  const [registrations, setRegistrations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [cancellingId, setCancellingId] = useState('');

  const fetchData = () => {
    if (!token) return;
    setLoading(true);
    getMyCampRegistrations(token)
      .then((res) => setRegistrations(res.data.registrations))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchData(); }, [token]);

  const handleCancel = async (regId) => {
    if (!window.confirm(t('camps.confirmCancel'))) return;
    setCancellingId(regId);
    try {
      await cancelCampRegistration(token, regId);
      fetchData();
    } catch (err) {
      alert(err.message);
    } finally {
      setCancellingId('');
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
        <h1>{t('camps.myCamps')}</h1>
        <p>{t('camps.myCampsDesc')}</p>
      </section>

      <div style={{ marginBottom: 20 }}>
        <Link to="/camps" className="primary-btn">{t('camps.browseCamps')}</Link>
      </div>

      {loading && <p>{t('common.loading')}</p>}
      {error && <p style={{ color: '#c0392b' }}>{error}</p>}

      {!loading && !error && registrations.length === 0 && (
        <div className="camps-empty">
          <span className="camps-empty-icon">📋</span>
          <p>{t('camps.noRegistrations')}</p>
        </div>
      )}

      {!loading && !error && registrations.length > 0 && (
        <div className="camps-grid">
          {registrations.map((reg) => {
            const camp = reg.camp;
            return (
              <div key={reg.id} className="camp-card">
                <div className="camp-card-header">
                  <span className={`camp-status-badge ${reg.status.toLowerCase()}`}>
                    {statusLabel(reg.status)}
                  </span>
                  {camp && camp.status === 'CANCELLED' && (
                    <span className="camp-slots-badge">{t('camps.campCancelled')}</span>
                  )}
                </div>

                {camp && (
                  <>
                    <h3 className="camp-card-title">{camp.name}</h3>
                    <div className="camp-card-details">
                      <div className="camp-detail-row">
                        <span className="camp-detail-icon">📅</span>
                        <span>{formatDate(camp.date)}</span>
                      </div>
                      {camp.timeSlots && camp.timeSlots[reg.timeSlotIndex] && (
                        <div className="camp-detail-row">
                          <span className="camp-detail-icon">🕐</span>
                          <span>{camp.timeSlots[reg.timeSlotIndex].startTime} – {camp.timeSlots[reg.timeSlotIndex].endTime}</span>
                        </div>
                      )}
                      <div className="camp-detail-row">
                        <span className="camp-detail-icon">📍</span>
                        <span>{camp.location}{camp.city ? `, ${camp.city}` : ''}</span>
                      </div>
                      {camp.organizer && (
                        <div className="camp-detail-row">
                          <span className="camp-detail-icon">🏥</span>
                          <span>{camp.organizer}</span>
                        </div>
                      )}
                    </div>
                    {camp.specialties && camp.specialties.length > 0 && (
                      <div className="camp-specialties">
                        {camp.specialties.map((sp) => (
                          <span key={sp} className="camp-specialty-tag">{sp}</span>
                        ))}
                      </div>
                    )}
                  </>
                )}

                {!camp && (
                  <h3 className="camp-card-title">{t('camps.campDetailsUnavailable')}</h3>
                )}

                {reg.healthConcerns && (
                  <p className="camp-card-desc"><strong>{t('camps.healthConcern')}:</strong> {reg.healthConcerns}</p>
                )}

                {reg.status === 'CONFIRMED' && camp && camp.status !== 'CANCELLED' && (
                  <div className="camp-card-actions">
                    <button
                      className="secondary-btn camp-btn"
                      type="button"
                      disabled={cancellingId === reg.id}
                      onClick={() => handleCancel(reg.id)}
                    >
                      {cancellingId === reg.id ? t('common.loading') : t('camps.cancelRegistration')}
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default WorkerCamps;
