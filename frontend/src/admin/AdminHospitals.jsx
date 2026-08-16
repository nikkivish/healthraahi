import { useState, useEffect } from 'react';
import { useAuth } from '../auth/AuthContext';
import { getAllHospitals } from '../api';
import { useLanguage } from '../i18n/LanguageContext';

function AdminHospitals() {
  const { token } = useAuth();
  const { t } = useLanguage();
  const [search, setSearch] = useState('');
  const [hospitalList, setHospitalList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    getAllHospitals(token)
      .then((res) => {
        setHospitalList(res.data.hospitals || []);
        setLoading(false);
      })
      .catch(() => {
        setError(t('admin.hospitals.failedLoad'));
        setLoading(false);
      });
  }, [token]);

  const filtered = hospitalList.filter(
    (h) =>
      h.name?.toLowerCase().includes(search.toLowerCase()) ||
      h.city?.toLowerCase().includes(search.toLowerCase()) ||
      h.state?.toLowerCase().includes(search.toLowerCase()) ||
      h.address?.toLowerCase().includes(search.toLowerCase())
  );

  if (loading) return <div className="workers-page"><p className="loading-text">{t('common.loading')}</p></div>;

  return (
    <div className="workers-page">
      <div className="page-header">
        <h1>{t('admin.hospitals.title')}</h1>
        <span className="page-count">{filtered.length} {t('common.total')}</span>
      </div>

      {error && <p className="error-text">{error}</p>}

      <div className="search-bar">
        <input
          type="text"
          className="search-input"
          placeholder={t('admin.hospitals.searchPlaceholder')}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      <div className="records-table-wrapper">
        <table className="records-table">
          <thead>
            <tr>
              <th>Hospital</th>
              <th>Hospital ID</th>
              <th>Location</th>
              <th>Contact</th>
              <th>Status</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr><td colSpan={6} className="empty-table-cell">{t('admin.hospitals.noHospitals')}</td></tr>
            )}
            {filtered.map((h) => (
              <tr key={h.id}>
                <td><span className="table-primary">{h.name}</span></td>
                <td><span className="table-mono">{h.hospitalId}</span></td>
                <td>{[h.city, h.state].filter(Boolean).join(', ') || h.address || '—'}</td>
                <td><span className="table-mono">{h.phone}</span></td>
                <td>
                  <span className={`worker-status-badge ${h.isActive ? 'active' : 'inactive'}`}>
                    {h.isActive ? t('common.active') : t('common.inactive')}
                  </span>
                </td>
                <td><button className="view-btn" type="button">{t('common.viewDetails')}</button></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default AdminHospitals;
