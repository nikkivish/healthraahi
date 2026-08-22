import { useRef, useState } from 'react';
import { useAuth } from '../auth/AuthContext';
import { useLanguage } from '../i18n/LanguageContext';
import {
  verifyWorkerAccess,
  getDoctorRecords,
  requestConsent,
} from '../api';

function formatDate(iso) {
  if (!iso) return '—';
  return new Date(iso).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function DoctorAccess() {
  const { token } = useAuth();
  const { t } = useLanguage();

  const [healthId, setHealthId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [worker, setWorker] = useState(null);
  const [consent, setConsent] = useState(null);
  const [latestConsent, setLatestConsent] = useState(null);
  const [verified, setVerified] = useState(false);

  const [records, setRecords] = useState([]);
  const [recordsLoading, setRecordsLoading] = useState(false);
  const [showRecords, setShowRecords] = useState(false);

  const [consentLoading, setConsentLoading] = useState(false);
  const [consentSuccess, setConsentSuccess] = useState('');
  const [consentError, setConsentError] = useState('');

  const scannerRef = useRef(null);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [scannerError, setScannerError] = useState('');

  const stopQrScanner = async () => {
    try {
      if (scannerRef.current) {
        const state = scannerRef.current.getState?.();
        if (state === 2) {
          await scannerRef.current.stop();
        }
        await scannerRef.current.clear();
        scannerRef.current = null;
      }
    } catch {
      // cleanup best-effort
    } finally {
      setScannerOpen(false);
    }
  };

  const extractHealthId = (decodedText) => {
    const value = String(decodedText || '').trim();

    try {
      const parsed = JSON.parse(value);
      return (parsed.healthId || parsed.healthID || parsed.health_id || parsed.id || '').toString().trim();
    } catch { /* not JSON */ }

    try {
      const url = new URL(value);
      const fromQuery = url.searchParams.get('healthId') || url.searchParams.get('healthID') || url.searchParams.get('health_id');
      if (fromQuery) return fromQuery.trim();

      const pathParts = url.pathname.split('/').map((p) => decodeURIComponent(p)).filter(Boolean);
      const lookupIndex = pathParts.findIndex((p) => p.toLowerCase() === 'lookup');
      if (lookupIndex !== -1 && pathParts[lookupIndex + 1]) return pathParts[lookupIndex + 1].trim();

      if (pathParts.length > 0) {
        const lastPart = pathParts[pathParts.length - 1].trim();
        if (/^(WH|HRH)-[A-Z0-9-]+$/i.test(lastPart)) return lastPart;
      }
    } catch { /* not URL */ }

    return value;
  };

  const startQrScanner = () => {
    setScannerError('');
    setScannerOpen(true);

    setTimeout(async () => {
      try {
        const { Html5Qrcode } = await import('html5-qrcode');
        const scanner = new Html5Qrcode('qr-reader-access');
        scannerRef.current = scanner;

        await scanner.start(
          { facingMode: 'environment' },
          { fps: 10, qrbox: { width: 250, height: 250 } },
          async (decodedText) => {
            const scannedId = extractHealthId(decodedText);
            if (!scannedId) {
              setScannerError('QR detected, but no Health ID was found.');
              return;
            }
            await stopQrScanner();
            setHealthId(scannedId.trim().toUpperCase());
            await handleSearch(scannedId.trim().toUpperCase());
          },
          () => { /* frame misses ignored */ }
        );
      } catch (err) {
        console.error('QR scanner error:', err);
        setScannerError('Unable to start the camera. Please allow camera access and try again.');
        await stopQrScanner();
      }
    }, 100);
  };

  const handleSearch = async (overrideId) => {
    const id = (overrideId || healthId).trim().toUpperCase();
    if (!id) {
      setError('Please enter a Health ID.');
      return;
    }

    setLoading(true);
    setError('');
    setWorker(null);
    setConsent(null);
    setLatestConsent(null);
    setVerified(false);
    setRecords([]);
    setShowRecords(false);
    setConsentSuccess('');
    setConsentError('');

    try {
      const result = await verifyWorkerAccess(token, id);
      setHealthId(id);
      setWorker(result.worker);
      setConsent(result.consent);
      setLatestConsent(result.latestConsent);
      setVerified(result.verified);
    } catch (err) {
      setError(err.message || 'Worker not found. Please check the Health ID.');
    } finally {
      setLoading(false);
    }
  };

  const handleLoadRecords = async () => {
    if (!worker?.userId) return;

    setRecordsLoading(true);
    try {
      const res = await getDoctorRecords(token);
      const allRecords = res.data?.records || [];
      const filtered = Array.isArray(allRecords)
        ? allRecords.filter((r) => r.workerId === worker.userId)
        : [];
      setRecords(filtered);
      setShowRecords(true);
    } catch {
      setRecords([]);
      setShowRecords(true);
    } finally {
      setRecordsLoading(false);
    }
  };

  const handleRequestConsent = async () => {
    if (!worker?.userId) return;

    setConsentLoading(true);
    setConsentSuccess('');
    setConsentError('');

    try {
      await requestConsent(token, {
        workerId: worker.userId,
        categories: ['HEALTH_INFO', 'MEDICAL_RECORDS', 'GENERAL'],
        purpose: 'Doctor access via QR verification',
        validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      });
      setConsentSuccess('Consent request sent to the worker. They must approve it before you can access records.');
    } catch (err) {
      setConsentError(err.message || 'Failed to send consent request.');
    } finally {
      setConsentLoading(false);
    }
  };

  const resetFlow = async () => {
    await stopQrScanner();
    setHealthId('');
    setWorker(null);
    setConsent(null);
    setLatestConsent(null);
    setVerified(false);
    setRecords([]);
    setShowRecords(false);
    setError('');
    setConsentSuccess('');
    setConsentError('');
  };

  return (
    <div style={{ padding: '32px', minHeight: '100%' }}>
      <div style={{ marginBottom: '28px' }}>
        <h1 style={{ margin: 0, color: 'var(--heading)', fontSize: '1.6rem' }}>
          {t('doctor.dashboard.workerAccess') || 'Worker Access'}
        </h1>
        <p style={{ marginTop: '8px', color: 'var(--muted)', fontSize: '0.9rem' }}>
          Search a worker by Health ID or scan their QR code to access records.
        </p>
      </div>

      {!worker && (
        <div className="card">
          <h2 style={{ marginTop: 0, color: 'var(--heading)' }}>Search Worker</h2>
          <p style={{ color: 'var(--muted)' }}>Enter the worker's Health ID to verify access.</p>

          <form onSubmit={(e) => { e.preventDefault(); handleSearch(); }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: '600', color: 'var(--text)', fontSize: '0.85rem' }}>
              Health ID
            </label>
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              <input
                type="text"
                value={healthId}
                onChange={(e) => setHealthId(e.target.value.toUpperCase())}
                placeholder="e.g. HRH-1001"
                className="input"
                style={{ flex: 1, minWidth: '250px' }}
              />
              <button type="submit" className="button-primary" disabled={loading}>
                {loading ? 'Searching...' : 'Search'}
              </button>
              <button type="button" className="button-secondary" onClick={startQrScanner} disabled={scannerOpen}>
                {scannerOpen ? 'Scanning...' : 'Scan QR'}
              </button>
            </div>
          </form>

          {scannerOpen && (
            <div style={{ marginTop: '16px' }}>
              <div
                id="qr-reader-access"
                style={{
                  width: '100%',
                  maxWidth: '400px',
                  borderRadius: '10px',
                  overflow: 'hidden',
                }}
              />
              <button
                type="button"
                className="button-secondary"
                style={{ marginTop: '8px' }}
                onClick={stopQrScanner}
              >
                Stop Camera
              </button>
            </div>
          )}

          {scannerError && (
            <div className="alert alert-error" style={{ marginTop: '12px' }}>
              {scannerError}
            </div>
          )}

          {error && (
            <div className="alert alert-error" style={{ marginTop: '12px' }}>
              {error}
            </div>
          )}
        </div>
      )}

      {worker && (
        <>
          <div className="card">
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '12px' }}>
              <span
                style={{
                  display: 'inline-block',
                  background: verified ? 'var(--teal-soft)' : '#fff4f2',
                  color: verified ? 'var(--teal)' : 'var(--error)',
                  padding: '4px 12px',
                  borderRadius: '20px',
                  fontSize: '0.78rem',
                  fontWeight: '600',
                }}
              >
                {verified ? '✓ Access Verified' : '⏳ Consent Required'}
              </span>
            </div>

            <h2 style={{ margin: '5px 0', color: 'var(--heading)', fontSize: '1.2rem' }}>
              {worker.name}
            </h2>
            <p style={{ margin: '5px 0', color: 'var(--muted)', fontSize: '0.88rem' }}>
              Health ID: <strong>{worker.healthId}</strong>
              {worker.phone && <span style={{ marginLeft: '16px' }}>Phone: {worker.phone}</span>}
            </p>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '12px', marginTop: '16px' }}>
              {worker.gender && (
                <div style={{ padding: '12px', background: 'var(--panel-bg)', borderRadius: '8px' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--muted)', marginBottom: '4px' }}>Gender</div>
                  <strong style={{ color: 'var(--text)' }}>{worker.gender}</strong>
                </div>
              )}
              {worker.bloodGroup && (
                <div style={{ padding: '12px', background: 'var(--panel-bg)', borderRadius: '8px' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--muted)', marginBottom: '4px' }}>Blood Group</div>
                  <strong style={{ color: 'var(--text)' }}>{worker.bloodGroup}</strong>
                </div>
              )}
              {worker.dateOfBirth && (
                <div style={{ padding: '12px', background: 'var(--panel-bg)', borderRadius: '8px' }}>
                  <div style={{ fontSize: '0.75rem', color: 'var(--muted)', marginBottom: '4px' }}>Date of Birth</div>
                  <strong style={{ color: 'var(--text)' }}>{formatDate(worker.dateOfBirth)}</strong>
                </div>
              )}
            </div>

            {!verified && (
              <div style={{ marginTop: '20px' }}>
                {consentSuccess ? (
                  <div className="alert alert-success">{consentSuccess}</div>
                ) : (
                  <>
                    <p style={{ color: 'var(--muted)', fontSize: '0.88rem', marginBottom: '12px' }}>
                      You need active consent from this worker to view their clinical records.
                    </p>
                    <button
                      type="button"
                      className="button-primary"
                      onClick={handleRequestConsent}
                      disabled={consentLoading}
                    >
                      {consentLoading ? 'Sending...' : 'Request Consent'}
                    </button>
                  </>
                )}
                {consentError && (
                  <div className="alert alert-error" style={{ marginTop: '10px' }}>{consentError}</div>
                )}
              </div>
            )}

            {verified && latestConsent && (
              <div style={{ marginTop: '16px', padding: '12px', background: 'var(--teal-soft)', borderRadius: '8px', color: 'var(--teal)', fontSize: '0.85rem' }}>
                🔐 Consent verified — {latestConsent.status} ({latestConsent.categories?.join(', ')})
                {latestConsent.validUntil && <span> · Expires {formatDate(latestConsent.validUntil)}</span>}
              </div>
            )}
          </div>

          {verified && (
            <div className="card" style={{ marginTop: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h2 style={{ margin: 0, color: 'var(--heading)', fontSize: '1.1rem' }}>Clinical Records</h2>
                {!showRecords ? (
                  <button
                    type="button"
                    className="button-primary"
                    onClick={handleLoadRecords}
                    disabled={recordsLoading}
                  >
                    {recordsLoading ? 'Loading...' : 'View Records'}
                  </button>
                ) : (
                  <span style={{ color: 'var(--muted)', fontSize: '0.85rem' }}>{records.length} record(s)</span>
                )}
              </div>

              {showRecords && records.length === 0 && (
                <p style={{ color: 'var(--muted)', fontSize: '0.88rem' }}>No clinical records found for this worker.</p>
              )}

              {showRecords && records.length > 0 && (
                <div style={{ display: 'grid', gap: '12px' }}>
                  {records.map((record) => (
                    <div
                      key={record.id || record._id}
                      style={{
                        padding: '16px',
                        background: 'var(--panel-bg)',
                        borderRadius: '10px',
                        border: '1px solid var(--border)',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <strong style={{ color: 'var(--text)' }}>{record.title || record.recordType || 'Record'}</strong>
                        <span style={{ fontSize: '0.78rem', color: 'var(--muted)' }}>{formatDate(record.createdAt)}</span>
                      </div>
                      {record.diagnosis && (
                        <p style={{ margin: '6px 0 0', color: 'var(--muted)', fontSize: '0.85rem' }}>
                          Diagnosis: {record.diagnosis}
                        </p>
                      )}
                      {record.summary && (
                        <p style={{ margin: '4px 0 0', color: 'var(--muted)', fontSize: '0.85rem' }}>
                          {record.summary}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          <button
            type="button"
            className="button-secondary"
            style={{ marginTop: '16px' }}
            onClick={resetFlow}
          >
            ← Search another Health ID
          </button>
        </>
      )}
    </div>
  );
}

export default DoctorAccess;
