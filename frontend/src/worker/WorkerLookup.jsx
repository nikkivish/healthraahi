import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { lookupWorkerByHealthId } from '../api';

function WorkerLookup() {
  const { healthId } = useParams();
  const { user, token } = useAuth();
  const [worker, setWorker] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!token || !user) return;
    if (user.role !== 'DOCTOR' && user.role !== 'ADMIN') return;

    setLoading(true);
    setError('');

    lookupWorkerByHealthId(token, healthId)
      .then((res) => {
        setWorker(res.data.worker);
      })
      .catch((err) => {
        setError(err.message || 'Worker not found');
      })
      .finally(() => {
        setLoading(false);
      });
  }, [token, user, healthId]);

  if (!user) {
    return (
      <div className="healthid-page">
        <div className="auth-card" style={{ maxWidth: 480, margin: '60px auto', textAlign: 'center' }}>
          <div className="healthid-badge">
            <span className="healthid-badge-dot" />
            Identity Verification
          </div>
          <h2 style={{ margin: '0 0 8px' }}>Login Required</h2>
          <p style={{ color: 'var(--muted)', marginBottom: 24 }}>
            You must be logged in as a verified doctor to view worker identity details.
          </p>
          <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
            <Link to="/login" className="primary-btn" style={{ textDecoration: 'none' }}>
              Login
            </Link>
            <Link to="/register" className="secondary-btn" style={{ textDecoration: 'none' }}>
              Register
            </Link>
          </div>
        </div>
      </div>
    );
  }

  if (user.role !== 'DOCTOR' && user.role !== 'ADMIN') {
    return (
      <div className="healthid-page">
        <div className="auth-card" style={{ maxWidth: 480, margin: '60px auto', textAlign: 'center' }}>
          <div className="healthid-badge">
            <span className="healthid-badge-dot" />
            Identity Verification
          </div>
          <h2 style={{ margin: '0 0 8px' }}>Access Restricted</h2>
          <p style={{ color: 'var(--muted)', marginBottom: 24 }}>
            Only verified doctors can look up worker identity information.
            Your current role ({user.role}) does not have access to this endpoint.
          </p>
          <Link
            to={user.role === 'WORKER' ? '/worker/dashboard' : '/admin/dashboard'}
            className="primary-btn"
            style={{ textDecoration: 'none' }}
          >
            Go to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="healthid-page">
      <div className="auth-card" style={{ maxWidth: 520, margin: '60px auto' }}>
        <div className="healthid-badge">
          <span className="healthid-badge-dot" />
          Identity Verification
        </div>

        <div className="healthid-value" style={{ fontSize: '1.1rem', marginBottom: 20 }}>
          {healthId}
        </div>

        {loading && (
          <p style={{ textAlign: 'center', color: 'var(--muted)' }}>Looking up worker...</p>
        )}

        {error && (
          <div className="auth-error" style={{ marginBottom: 0 }}>{error}</div>
        )}

        {worker && (
          <>
            <div className="healthid-info-row" style={{ marginBottom: 20 }}>
              <div className="healthid-info-item">
                <span className="healthid-info-label">Name</span>
                <span className="healthid-info-value">{worker.name}</span>
              </div>
              <div className="healthid-info-item">
                <span className="healthid-info-label">Status</span>
                <span className="healthid-info-value">
                  <span className={`worker-status-badge ${worker.isActive ? 'active' : 'inactive'}`}>
                    {worker.isActive ? 'Active' : 'Inactive'}
                  </span>
                </span>
              </div>
            </div>

            <div style={{
              background: 'var(--teal-soft)',
              borderRadius: 12,
              padding: '14px 18px',
              marginBottom: 20,
              fontSize: '0.85rem',
              color: 'var(--teal-dark)',
              lineHeight: 1.5,
            }}>
              To access this worker's medical records, please request consent through the
              existing consent workflow in your doctor dashboard.
            </div>

            <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
              <Link to="/doctor/consents" className="primary-btn" style={{ textDecoration: 'none' }}>
                Request Consent
              </Link>
              <Link to="/doctor/dashboard" className="secondary-btn" style={{ textDecoration: 'none' }}>
                Back to Dashboard
              </Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default WorkerLookup;
