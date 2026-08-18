import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../auth/AuthContext';
import {
  getPendingDoctors,
  verifyDoctor,
  getAdminDoctorVerificationDocuments,
  adminDownloadDoctorDocument,
  adminUpdateDocumentStatus,
} from '../api';
import { useLanguage } from '../i18n/LanguageContext';

const DOC_TYPES = [
  { key: 'MEDICAL_COUNCIL_REGISTRATION', labelKey: 'doctor.verification.medicalCouncil' },
  { key: 'IDENTITY_PROOF', labelKey: 'doctor.verification.identityProof' },
  { key: 'QUALIFICATION_CERTIFICATE', labelKey: 'doctor.verification.qualifications' },
];

function formatFileSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

function getMimeTypeIcon(mimeType) {
  if (mimeType === 'application/pdf') return '\uD83D\uDCC4';
  if (mimeType?.startsWith('image/')) return '\uD83D\uDDBC\uFE0F';
  return '\uD83D\uDCCD';
}

function AdminDoctors() {
  const { token } = useAuth();
  const { t } = useLanguage();
  const [search, setSearch] = useState('');
  const [doctorList, setDoctorList] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [reviewDoctor, setReviewDoctor] = useState(null);
  const [reviewDocs, setReviewDocs] = useState([]);
  const [reviewLoading, setReviewLoading] = useState(false);
  const [reviewError, setReviewError] = useState('');
  const [reviewSuccess, setReviewSuccess] = useState('');
  const [actionLoading, setActionLoading] = useState('');

  const [rejectTarget, setRejectTarget] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [rejectError, setRejectError] = useState('');
  const [rejecting, setRejecting] = useState(false);

  const [verifyTarget, setVerifyTarget] = useState(null);
  const [verifying, setVerifying] = useState(false);

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

  const openReview = useCallback((doctor) => {
    setReviewDoctor(doctor);
    setReviewDocs([]);
    setReviewError('');
    setReviewSuccess('');
    setReviewLoading(true);
    getAdminDoctorVerificationDocuments(token, doctor.userId)
      .then((res) => {
        setReviewDocs(res.data.documents || []);
      })
      .catch((err) => {
        setReviewError(err.message || t('admin.doctors.failedLoad'));
      })
      .finally(() => setReviewLoading(false));
  }, [token, t]);

  const closeReview = () => {
    setReviewDoctor(null);
    setReviewDocs([]);
    setReviewError('');
    setReviewSuccess('');
  };

  const getDocForType = (docType) => reviewDocs.find((d) => d.documentType === docType) || null;

  const approvedCount = reviewDocs.filter((d) => d.status === 'APPROVED').length;
  const allRequiredApproved = DOC_TYPES.every((dt) => {
    const doc = reviewDocs.find((d) => d.documentType === dt.key);
    return doc && doc.status === 'APPROVED';
  });

  const handleView = async (doc) => {
    try {
      const res = await adminDownloadDoctorDocument(token, doc.id);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch {
      alert(t('documents.viewFailed'));
    }
  };

  const handleApproveDoc = async (doc) => {
    setActionLoading(doc.id);
    try {
      await adminUpdateDocumentStatus(token, doc.id, 'APPROVED');
      setReviewDocs((prev) =>
        prev.map((d) => (d.id === doc.id ? { ...d, status: 'APPROVED', rejectionReason: null } : d))
      );
      setReviewSuccess(t('admin.doctors.documentApproved'));
      setTimeout(() => setReviewSuccess(''), 3000);
    } catch (err) {
      setReviewError(err.message || t('admin.doctors.failedVerify'));
    } finally {
      setActionLoading('');
    }
  };

  const openReject = (doc) => {
    setRejectTarget(doc);
    setRejectReason('');
    setRejectError('');
  };

  const closeReject = () => {
    setRejectTarget(null);
    setRejectReason('');
    setRejectError('');
  };

  const handleRejectDoc = async () => {
    if (!rejectReason.trim()) {
      setRejectError(t('admin.doctors.rejectionReasonRequired'));
      return;
    }
    setRejecting(true);
    setRejectError('');
    try {
      await adminUpdateDocumentStatus(token, rejectTarget.id, 'REJECTED', rejectReason.trim());
      setReviewDocs((prev) =>
        prev.map((d) => (d.id === rejectTarget.id ? { ...d, status: 'REJECTED', rejectionReason: rejectReason.trim() } : d))
      );
      closeReject();
      setReviewSuccess(t('admin.doctors.documentRejected'));
      setTimeout(() => setReviewSuccess(''), 3000);
    } catch (err) {
      setRejectError(err.message || t('admin.doctors.failedReject'));
    } finally {
      setRejecting(false);
    }
  };

  const openVerifyDoctor = (doctor) => {
    setVerifyTarget(doctor);
  };

  const closeVerifyDoctor = () => {
    setVerifyTarget(null);
  };

  const handleVerifyDoctor = async () => {
    if (!verifyTarget) return;
    setVerifying(true);
    try {
      await verifyDoctor(token, verifyTarget.doctorId, 'VERIFIED');
      setDoctorList((prev) => prev.filter((d) => d.doctorId !== verifyTarget.doctorId));
      closeVerifyDoctor();
      closeReview();
    } catch (err) {
      setReviewError(err.message || t('admin.doctors.failedVerify'));
      closeVerifyDoctor();
    } finally {
      setVerifying(false);
    }
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
                <td>{d.hospital?.name || '\u2014'}</td>
                <td><span className="table-mono">{d.phone}</span></td>
                <td>
                  <div className="table-action-group">
                    <button
                      className="primary-btn primary-btn--sm"
                      type="button"
                      onClick={() => openReview(d)}
                    >
                      {t('admin.doctors.reviewDocuments')}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {reviewDoctor && (
        <div className="modal-overlay" onClick={closeReview}>
          <div className="modal-content admin-doc-review-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{t('admin.doctors.reviewDocumentsTitle')}</h2>
              <button className="modal-close" type="button" onClick={closeReview}>\u00D7</button>
            </div>

            <div className="modal-body">
              <div className="admin-doc-review-info">
                <div className="admin-doc-review-row">
                  <span className="admin-doc-review-label">{t('doctor.profile.fullName')}</span>
                  <span className="admin-doc-review-value">{reviewDoctor.fullName}</span>
                </div>
                <div className="admin-doc-review-row">
                  <span className="admin-doc-review-label">{t('doctor.profile.doctorId')}</span>
                  <span className="admin-doc-review-value">{reviewDoctor.doctorId}</span>
                </div>
                <div className="admin-doc-review-row">
                  <span className="admin-doc-review-label">{t('doctor.profile.registrationNumber')}</span>
                  <span className="admin-doc-review-value">{reviewDoctor.medicalRegistrationNumber || '\u2014'}</span>
                </div>
                <div className="admin-doc-review-row">
                  <span className="admin-doc-review-label">{t('doctor.profile.specialization')}</span>
                  <span className="admin-doc-review-value">{reviewDoctor.specialization}</span>
                </div>
                <div className="admin-doc-review-row">
                  <span className="admin-doc-review-label">{t('doctor.profile.verificationStatus')}</span>
                  <span className={`admin-doc-review-status admin-doc-review-status--${(reviewDoctor.verificationStatus || 'PENDING').toLowerCase()}`}>
                    {reviewDoctor.verificationStatus || 'PENDING'}
                  </span>
                </div>
              </div>

              <div className="admin-doc-review-progress">
                <span className="admin-doc-review-progress-text">
                  {t('admin.doctors.verificationProgress', { approved: approvedCount, total: 3 })}
                </span>
                <div className="admin-doc-review-progress-bar">
                  <div
                    className="admin-doc-review-progress-fill"
                    style={{ width: `${(approvedCount / 3) * 100}%` }}
                  />
                </div>
              </div>

              {reviewSuccess && <div className="profile-save-success">{reviewSuccess}</div>}
              {reviewError && <div className="auth-error">{reviewError}</div>}

              {reviewLoading ? (
                <p className="loading-text">{t('common.loading')}</p>
              ) : (
                <div className="admin-doc-review-list">
                  {DOC_TYPES.map(({ key, labelKey }) => {
                    const doc = getDocForType(key);
                    const docStatus = doc?.status || 'NOT_UPLOADED';

                    return (
                      <div key={key} className="admin-doc-review-card">
                        <div className="admin-doc-review-card-header">
                          <span className="admin-doc-review-card-icon">
                            {doc ? getMimeTypeIcon(doc.mimeType) : '\uD83D\uDCC4'}
                          </span>
                          <div className="admin-doc-review-card-text">
                            <span className="admin-doc-review-card-name">{t(labelKey)}</span>
                            {doc ? (
                              <span className="admin-doc-review-card-filename">
                                {doc.originalName} \u00B7 {formatFileSize(doc.fileSize)}
                              </span>
                            ) : (
                              <span className="admin-doc-review-card-filename admin-doc-review-card-filename--missing">
                                {t('doctor.verification.notUploaded')}
                              </span>
                            )}
                            {doc?.reviewedAt && (
                              <span className="admin-doc-review-card-date">
                                {t('admin.doctors.reviewedOn')} {new Date(doc.reviewedAt).toLocaleDateString('en-IN')}
                              </span>
                            )}
                            {doc?.status === 'REJECTED' && doc.rejectionReason && (
                              <span className="admin-doc-review-card-rejection">
                                {t('doctor.verification.rejectionReason')}: {doc.rejectionReason}
                              </span>
                            )}
                          </div>
                          <span className={`admin-doc-review-card-status admin-doc-review-card-status--${docStatus.toLowerCase()}`}>
                            {docStatus === 'NOT_UPLOADED' && t('doctor.verification.notUploaded')}
                            {docStatus === 'PENDING' && t('doctor.verification.pendingReview')}
                            {docStatus === 'APPROVED' && t('doctor.verification.approvedDoc')}
                            {docStatus === 'REJECTED' && t('doctor.verification.rejectedDoc')}
                          </span>
                        </div>

                        <div className="admin-doc-review-card-actions">
                          {doc && (
                            <button
                              className="doc-action-btn doc-view-btn"
                              type="button"
                              title={t('documents.view')}
                              onClick={() => handleView(doc)}
                            >
                              {'\uD83D\uDC41\uFE0F'}
                            </button>
                          )}

                          {doc && docStatus !== 'APPROVED' && (
                            <button
                              className="primary-btn primary-btn--sm"
                              type="button"
                              disabled={actionLoading === doc.id}
                              onClick={() => handleApproveDoc(doc)}
                            >
                              {actionLoading === doc.id ? '...' : t('admin.doctors.approveDocument')}
                            </button>
                          )}

                          {doc && docStatus !== 'APPROVED' && (
                            <button
                              className="consent-btn reject"
                              type="button"
                              disabled={actionLoading === doc.id}
                              onClick={() => openReject(doc)}
                            >
                              {t('admin.doctors.rejectDocument')}
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {allRequiredApproved && reviewDoctor.verificationStatus !== 'VERIFIED' && (
                <div className="admin-doc-review-verify-section">
                  <p className="admin-doc-review-verify-hint">
                    {t('admin.doctors.allDocumentsApproved')}
                  </p>
                  <button
                    className="primary-btn"
                    type="button"
                    disabled={verifying}
                    onClick={() => openVerifyDoctor(reviewDoctor)}
                  >
                    {verifying ? t('common.loading') : t('admin.doctors.verifyDoctor')}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {rejectTarget && (
        <div className="modal-overlay" onClick={() => !rejecting && closeReject()}>
          <div className="modal-content modal-confirm" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{t('admin.doctors.rejectDocumentTitle')}</h2>
              <button className="modal-close" type="button" onClick={() => !rejecting && closeReject()}>×</button>
            </div>
            <div className="modal-body">
              <p className="admin-doc-review-reject-doc-name">
                {rejectTarget.documentType === 'MEDICAL_COUNCIL_REGISTRATION' && t('doctor.verification.medicalCouncil')}
                {rejectTarget.documentType === 'IDENTITY_PROOF' && t('doctor.verification.identityProof')}
                {rejectTarget.documentType === 'QUALIFICATION_CERTIFICATE' && t('doctor.verification.qualifications')}
              </p>
              <div className="form-group">
                <label className="form-label">{t('admin.doctors.rejectionReasonLabel')} *</label>
                <textarea
                  className="form-input"
                  rows={3}
                  value={rejectReason}
                  onChange={(e) => { setRejectReason(e.target.value); setRejectError(''); }}
                  placeholder={t('admin.doctors.rejectionReasonPlaceholder')}
                  disabled={rejecting}
                />
              </div>
              {rejectError && <div className="auth-error">{rejectError}</div>}
            </div>
            <div className="modal-footer">
              <button
                className="primary-btn"
                type="button"
                disabled={rejecting || !rejectReason.trim()}
                style={{ background: '#e74c3c' }}
                onClick={handleRejectDoc}
              >
                {rejecting ? t('common.loading') : t('admin.doctors.rejectDocument')}
              </button>
              <button className="secondary-btn" type="button" onClick={closeReject} disabled={rejecting}>
                {t('documents.cancel')}
              </button>
            </div>
          </div>
        </div>
      )}

      {verifyTarget && (
        <div className="modal-overlay" onClick={() => !verifying && closeVerifyDoctor()}>
          <div className="modal-content modal-confirm" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{t('admin.doctors.verifyDoctorTitle')}</h2>
              <button className="modal-close" type="button" onClick={() => !verifying && closeVerifyDoctor()}>×</button>
            </div>
            <div className="modal-body">
              <p>{t('admin.doctors.verifyDoctorConfirm', { name: verifyTarget.fullName })}</p>
            </div>
            <div className="modal-footer">
              <button className="primary-btn" type="button" disabled={verifying} onClick={handleVerifyDoctor}>
                {verifying ? t('common.loading') : t('admin.doctors.verifyDoctor')}
              </button>
              <button className="secondary-btn" type="button" onClick={closeVerifyDoctor} disabled={verifying}>
                {t('documents.cancel')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default AdminDoctors;
