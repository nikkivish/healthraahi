import { useState, useEffect } from 'react';
import { useAuth } from '../auth/AuthContext';
import { getAdminAuditLogs } from '../api';
import { useLanguage } from '../i18n/LanguageContext';

function AdminAudit() {
  const { token } = useAuth();
  const { t } = useLanguage();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState({ actorRole: '', action: '', resourceType: '', result: '' });
  const [page, setPage] = useState(0);
  const [total, setTotal] = useState(0);
  const limit = 20;

  const fetchLogs = () => {
    if (!token) return;
    setLoading(true);
    const params = { limit, skip: page * limit };
    if (filters.actorRole) params.actorRole = filters.actorRole;
    if (filters.action) params.action = filters.action;
    if (filters.resourceType) params.resourceType = filters.resourceType;
    if (filters.result) params.result = filters.result;

    getAdminAuditLogs(token, params)
      .then((res) => {
        setLogs(res.data.logs || []);
        setTotal(res.data.total || 0);
        setLoading(false);
      })
      .catch(() => {
        setError(t('admin.audit.failedLoad'));
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchLogs();
  }, [token, page]);

  const handleFilterChange = (key, value) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const applyFilters = () => {
    setPage(0);
    fetchLogs();
  };

  const actionLabel = (action) => {
    return t('admin.actionLabels.' + action) || action;
  };

  const roleLabel = (role) => {
    return t('admin.roleLabels.' + role) || role;
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="workers-page">
      <div className="page-header">
        <h1>{t('admin.audit.title')}</h1>
        <span className="page-count">{total} {t('common.entries')}</span>
      </div>

      {error && <p className="error-text">{error}</p>}

      <div className="search-bar admin-filters">
        <select
          className="search-input"
          value={filters.actorRole}
          onChange={(e) => handleFilterChange('actorRole', e.target.value)}
        >
          <option value="">{t('admin.audit.allRoles')}</option>
          <option value="WORKER">{t('admin.roleLabels.WORKER')}</option>
          <option value="DOCTOR">{t('admin.roleLabels.DOCTOR')}</option>
          <option value="ADMIN">{t('admin.roleLabels.ADMIN')}</option>
        </select>
        <select
          className="search-input"
          value={filters.action}
          onChange={(e) => handleFilterChange('action', e.target.value)}
        >
          <option value="">{t('admin.audit.allActions')}</option>
          <option value="CONSENT_REQUESTED">{t('admin.audit.consentRequested')}</option>
          <option value="CONSENT_APPROVED">{t('admin.audit.consentApproved')}</option>
          <option value="CONSENT_REJECTED">{t('admin.audit.consentRejected')}</option>
          <option value="CONSENT_REVOKED">{t('admin.audit.consentRevoked')}</option>
          <option value="CLINICAL_RECORD_CREATED">{t('admin.audit.recordCreated')}</option>
          <option value="CLINICAL_RECORD_UPDATED">{t('admin.audit.recordUpdated')}</option>
          <option value="CLINICAL_RECORD_VIEWED">{t('admin.audit.recordViewed')}</option>
        </select>
        <select
          className="search-input"
          value={filters.resourceType}
          onChange={(e) => handleFilterChange('resourceType', e.target.value)}
        >
          <option value="">{t('admin.audit.allResources')}</option>
          <option value="CONSENT">{t('admin.audit.consent')}</option>
          <option value="CLINICAL_RECORD">{t('admin.audit.clinicalRecord')}</option>
        </select>
        <select
          className="search-input"
          value={filters.result}
          onChange={(e) => handleFilterChange('result', e.target.value)}
        >
          <option value="">{t('admin.audit.allResults')}</option>
          <option value="SUCCESS">Success</option>
          <option value="DENIED">Denied</option>
          <option value="FAILED">Failed</option>
        </select>
        <button className="view-btn" type="button" onClick={applyFilters}>{t('admin.audit.apply')}</button>
      </div>

      <div className="records-table-wrapper">
        <table className="records-table">
          <thead>
            <tr>
              <th>{t('admin.audit.action')}</th>
              <th>{t('admin.audit.resource')}</th>
              <th>{t('admin.audit.role')}</th>
              <th>{t('admin.audit.timestamp')}</th>
              <th>{t('admin.audit.result')}</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={5} className="empty-table-cell">{t('common.loading')}</td></tr>
            ) : logs.length === 0 ? (
              <tr><td colSpan={5} className="empty-table-cell">{t('admin.audit.noLogs')}</td></tr>
            ) : (
              logs.map((log) => (
                <tr key={log.id}>
                  <td><span className="table-primary">{actionLabel(log.action)}</span></td>
                  <td><span className={`admin-role-badge ${log.resourceType === 'CONSENT' ? 'consent' : 'record'}`}>{log.resourceType}</span></td>
                  <td><span className={`admin-role-badge ${log.actorRole?.toLowerCase()}`}>{roleLabel(log.actorRole)}</span></td>
                  <td><span className="table-mono">{log.createdAt ? new Date(log.createdAt).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'}</span></td>
                  <td>
                    <span className={`audit-status-badge ${log.result?.toLowerCase()}`}>
                      {log.result}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="pagination-controls">
          <button className="view-btn" type="button" disabled={page === 0} onClick={() => setPage((p) => p - 1)}>{t('common.previous')}</button>
          <span className="page-count">{t('common.page')} {page + 1} {t('common.of')} {totalPages}</span>
          <button className="view-btn" type="button" disabled={page >= totalPages - 1} onClick={() => setPage((p) => p + 1)}>{t('common.next')}</button>
        </div>
      )}
    </div>
  );
}

export default AdminAudit;
