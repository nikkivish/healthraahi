import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../auth/AuthContext';
import {
  getDoctorProfile,
  getAllHospitals,
  linkDoctorToHospital,
} from '../api';
import { useLanguage } from '../i18n/LanguageContext';

function DoctorHospital() {
  const { token } = useAuth();
  const { t } = useLanguage();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const [showLinkModal, setShowLinkModal] = useState(false);
  const [hospitals, setHospitals] = useState([]);
  const [hospitalsLoading, setHospitalsLoading] = useState(false);
  const [hospitalsError, setHospitalsError] = useState('');
  const [selectedHospitalId, setSelectedHospitalId] = useState('');
  const [linking, setLinking] = useState(false);
  const [linkError, setLinkError] = useState('');

  const fetchProfile = useCallback(() => {
    setLoading(true);
    setError('');
    getDoctorProfile(token)
      .then((res) => setProfile(res.data.profile))
      .catch((err) => setError(err.message || t('doctor.hospital.failedLoad')))
      .finally(() => setLoading(false));
  }, [token, t]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  const openLinkModal = () => {
    setShowLinkModal(true);
    setSelectedHospitalId('');
    setLinkError('');
    setHospitals([]);
    setHospitalsError('');
    setHospitalsLoading(true);
    getAllHospitals(token)
      .then((res) => setHospitals(res.data.hospitals || []))
      .catch((err) => setHospitalsError(err.message || t('doctor.hospital.failedLoadHospitals')))
      .finally(() => setHospitalsLoading(false));
  };

  const closeLinkModal = () => {
    setShowLinkModal(false);
    setSelectedHospitalId('');
    setLinkError('');
    setHospitals([]);
    setHospitalsError('');
  };

  const handleLink = async () => {
    if (!selectedHospitalId) {
      setLinkError(t('doctor.hospital.selectHospitalRequired'));
      return;
    }
    setLinking(true);
    setLinkError('');
    try {
      await linkDoctorToHospital(token, selectedHospitalId);
      closeLinkModal();
      fetchProfile();
      setSuccessMsg(t('doctor.hospital.linkSuccess'));
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err) {
      setLinkError(err.message || t('doctor.hospital.linkFailed'));
    } finally {
      setLinking(false);
    }
  };

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

        {successMsg && <div className="profile-save-success">{successMsg}</div>}

        <div className="hospital-card">
          <div className="consent-empty">{t('doctor.hospital.noHospital')}</div>
          <div className="hospital-link-actions">
            <button className="primary-btn" type="button" onClick={openLinkModal}>
              {t('doctor.hospital.linkHospital')}
            </button>
          </div>
        </div>

        {showLinkModal && (
          <div className="modal-overlay" onClick={() => !linking && closeLinkModal()}>
            <div className="modal-content" onClick={(e) => e.stopPropagation()}>
              <div className="modal-header">
                <h2>{t('doctor.hospital.linkHospitalTitle')}</h2>
                <button className="modal-close" type="button" onClick={() => !linking && closeLinkModal()}>×</button>
              </div>
              <div className="modal-body">
                {hospitalsLoading ? (
                  <p className="loading-text">{t('common.loading')}</p>
                ) : hospitalsError ? (
                  <div className="auth-error">{hospitalsError}</div>
                ) : hospitals.length === 0 ? (
                  <p className="consent-empty">{t('doctor.hospital.noHospitalsAvailable')}</p>
                ) : (
                  <div className="form-group">
                    <label className="form-label">{t('doctor.hospital.selectHospital')} *</label>
                    <select
                      className="form-input"
                      value={selectedHospitalId}
                      onChange={(e) => { setSelectedHospitalId(e.target.value); setLinkError(''); }}
                      disabled={linking}
                    >
                      <option value="">{t('doctor.hospital.selectHospitalPlaceholder')}</option>
                      {hospitals.map((h) => (
                        <option key={h.id} value={h.id}>
                          {h.name}{h.city ? ` — ${h.city}` : ''}{h.state ? `, ${h.state}` : ''}
                        </option>
                      ))}
                    </select>
                    {selectedHospitalId && (() => {
                      const selected = hospitals.find((h) => h.id === selectedHospitalId);
                      if (!selected) return null;
                      return (
                        <div className="hospital-select-details">
                          {selected.address && <span className="hospital-select-detail">{selected.address}</span>}
                          {selected.phone && <span className="hospital-select-detail">{selected.phone}</span>}
                          {selected.registrationNumber && <span className="hospital-select-detail">{selected.registrationNumber}</span>}
                        </div>
                      );
                    })()}
                  </div>
                )}
                {linkError && <div className="auth-error">{linkError}</div>}
              </div>
              <div className="modal-footer">
                <button
                  className="primary-btn"
                  type="button"
                  disabled={linking || !selectedHospitalId || hospitals.length === 0}
                  onClick={handleLink}
                >
                  {linking ? t('common.loading') : t('doctor.hospital.linkHospital')}
                </button>
                <button className="secondary-btn" type="button" onClick={closeLinkModal} disabled={linking}>
                  {t('documents.cancel')}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="hospital-page">
      <div className="page-header">
        <h1>{t('doctor.hospital.title')}</h1>
      </div>

      {successMsg && <div className="profile-save-success">{successMsg}</div>}

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

        <div className="hospital-link-actions">
          <button className="secondary-btn" type="button" onClick={openLinkModal}>
            {t('doctor.hospital.changeHospital')}
          </button>
        </div>
      </div>

      {showLinkModal && (
        <div className="modal-overlay" onClick={() => !linking && closeLinkModal()}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{t('doctor.hospital.changeHospitalTitle')}</h2>
              <button className="modal-close" type="button" onClick={() => !linking && closeLinkModal()}>×</button>
            </div>
            <div className="modal-body">
              {hospitalsLoading ? (
                <p className="loading-text">{t('common.loading')}</p>
              ) : hospitalsError ? (
                <div className="auth-error">{hospitalsError}</div>
              ) : hospitals.length === 0 ? (
                <p className="consent-empty">{t('doctor.hospital.noHospitalsAvailable')}</p>
              ) : (
                <div className="form-group">
                  <label className="form-label">{t('doctor.hospital.selectHospital')} *</label>
                  <select
                    className="form-input"
                    value={selectedHospitalId}
                    onChange={(e) => { setSelectedHospitalId(e.target.value); setLinkError(''); }}
                    disabled={linking}
                  >
                    <option value="">{t('doctor.hospital.selectHospitalPlaceholder')}</option>
                    {hospitals.map((h) => (
                      <option key={h.id} value={h.id}>
                        {h.name}{h.city ? ` — ${h.city}` : ''}{h.state ? `, ${h.state}` : ''}
                      </option>
                    ))}
                  </select>
                  {selectedHospitalId && (() => {
                    const selected = hospitals.find((h) => h.id === selectedHospitalId);
                    if (!selected) return null;
                    return (
                      <div className="hospital-select-details">
                        {selected.address && <span className="hospital-select-detail">{selected.address}</span>}
                        {selected.phone && <span className="hospital-select-detail">{selected.phone}</span>}
                        {selected.registrationNumber && <span className="hospital-select-detail">{selected.registrationNumber}</span>}
                      </div>
                    );
                  })()}
                </div>
              )}
              {linkError && <div className="auth-error">{linkError}</div>}
            </div>
            <div className="modal-footer">
              <button
                className="primary-btn"
                type="button"
                disabled={linking || !selectedHospitalId || hospitals.length === 0}
                onClick={handleLink}
              >
                {linking ? t('common.loading') : t('doctor.hospital.confirmChange')}
              </button>
              <button className="secondary-btn" type="button" onClick={closeLinkModal} disabled={linking}>
                {t('documents.cancel')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default DoctorHospital;
