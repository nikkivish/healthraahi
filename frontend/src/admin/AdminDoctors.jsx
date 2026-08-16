import { useState, useEffect } from 'react';
import { useAuth } from '../auth/AuthContext';
import { getPendingDoctors, verifyDoctor } from '../api';
import { useLanguage } from '../i18n/LanguageContext';

function AdminDoctors() {
  const { token } = useAuth();
  const { t } = useLanguage();
  const [search, setSearch] = useState('');
  const [doctorList, setDoctorList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState('');

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    getPendingDoctors(token)
      .then((res) => {
        setDoctorList(res.data.profiles || []);
        setLoading(false);
      })
      .catch(() => {
        setError(t('admin.doctors.failedLoad'));
        setLoading(false);
      });
  }, [token]);

  const filtered = doctorList.filter(
    (d) =>
      d.fullName?.toLowerCase().includes(search.toLowerCase()) ||
      d.doctorId?.toLowerCase().includes(search.toLowerCase()) ||
      d.specialization?.toLowerCase().includes(search.toLowerCase())
  );

  const handleVerify = (doctorId) => {
    setActionLoading(doctorId);
    verifyDoctor(token, doctorId, 'VERIFIED')
      .then(() => {
        setDoctorList((prev) => prev.filter((d) => d.id !== doctorId));
      })
      .catch(() => setError(t('admin.doctors.failedVerify')))
      .finally(() => setActionLoading(''));
  };

  const handleReject = (doctorId) => {
    setActionLoading(doctorId);
    verifyDoctor(token, doctorId, 'REJECTED')
      .then(() => {
        setDoctorList((prev) => prev.filter((d) => d.id !== doctorId));
      })
      .catch(() => setError(t('admin.doctors.failedReject')))
      .finally(() => setActionLoading(''));
  };

  if (loading) return <div className="workers-page"><p className="loading-text">{t('common.loading')}</p></div>;

  return (
    <div className="workers-page">
      <div className="page-header">
        <h1>{t('admin.doctors.title')}</h1>
        <span className="page-count">{filtered.length} {t('common.pendingLower')}</span>
      </div>

      {error && <p className="error-text">{error}</p>}

      <div className="search-bar">
        <input
          type="text"
          className="search-input"
          placeholder={t('admin.doctors.searchPlaceholder')}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="records-table-wrapper">
        <table className="records-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Doctor ID</th>
              <th>Specialization</th>
              <th>Hospital</th>
              <th>Phone</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr><td colSpan={6} className="empty-table-cell">{t('admin.doctors.noPending')}</td></tr>
            )}
            {filtered.map((d) => (
              <tr key={d.id}>
                <td><span className="table-primary">{d.fullName}</span></td>
                <td><span className="table-mono">{d.doctorId}</span></td>
                <td>{d.specialization}</td>
                <td>{d.hospital?.name || '—'}</td>
                <td><span className="table-mono">{d.phone}</span></td>
                <td>
                  <div className="table-action-group">
                    <button
                      className="consent-btn approve"
                      type="button"
                      disabled={actionLoading === d.id}
                      onClick={() => handleVerify(d.id)}
                    >
                      {actionLoading === d.id ? '...' : t('admin.doctors.approve')}
                    </button>
                    <button
                      className="consent-btn reject"
                      type="button"
                      disabled={actionLoading === d.id}
                      onClick={() => handleReject(d.id)}
                    >
                      {actionLoading === d.id ? '...' : t('admin.doctors.reject')}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default AdminDoctors;
