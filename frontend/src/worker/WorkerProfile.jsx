import { useState, useEffect } from 'react';
import { useAuth } from '../auth/AuthContext';
import { useLanguage } from '../i18n/LanguageContext';
import { getWorkerProfile, updateWorkerProfile } from '../api';

const GENDER_OPTIONS = ['MALE', 'FEMALE', 'OTHER', 'PREFER_NOT_TO_SAY'];
const BLOOD_GROUP_OPTIONS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

function buildFormFromProfile(profile) {
  const dob = profile?.dateOfBirth
    ? profile.dateOfBirth.slice(0, 10)
    : '';

  return {
    dateOfBirth: dob,
    gender: profile?.gender || '',
    bloodGroup: profile?.bloodGroup || '',
    address: profile?.address || '',
    emergencyContactName: profile?.emergencyContact?.name || '',
    emergencyContactPhone: profile?.emergencyContact?.phone || '',
    emergencyContactRelationship: profile?.emergencyContact?.relationship || '',
    allergies: Array.isArray(profile?.allergies) ? profile.allergies.join(', ') : '',
  };
}

function buildPayload(form) {
  const payload = {};

  if (form.dateOfBirth) payload.dateOfBirth = form.dateOfBirth;
  if (form.gender) payload.gender = form.gender;
  if (form.bloodGroup) payload.bloodGroup = form.bloodGroup;
  if (form.address) payload.address = form.address;

  const ecName = form.emergencyContactName.trim();
  const ecPhone = form.emergencyContactPhone.trim();
  const ecRel = form.emergencyContactRelationship.trim();
  if (ecName || ecPhone || ecRel) {
    payload.emergencyContact = { name: ecName, phone: ecPhone, relationship: ecRel };
  }

  if (form.allergies.trim()) {
    payload.allergies = form.allergies
      .split(',')
      .map((a) => a.trim())
      .filter(Boolean);
  } else {
    payload.allergies = [];
  }

  return payload;
}

function WorkerProfile() {
  const { user, token } = useAuth();
  const { t } = useLanguage();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [saveSuccess, setSaveSuccess] = useState(false);

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

  const refreshProfile = () => {
    return getWorkerProfile(token).then((res) => {
      setProfile(res.data.profile);
      return res.data.profile;
    });
  };

  const handleEdit = () => {
    setForm(buildFormFromProfile(profile));
    setEditing(true);
    setSaveError('');
    setSaveSuccess(false);
  };

  const handleCancel = () => {
    setEditing(false);
    setForm({});
    setSaveError('');
    setSaveSuccess(false);
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveError('');
    setSaveSuccess(false);

    try {
      const payload = buildPayload(form);
      await updateWorkerProfile(token, payload);
      await refreshProfile();
      setEditing(false);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      setSaveError(err.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const setField = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
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

  if (error) {
    return (
      <div className="profile-page">
        <div className="auth-error">{error}</div>
      </div>
    );
  }

  const name = user?.name || '—';
  const initials = name !== '—' ? name.split(' ').map((n) => n[0]).join('') : '?';

  const readOnlyFields = [
    { label: t('worker.profile.fullName'), value: name },
    { label: t('worker.profile.phoneNumber'), value: user?.phone || '—' },
    { label: t('worker.profile.email'), value: user?.email || '—' },
    { label: t('worker.profile.healthId'), value: profile?.healthId || '—' },
    { label: t('worker.profile.role'), value: user?.role || '—' },
  ];

  return (
    <div className="profile-page">
      <div className="page-header">
        <h1>{t('worker.profile.title')}</h1>
        {!editing && (
          <button className="primary-btn" type="button" onClick={handleEdit}>
            {t('common.editProfile')}
          </button>
        )}
      </div>

      {saveSuccess && (
        <div className="profile-save-success">{t('worker.profile.profileUpdated')}</div>
      )}

      <div className="profile-card">
        <div className="profile-avatar">{initials}</div>
        <div className="profile-name">{name}</div>
        <div className="profile-role">{user?.role || t('auth.worker')}</div>

        {editing ? (
          <div className="profile-edit-form">
            <div className="profile-edit-section-title">{t('worker.profile.readOnlyFields')}</div>
            <div className="profile-readonly-grid">
              {readOnlyFields.map((f) => (
                <div key={f.label} className="profile-field">
                  <span className="profile-field-label">{f.label}</span>
                  <span className="profile-field-value">{f.value}</span>
                </div>
              ))}
            </div>

            <div className="profile-edit-section-title">{t('worker.profile.editableFields')}</div>
            <div className="profile-edit-grid">
              <div className="form-group">
                <label className="form-label">{t('worker.profile.dateOfBirth')}</label>
                <input
                  type="date"
                  className="form-input"
                  value={form.dateOfBirth}
                  onChange={(e) => setField('dateOfBirth', e.target.value)}
                  max={new Date().toISOString().slice(0, 10)}
                  disabled={saving}
                />
              </div>

              <div className="form-group">
                <label className="form-label">{t('worker.profile.gender')}</label>
                <select
                  className="form-input"
                  value={form.gender}
                  onChange={(e) => setField('gender', e.target.value)}
                  disabled={saving}
                >
                  <option value="">{t('worker.profile.selectGender')}</option>
                  {GENDER_OPTIONS.map((g) => (
                    <option key={g} value={g}>{t(`worker.profile.genderOptions.${g}`)}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">{t('worker.profile.bloodGroup')}</label>
                <select
                  className="form-input"
                  value={form.bloodGroup}
                  onChange={(e) => setField('bloodGroup', e.target.value)}
                  disabled={saving}
                >
                  <option value="">{t('worker.profile.selectBloodGroup')}</option>
                  {BLOOD_GROUP_OPTIONS.map((bg) => (
                    <option key={bg} value={bg}>{bg}</option>
                  ))}
                </select>
              </div>

              <div className="form-group profile-field-full">
                <label className="form-label">{t('worker.profile.address')}</label>
                <textarea
                  className="form-input"
                  rows={2}
                  value={form.address}
                  onChange={(e) => setField('address', e.target.value)}
                  disabled={saving}
                />
              </div>
            </div>

            <div className="profile-edit-section-title">{t('worker.profile.emergencyContact')}</div>
            <div className="profile-edit-grid">
              <div className="form-group">
                <label className="form-label">{t('worker.profile.ecName')}</label>
                <input
                  type="text"
                  className="form-input"
                  value={form.emergencyContactName}
                  onChange={(e) => setField('emergencyContactName', e.target.value)}
                  disabled={saving}
                />
              </div>
              <div className="form-group">
                <label className="form-label">{t('worker.profile.ecPhone')}</label>
                <input
                  type="tel"
                  className="form-input"
                  value={form.emergencyContactPhone}
                  onChange={(e) => setField('emergencyContactPhone', e.target.value)}
                  disabled={saving}
                />
              </div>
              <div className="form-group">
                <label className="form-label">{t('worker.profile.ecRelationship')}</label>
                <input
                  type="text"
                  className="form-input"
                  value={form.emergencyContactRelationship}
                  onChange={(e) => setField('emergencyContactRelationship', e.target.value)}
                  disabled={saving}
                />
              </div>
            </div>

            <div className="profile-edit-section-title">{t('worker.profile.allergies')}</div>
            <div className="profile-edit-grid">
              <div className="form-group profile-field-full">
                <label className="form-label">{t('worker.profile.allergiesLabel')}</label>
                <input
                  type="text"
                  className="form-input"
                  value={form.allergies}
                  onChange={(e) => setField('allergies', e.target.value)}
                  placeholder={t('worker.profile.allergiesPlaceholder')}
                  disabled={saving}
                />
                <span className="profile-field-hint">{t('worker.profile.allergiesHint')}</span>
              </div>
            </div>

            {saveError && <div className="auth-error">{saveError}</div>}

            <div className="profile-edit-actions">
              <button
                className="primary-btn"
                type="button"
                onClick={handleSave}
                disabled={saving}
              >
                {saving ? t('worker.profile.saving') : t('worker.profile.saveChanges')}
              </button>
              <button
                className="secondary-btn"
                type="button"
                onClick={handleCancel}
                disabled={saving}
              >
                {t('worker.profile.cancel')}
              </button>
            </div>
          </div>
        ) : (
          <div className="profile-fields">
            {readOnlyFields.map((field) => (
              <div key={field.label} className="profile-field">
                <span className="profile-field-label">{field.label}</span>
                <span className="profile-field-value">{field.value}</span>
              </div>
            ))}
            <div className="profile-field">
              <span className="profile-field-label">{t('worker.profile.dateOfBirth')}</span>
              <span className="profile-field-value">{profile?.dateOfBirth || '—'}</span>
            </div>
            <div className="profile-field">
              <span className="profile-field-label">{t('worker.profile.gender')}</span>
              <span className="profile-field-value">{profile?.gender || '—'}</span>
            </div>
            <div className="profile-field">
              <span className="profile-field-label">{t('worker.profile.bloodGroup')}</span>
              <span className="profile-field-value">{profile?.bloodGroup || '—'}</span>
            </div>
            <div className="profile-field">
              <span className="profile-field-label">{t('worker.profile.address')}</span>
              <span className="profile-field-value">{profile?.address || '—'}</span>
            </div>
            <div className="profile-field">
              <span className="profile-field-label">{t('worker.profile.emergencyContact')}</span>
              <span className="profile-field-value">
                {profile?.emergencyContact
                  ? `${profile.emergencyContact.name} (${profile.emergencyContact.relationship}) — ${profile.emergencyContact.phone}`
                  : '—'}
              </span>
            </div>
            <div className="profile-field">
              <span className="profile-field-label">{t('worker.profile.allergies')}</span>
              <span className="profile-field-value">
                {profile?.allergies?.length > 0 ? profile.allergies.join(', ') : '—'}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default WorkerProfile;
