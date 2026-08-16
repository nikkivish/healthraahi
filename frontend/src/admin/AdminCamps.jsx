import { useState, useEffect } from 'react';
import { useAuth } from '../auth/AuthContext';
import { useLanguage } from '../i18n/LanguageContext';
import { getAdminAllCamps, createCamp, updateCamp, cancelCamp } from '../api';

function formatDate(dateStr) {
  if (!dateStr) return '';
  return new Date(dateStr).toLocaleDateString('en-IN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

const EMPTY_FORM = {
  name: '',
  date: '',
  timeSlots: [{ startTime: '09:00', endTime: '12:00', capacity: 50 }],
  location: '',
  city: '',
  specialties: '',
  feeType: 'FREE',
  description: '',
  organizer: '',
};

function AdminCamps() {
  const { token } = useAuth();
  const { t } = useLanguage();
  const [camps, setCamps] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [editingCamp, setEditingCamp] = useState(null);
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const fetchData = () => {
    if (!token) return;
    setLoading(true);
    getAdminAllCamps(token)
      .then((res) => setCamps(res.data.camps))
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchData(); }, [token]);

  const openCreate = () => {
    setEditingCamp(null);
    setForm({ ...EMPTY_FORM });
    setFormError('');
    setShowForm(true);
  };

  const openEdit = (camp) => {
    setEditingCamp(camp);
    setForm({
      name: camp.name || '',
      date: camp.date ? camp.date.split('T')[0] : '',
      timeSlots: (camp.timeSlots || []).map((s) => ({
        startTime: s.startTime,
        endTime: s.endTime,
        capacity: s.capacity,
      })),
      location: camp.location || '',
      city: camp.city || '',
      specialties: (camp.specialties || []).join(', '),
      feeType: camp.feeType || 'FREE',
      description: camp.description || '',
      organizer: camp.organizer || '',
    });
    setFormError('');
    setShowForm(true);
  };

  const handleSlotChange = (index, field, value) => {
    const updated = [...form.timeSlots];
    updated[index] = { ...updated[index], [field]: field === 'capacity' ? Number(value) : value };
    setForm({ ...form, timeSlots: updated });
  };

  const addSlot = () => {
    setForm({
      ...form,
      timeSlots: [...form.timeSlots, { startTime: '14:00', endTime: '17:00', capacity: 30 }],
    });
  };

  const removeSlot = (index) => {
    if (form.timeSlots.length <= 1) return;
    setForm({ ...form, timeSlots: form.timeSlots.filter((_, i) => i !== index) });
  };

  const handleSave = async () => {
    setSaving(true);
    setFormError('');
    try {
      const payload = {
        name: form.name,
        date: form.date,
        timeSlots: form.timeSlots,
        location: form.location,
        city: form.city,
        specialties: form.specialties.split(',').map((s) => s.trim()).filter(Boolean),
        feeType: form.feeType,
        description: form.description,
        organizer: form.organizer,
      };
      if (editingCamp) {
        await updateCamp(token, editingCamp.id, payload);
      } else {
        await createCamp(token, payload);
      }
      setShowForm(false);
      fetchData();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleCancelCamp = async (campId) => {
    if (!window.confirm(t('camps.confirmCancelCamp'))) return;
    try {
      await cancelCamp(token, campId);
      fetchData();
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div className="camps-page">
      <section className="dashboard-welcome">
        <h1>{t('camps.adminManageCamps')}</h1>
        <p>{t('camps.adminManageCampsDesc')}</p>
      </section>

      <div style={{ marginBottom: 20 }}>
        <button className="primary-btn" type="button" onClick={openCreate}>
          {t('camps.createCamp')}
        </button>
      </div>

      {loading && <p>{t('common.loading')}</p>}
      {error && <p style={{ color: '#c0392b' }}>{error}</p>}

      {!loading && !error && camps.length === 0 && (
        <div className="camps-empty">
          <span className="camps-empty-icon">🏥</span>
          <p>{t('camps.noCampsYet')}</p>
        </div>
      )}

      {!loading && !error && camps.length > 0 && (
        <div className="camps-grid">
          {camps.map((camp) => {
            const totalCap = (camp.timeSlots || []).reduce((s, sl) => s + sl.capacity, 0);
            const totalReg = (camp.timeSlots || []).reduce((s, sl) => s + sl.registeredCount, 0);
            return (
              <div key={camp.id} className="camp-card">
                <div className="camp-card-header">
                  <span className={`camp-fee-badge ${(camp.feeType || 'FREE').toLowerCase()}`}>
                    {camp.feeType === 'FREE' ? t('camps.free') : t('camps.paid')}
                  </span>
                  <span className={`camp-status-badge ${(camp.status || '').toLowerCase()}`}>
                    {camp.status}
                  </span>
                </div>

                <h3 className="camp-card-title">{camp.name}</h3>
                <div className="camp-card-details">
                  <div className="camp-detail-row">
                    <span className="camp-detail-icon">📅</span>
                    <span>{formatDate(camp.date)}</span>
                  </div>
                  {(camp.timeSlots || []).map((slot, i) => (
                    <div key={i} className="camp-detail-row">
                      <span className="camp-detail-icon">🕐</span>
                      <span>{slot.startTime} – {slot.endTime} ({slot.registeredCount}/{slot.capacity})</span>
                    </div>
                  ))}
                  <div className="camp-detail-row">
                    <span className="camp-detail-icon">📍</span>
                    <span>{camp.location}{camp.city ? `, ${camp.city}` : ''}</span>
                  </div>
                </div>

                <div className="camp-slots-bar">
                  <div className="camp-slots-bar-inner">
                    <div className="camp-slots-bar-fill" style={{ width: `${totalCap > 0 ? Math.round((totalReg / totalCap) * 100) : 0}%` }} />
                  </div>
                  <span className="camp-slots-text">{totalReg}/{totalCap} {t('camps.registered')}</span>
                </div>

                {camp.description && <p className="camp-card-desc">{camp.description}</p>}

                <div className="camp-card-actions">
                  {camp.status !== 'CANCELLED' && camp.status !== 'COMPLETED' && (
                    <>
                      <button className="secondary-btn camp-btn" type="button" onClick={() => openEdit(camp)}>
                        {t('camps.edit')}
                      </button>
                      <button className="camp-btn camp-cancel-btn" type="button" onClick={() => handleCancelCamp(camp.id)}>
                        {t('camps.cancelCamp')}
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showForm && (
        <div className="camps-modal-overlay" onClick={() => setShowForm(false)}>
          <div className="camps-modal camps-modal-wide" onClick={(e) => e.stopPropagation()}>
            <button className="camps-modal-close" type="button" onClick={() => setShowForm(false)}>✕</button>
            <h2 className="camps-modal-title">
              {editingCamp ? t('camps.editCamp') : t('camps.createCamp')}
            </h2>

            <div className="camps-admin-form">
              <div className="camps-form-group">
                <label className="camps-form-label">{t('camps.campName')} *</label>
                <input className="form-input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>

              <div className="camps-form-group">
                <label className="camps-form-label">{t('camps.campDate')} *</label>
                <input className="form-input" type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
              </div>

              <div className="camps-form-group">
                <label className="camps-form-label">{t('camps.timeSlots')} *</label>
                {form.timeSlots.map((slot, i) => (
                  <div key={i} className="camps-slot-row">
                    <input className="form-input camps-slot-input" type="time" value={slot.startTime} onChange={(e) => handleSlotChange(i, 'startTime', e.target.value)} />
                    <span>–</span>
                    <input className="form-input camps-slot-input" type="time" value={slot.endTime} onChange={(e) => handleSlotChange(i, 'endTime', e.target.value)} />
                    <input className="form-input camps-slot-input" type="number" min="1" value={slot.capacity} onChange={(e) => handleSlotChange(i, 'capacity', e.target.value)} placeholder={t('camps.capacity')} />
                    {form.timeSlots.length > 1 && (
                      <button className="camp-cancel-btn" type="button" onClick={() => removeSlot(i)}>✕</button>
                    )}
                  </div>
                ))}
                <button className="secondary-btn" type="button" onClick={addSlot} style={{ marginTop: 8 }}>
                  + {t('camps.addSlot')}
                </button>
              </div>

              <div className="camps-form-group">
                <label className="camps-form-label">{t('camps.location')} *</label>
                <input className="form-input" value={form.location} onChange={(e) => setForm({ ...form, location: e.target.value })} />
              </div>

              <div className="camps-form-group">
                <label className="camps-form-label">{t('camps.city')} *</label>
                <input className="form-input" value={form.city} onChange={(e) => setForm({ ...form, city: e.target.value })} />
              </div>

              <div className="camps-form-group">
                <label className="camps-form-label">{t('camps.specialties')}</label>
                <input className="form-input" value={form.specialties} onChange={(e) => setForm({ ...form, specialties: e.target.value })} placeholder={t('camps.specialtiesPlaceholder')} />
              </div>

              <div className="camps-form-group">
                <label className="camps-form-label">{t('camps.feeType')}</label>
                <select className="form-input form-select" value={form.feeType} onChange={(e) => setForm({ ...form, feeType: e.target.value })}>
                  <option value="FREE">{t('camps.free')}</option>
                  <option value="PAID">{t('camps.paid')}</option>
                </select>
              </div>

              <div className="camps-form-group">
                <label className="camps-form-label">{t('camps.description')} *</label>
                <textarea className="form-input camps-textarea" rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
              </div>

              <div className="camps-form-group">
                <label className="camps-form-label">{t('camps.organizer')} *</label>
                <input className="form-input" value={form.organizer} onChange={(e) => setForm({ ...form, organizer: e.target.value })} />
              </div>

              {formError && <p className="camps-register-error">{formError}</p>}

              <div className="camps-modal-actions">
                <button className="secondary-btn" type="button" onClick={() => setShowForm(false)}>
                  {t('camps.cancel')}
                </button>
                <button className="primary-btn" type="button" disabled={saving} onClick={handleSave}>
                  {saving ? t('common.loading') : editingCamp ? t('camps.saveChanges') : t('camps.createCamp')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminCamps;
