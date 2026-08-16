import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from './auth/AuthContext';
import { useLanguage } from './i18n/LanguageContext';
import { getActiveCamps, registerForCamp, getWorkerProfile } from './api';

function formatDate(dateStr, locale) {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString(locale, {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

function MedicalCamps() {
  const { t } = useLanguage();
  const { user, token } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [camps, setCamps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [specialtyFilter, setSpecialtyFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('');

  const [registerCampId, setRegisterCampId] = useState(null);
  const [selectedSlot, setSelectedSlot] = useState(0);
  const [healthConcerns, setHealthConcerns] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [registerSuccess, setRegisterSuccess] = useState('');
  const [registerError, setRegisterError] = useState('');
  const [workerProfile, setWorkerProfile] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getActiveCamps()
      .then((res) => {
        if (!cancelled) setCamps(res.data.camps);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  const registerParam = searchParams.get('register');
  useEffect(() => {
    if (registerParam && user && user.role === 'WORKER' && token) {
      setRegisterCampId(registerParam);
      if (!workerProfile) {
        getWorkerProfile(token).then((res) => {
          setWorkerProfile(res.data.profile);
        }).catch(() => {});
      }
    }
  }, [registerParam, user, token]);

  const handleRegisterClick = (campId) => {
    if (!user) {
      navigate(`/login?redirect=/camps&register=${campId}`);
      return;
    }
    if (user.role !== 'WORKER') {
      return;
    }
    setRegisterCampId(campId);
    setSelectedSlot(0);
    setHealthConcerns('');
    setRegisterSuccess('');
    setRegisterError('');
    if (!workerProfile && token) {
      getWorkerProfile(token).then((res) => {
        setWorkerProfile(res.data.profile);
      }).catch(() => {});
    }
  };

  const handleRegisterSubmit = async () => {
    if (!token || !registerCampId) return;
    setSubmitting(true);
    setRegisterError('');
    setRegisterSuccess('');
    try {
      await registerForCamp(token, registerCampId, selectedSlot, healthConcerns || undefined);
      setRegisterSuccess(t('camps.registrationSuccess'));
      setTimeout(() => {
        setRegisterCampId(null);
        setRegisterSuccess('');
      }, 3000);
    } catch (err) {
      setRegisterError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const ALL_SPECIALTIES = [...new Set(camps.flatMap((c) => c.specialties || []))].sort();

  const filtered = camps.filter((camp) => {
    const matchesSearch =
      camp.name.toLowerCase().includes(search.toLowerCase()) ||
      camp.location.toLowerCase().includes(search.toLowerCase()) ||
      (camp.city || '').toLowerCase().includes(search.toLowerCase());
    const matchesSpecialty = !specialtyFilter || (camp.specialties || []).includes(specialtyFilter);
    let matchesDate = true;
    if (dateFilter === 'this-week') {
      const campDate = new Date(camp.date);
      const now = new Date();
      const weekEnd = new Date(now);
      weekEnd.setDate(now.getDate() + 7);
      matchesDate = campDate >= now && campDate <= weekEnd;
    } else if (dateFilter === 'this-month') {
      const campDate = new Date(camp.date);
      const now = new Date();
      matchesDate = campDate.getMonth() === now.getMonth() && campDate.getFullYear() === now.getFullYear();
    } else if (dateFilter === 'next-month') {
      const campDate = new Date(camp.date);
      const now = new Date();
      const nextMonth = now.getMonth() + 1;
      matchesDate = campDate.getMonth() === nextMonth % 12 && campDate.getFullYear() === (nextMonth >= 12 ? now.getFullYear() + 1 : now.getFullYear());
    }
    return matchesSearch && matchesSpecialty && matchesDate;
  });

  const totalCapacity = (camp) => (camp.timeSlots || []).reduce((sum, s) => sum + s.capacity, 0);
  const totalRegistered = (camp) => (camp.timeSlots || []).reduce((sum, s) => sum + s.registeredCount, 0);
  const slotsLeft = (camp) => totalCapacity(camp) - totalRegistered(camp);
  const slotsPercent = (camp) => totalCapacity(camp) > 0 ? Math.round((totalRegistered(camp) / totalCapacity(camp)) * 100) : 0;
  const almostFull = (camp) => slotsLeft(camp) < 20;
  const selectedCamp = camps.find((c) => c.id === registerCampId);

  return (
    <div className="camps-page">
      <section className="dashboard-welcome">
        <h1>{t('camps.title')}</h1>
        <p>{t('camps.subtitle')}</p>
      </section>

      <div className="camps-filters">
        <input
          type="text"
          className="form-input camps-search"
          placeholder={t('camps.searchPlaceholder')}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select
          className="form-input form-select camps-filter-select"
          value={specialtyFilter}
          onChange={(e) => setSpecialtyFilter(e.target.value)}
        >
          <option value="">{t('camps.allSpecialties')}</option>
          {ALL_SPECIALTIES.map((sp) => (
            <option key={sp} value={sp}>{sp}</option>
          ))}
        </select>
        <select
          className="form-input form-select camps-filter-select"
          value={dateFilter}
          onChange={(e) => setDateFilter(e.target.value)}
        >
          <option value="">{t('camps.allDates')}</option>
          <option value="this-week">{t('camps.thisWeek')}</option>
          <option value="this-month">{t('camps.thisMonth')}</option>
          <option value="next-month">{t('camps.nextMonth')}</option>
        </select>
      </div>

      {loading && (
        <div className="camps-empty">
          <p>{t('common.loading')}</p>
        </div>
      )}

      {error && (
        <div className="camps-empty">
          <p>{error}</p>
        </div>
      )}

      {!loading && !error && filtered.length === 0 && (
        <div className="camps-empty">
          <span className="camps-empty-icon">🏥</span>
          <p>{t('camps.noCamps')}</p>
        </div>
      )}

      {!loading && !error && filtered.length > 0 && (
        <div className="camps-grid">
          {filtered.map((camp) => (
            <div key={camp.id} className="camp-card">
              <div className="camp-card-header">
                <span className={`camp-fee-badge ${(camp.feeType || 'FREE').toLowerCase()}`}>
                  {camp.feeType === 'FREE' ? t('camps.free') : t('camps.paid')}
                </span>
                {almostFull(camp) && (
                  <span className="camp-slots-badge">{t('camps.slotsLeft', { count: slotsLeft(camp) })}</span>
                )}
                {camp.status === 'CANCELLED' && (
                  <span className="camp-slots-badge" style={{ background: 'rgba(231,76,60,0.1)', color: '#c0392b', borderColor: 'rgba(231,76,60,0.2)' }}>
                    {t('camps.cancelled')}
                  </span>
                )}
              </div>

              <h3 className="camp-card-title">{camp.name}</h3>

              <div className="camp-card-details">
                <div className="camp-detail-row">
                  <span className="camp-detail-icon">📅</span>
                  <span>{formatDate(camp.date, 'en-IN')}</span>
                </div>
                {(camp.timeSlots || []).map((slot, i) => (
                  <div key={i} className="camp-detail-row">
                    <span className="camp-detail-icon">🕐</span>
                    <span>{slot.startTime} – {slot.endTime}</span>
                  </div>
                ))}
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

              <div className="camp-specialties">
                {(camp.specialties || []).map((sp) => (
                  <span key={sp} className="camp-specialty-tag">{sp}</span>
                ))}
              </div>

              <div className="camp-slots-bar">
                <div className="camp-slots-bar-inner">
                  <div className="camp-slots-bar-fill" style={{ width: `${slotsPercent(camp)}%` }} />
                </div>
                <span className="camp-slots-text">
                  {totalRegistered(camp)}/{totalCapacity(camp)} {t('camps.registered')}
                </span>
              </div>

              {camp.description && <p className="camp-card-desc">{camp.description}</p>}

              <div className="camp-card-actions">
                {camp.status !== 'CANCELLED' && camp.status !== 'COMPLETED' && (
                  <button
                    className="primary-btn camp-btn"
                    type="button"
                    onClick={() => handleRegisterClick(camp.id)}
                  >
                    {t('camps.registerNow')}
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {registerCampId && selectedCamp && (
        <div className="camps-modal-overlay" onClick={() => setRegisterCampId(null)}>
          <div className="camps-modal" onClick={(e) => e.stopPropagation()}>
            <button className="camps-modal-close" type="button" onClick={() => setRegisterCampId(null)}>✕</button>

            {registerSuccess ? (
              <div className="camps-register-success">
                <span className="camps-success-icon">✓</span>
                <p>{registerSuccess}</p>
              </div>
            ) : (
              <>
                <h2 className="camps-modal-title">{t('camps.registerFor')} {selectedCamp.name}</h2>

                {user && user.role !== 'WORKER' && (
                  <p className="camps-register-error">{t('camps.onlyWorkersCanRegister')}</p>
                )}

                {user && user.role === 'WORKER' && (
                  <div className="camps-register-form">
                    <div className="camps-register-info">
                      <div className="camps-register-info-row">
                        <span className="camps-register-label">{t('camps.name')}:</span>
                        <span>{user.name}</span>
                      </div>
                      {workerProfile && (
                        <div className="camps-register-info-row">
                          <span className="camps-register-label">{t('camps.healthId')}:</span>
                          <span>{workerProfile.healthId}</span>
                        </div>
                      )}
                      <div className="camps-register-info-row">
                        <span className="camps-register-label">{t('camps.phone')}:</span>
                        <span>{user.phone}</span>
                      </div>
                    </div>

                    {(selectedCamp.timeSlots || []).length > 1 && (
                      <div className="camps-form-group">
                        <label className="camps-form-label">{t('camps.selectTimeSlot')}</label>
                        <div className="camps-slot-options">
                          {selectedCamp.timeSlots.map((slot, i) => (
                            <label key={i} className={`camps-slot-option ${selectedSlot === i ? 'selected' : ''} ${slot.registeredCount >= slot.capacity ? 'full' : ''}`}>
                              <input
                                type="radio"
                                name="timeSlot"
                                value={i}
                                checked={selectedSlot === i}
                                disabled={slot.registeredCount >= slot.capacity}
                                onChange={() => setSelectedSlot(i)}
                              />
                              <span>{slot.startTime} – {slot.endTime}</span>
                              <span className="camps-slot-avail">
                                {slot.capacity - slot.registeredCount} {t('camps.slotsAvailable')}
                              </span>
                            </label>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="camps-form-group">
                      <label className="camps-form-label">{t('camps.healthConcernOptional')}</label>
                      <textarea
                        className="form-input camps-textarea"
                        rows={3}
                        maxLength={500}
                        value={healthConcerns}
                        onChange={(e) => setHealthConcerns(e.target.value)}
                        placeholder={t('camps.healthConcernPlaceholder')}
                      />
                    </div>

                    {registerError && <p className="camps-register-error">{registerError}</p>}

                    <div className="camps-modal-actions">
                      <button className="secondary-btn" type="button" onClick={() => setRegisterCampId(null)}>
                        {t('camps.cancel')}
                      </button>
                      <button
                        className="primary-btn"
                        type="button"
                        disabled={submitting}
                        onClick={handleRegisterSubmit}
                      >
                        {submitting ? t('common.loading') : t('camps.confirmRegistration')}
                      </button>
                    </div>
                  </div>
                )}

                {!user && (
                  <div className="camps-register-form">
                    <p>{t('camps.loginRequired')}</p>
                    <div className="camps-modal-actions">
                      <Link to="/login" className="primary-btn">{t('common.login')}</Link>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}

      <div className="camps-back">
        <Link to="/" className="secondary-btn">{t('common.home')}</Link>
      </div>
    </div>
  );
}

export default MedicalCamps;
