import { useState, useEffect } from 'react';
import { useAuth } from '../auth/AuthContext';
import { getDoctorProfile, updateDoctorProfile } from '../api';
import { useLanguage } from '../i18n/LanguageContext';

function DoctorProfile() {
  const { user, token } = useAuth();
  const { t } = useLanguage();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [form, setForm] = useState({
    fullName: '',
    specialization: '',
    medicalRegistrationNumber: '',
    phone: '',
  });

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');

    getDoctorProfile(token)
      .then((res) => {
        if (!cancelled) {
          const p = res.data.profile;
          setProfile(p);
          setForm({
            fullName: p.fullName || '',
            specialization: p.specialization || '',
            medicalRegistrationNumber: p.medicalRegistrationNumber || '',
            phone: p.phone || '',
          });
        }
      })
      .catch((err) => {
        if (!cancelled) setError(err.message || 'Failed to load profile');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, [token]);

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');
    setSaveSuccess(false);

    try {
      const res = await updateDoctorProfile(token, form);
      const updated = res.data.profile;
      setProfile(updated);
      setForm({
        fullName: updated.fullName || '',
        specialization: updated.specialization || '',
        medicalRegistrationNumber: updated.medicalRegistrationNumber || '',
        phone: updated.phone || '',
      });
      setEditing(false);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      setError(err.message || 'Failed to save profile');
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setForm({
      fullName: profile.fullName || '',
      specialization: profile.specialization || '',
      medicalRegistrationNumber: profile.medicalRegistrationNumber || '',
      phone: profile.phone || '',
    });
    setEditing(false);
    setError('');
  };

  if (loading) {
    return (
      <div className="profile-page">
        <div className="auth-card" style={{ textAlign: 'center', padding: '40px' }}>
          <p>{t('common.loadingProfile')}</p>
        </div>
      </div>
    );
  }

  if (error && !profile) {
    return (
      <div className="profile-page">
        <div className="auth-error">{error}</div>
      </div>
    );
  }

  const name = form.fullName || profile?.fullName || user?.name || '—';
  const initials = name !== '—' ? name.replace('Dr. ', '').split(' ').map((n) => n[0]).join('') : '?';

  const readFields = [
    { label: t('doctor.profile.fullName'), value: profile?.fullName || user?.name || '—' },
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
        {!editing && (
          <button className="primary-btn" type="button" onClick={() => setEditing(true)}>
            {t('doctor.profile.editProfile')}
          </button>
        )}
      </div>

      {saveSuccess && (
        <div className="auth-success">{t('doctor.profile.saveSuccess')}</div>
      )}

      {error && editing && (
        <div className="auth-error">{error}</div>
      )}

      <div className="profile-card">
        <div className="profile-avatar">{initials}</div>
        <div className="profile-name">{name}</div>
        <div className="profile-role">{profile?.specialization || 'DOCTOR'}</div>

        {editing ? (
          <div className="profile-edit-form">
            <div className="profile-edit-grid">
              <div className="form-group">
                <label>{t('doctor.profile.fullName')}</label>
                <input
                  type="text"
                  className="form-input"
                  value={form.fullName}
                  onChange={(e) => handleChange('fullName', e.target.value)}
                />
              </div>
              <div className="form-group">
                <label>{t('doctor.profile.phoneNumber')}</label>
                <input
                  type="text"
                  className="form-input"
                  value={form.phone}
                  onChange={(e) => handleChange('phone', e.target.value)}
                />
              </div>
              <div className="form-group">
                <label>{t('doctor.profile.specialization')}</label>
                <input
                  type="text"
                  className="form-input"
                  value={form.specialization}
                  onChange={(e) => handleChange('specialization', e.target.value)}
                />
              </div>
              <div className="form-group">
                <label>{t('doctor.profile.registrationNumber')}</label>
                <input
                  type="text"
                  className="form-input"
                  value={form.medicalRegistrationNumber}
                  onChange={(e) => handleChange('medicalRegistrationNumber', e.target.value)}
                />
              </div>
            </div>

            <div className="profile-edit-actions">
              <button
                className="primary-btn"
                type="button"
                onClick={handleSave}
                disabled={saving}
              >
                {saving ? t('common.saving') : t('common.save')}
              </button>
              <button
                className="secondary-btn"
                type="button"
                onClick={handleCancel}
                disabled={saving}
              >
                {t('common.cancel')}
              </button>
            </div>
          </div>
        ) : (
          <div className="profile-fields">
            {readFields.map((field) => (
              <div key={field.label} className="profile-field">
                <span className="profile-field-label">{field.label}</span>
                <span className="profile-field-value">{field.value}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default DoctorProfile;
