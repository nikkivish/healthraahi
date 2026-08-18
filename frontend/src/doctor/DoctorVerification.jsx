import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../auth/AuthContext';
import { useLanguage } from '../i18n/LanguageContext';
import {
  getDoctorProfile,
  getDoctorVerificationDocuments,
  uploadDoctorVerificationDocument,
  replaceDoctorVerificationDocument,
  deleteDoctorVerificationDocument,
  downloadDoctorVerificationDocumentFile,
} from '../api';

const DOC_TYPES = [
  { key: 'MEDICAL_COUNCIL_REGISTRATION', labelKey: 'doctor.verification.medicalCouncil' },
  { key: 'IDENTITY_PROOF', labelKey: 'doctor.verification.identityProof' },
  { key: 'QUALIFICATION_CERTIFICATE', labelKey: 'doctor.verification.qualifications' },
];

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const ALLOWED_TYPES = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
const ALLOWED_EXTENSIONS = '.pdf,.jpg,.jpeg,.png';

function formatFileSize(bytes) {
  if (bytes < 1024) return bytes + ' B';
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
  return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
}

function getMimeTypeIcon(mimeType) {
  if (mimeType === 'application/pdf') return '📄';
  if (mimeType?.startsWith('image/')) return '🖼️';
  return '📎';
}

function DoctorVerification() {
  const { token } = useAuth();
  const { t } = useLanguage();

  const [profile, setProfile] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const [showUpload, setShowUpload] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [uploadTargetType, setUploadTargetType] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [dragOver, setDragOver] = useState(false);

  const [replaceTarget, setReplaceTarget] = useState(null);
  const [replacing, setReplacing] = useState(false);
  const [replaceFile, setReplaceFile] = useState(null);
  const [replaceError, setReplaceError] = useState('');

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const fetchData = useCallback(() => {
    setLoading(true);
    setError('');
    Promise.all([
      getDoctorProfile(token).catch(() => null),
      getDoctorVerificationDocuments(token).catch(() => null),
    ])
      .then(([profileRes, docsRes]) => {
        if (profileRes) setProfile(profileRes.data.profile);
        if (docsRes) setDocuments(docsRes.data.documents || []);
      })
      .catch((err) => setError(err.message || 'Failed to load verification data'))
      .finally(() => setLoading(false));
  }, [token]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const getDocForType = (docType) => {
    return documents.find((d) => d.documentType === docType) || null;
  };

  const openUpload = (docType) => {
    setUploadTargetType(docType);
    setSelectedFile(null);
    setUploadError('');
    setDragOver(false);
    setShowUpload(true);
  };

  const closeUpload = () => {
    setShowUpload(false);
    setUploadTargetType('');
    setSelectedFile(null);
    setUploadError('');
    setDragOver(false);
  };

  const handleFileSelect = (e, setter, errorSetter) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!ALLOWED_TYPES.includes(file.type)) {
      errorSetter(t('documents.unsupportedFileType'));
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      errorSetter(t('documents.fileTooLarge'));
      return;
    }
    setter(file);
    errorSetter('');
  };

  const handleDrop = (e, setter, errorSetter) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (!file) return;
    if (!ALLOWED_TYPES.includes(file.type)) {
      errorSetter(t('documents.unsupportedFileType'));
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      errorSetter(t('documents.fileTooLarge'));
      return;
    }
    setter(file);
    errorSetter('');
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      setUploadError(t('documents.selectFile'));
      return;
    }
    setUploading(true);
    setUploadError('');
    try {
      await uploadDoctorVerificationDocument(token, selectedFile, uploadTargetType);
      closeUpload();
      fetchData();
      setSuccessMsg(t('doctor.verification.uploadSuccess'));
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err) {
      setUploadError(err.message || t('documents.uploadFailed'));
    } finally {
      setUploading(false);
    }
  };

  const openReplace = (doc) => {
    setReplaceTarget(doc);
    setReplaceFile(null);
    setReplaceError('');
  };

  const closeReplace = () => {
    setReplaceTarget(null);
    setReplaceFile(null);
    setReplaceError('');
  };

  const handleReplace = async () => {
    if (!replaceFile) {
      setReplaceError(t('documents.selectFile'));
      return;
    }
    setReplacing(true);
    setReplaceError('');
    try {
      await replaceDoctorVerificationDocument(token, replaceTarget.id, replaceFile);
      closeReplace();
      fetchData();
      setSuccessMsg(t('doctor.verification.replaceSuccess'));
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err) {
      setReplaceError(err.message || t('documents.uploadFailed'));
    } finally {
      setReplacing(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteDoctorVerificationDocument(token, deleteTarget.id);
      setDeleteTarget(null);
      fetchData();
      setSuccessMsg(t('doctor.verification.deleteSuccess'));
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err) {
      setDeleteTarget(null);
      alert(err.message || t('documents.deleteFailed'));
    } finally {
      setDeleting(false);
    }
  };

  const handleView = async (doc) => {
    try {
      const res = await downloadDoctorVerificationDocumentFile(token, doc.id);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch {
      alert(t('documents.viewFailed'));
    }
  };

  if (loading) {
    return (
      <div className="verification-page">
        <div className="page-header">
          <h1>{t('doctor.verification.title')}</h1>
        </div>
        <div className="auth-card" style={{ textAlign: 'center', padding: '40px' }}>
          <p>{t('common.loadingVerification')}</p>
        </div>
      </div>
    );
  }

  if (error && !profile) {
    return (
      <div className="verification-page">
        <div className="page-header">
          <h1>{t('doctor.verification.title')}</h1>
        </div>
        <div className="auth-error">{error}</div>
      </div>
    );
  }

  const status = profile?.verificationStatus || 'PENDING';
  const isVerified = status === 'VERIFIED';
  const isRejected = status === 'REJECTED';

  return (
    <div className="verification-page">
      <div className="page-header">
        <h1>{t('doctor.verification.title')}</h1>
      </div>

      {successMsg && <div className="profile-save-success">{successMsg}</div>}

      <div className="verification-card">
        <span className={`verification-status-badge ${isVerified ? 'verified' : isRejected ? 'rejected' : 'pending'}`}>
          {isVerified ? '✓' : isRejected ? '✗' : '⏳'} {status}
        </span>

        {isRejected && profile?.verificationReason && (
          <div className="verification-rejection-reason">
            <strong>{t('doctor.verification.rejectionReason')}:</strong> {profile.verificationReason}
          </div>
        )}

        <div className="verification-details">
          <div className="verification-detail">
            <span className="verification-detail-label">{t('doctor.verification.registrationNumber')}</span>
            <span className="verification-detail-value">{profile?.medicalRegistrationNumber || '—'}</span>
          </div>
          <div className="verification-detail">
            <span className="verification-detail-label">{t('doctor.verification.doctorId')}</span>
            <span className="verification-detail-value">{profile?.doctorId || '—'}</span>
          </div>
          <div className="verification-detail">
            <span className="verification-detail-label">{t('doctor.verification.specialization')}</span>
            <span className="verification-detail-value">{profile?.specialization || '—'}</span>
          </div>
          <div className="verification-detail">
            <span className="verification-detail-label">{t('doctor.verification.profileCreated')}</span>
            <span className="verification-detail-value">
              {profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString('en-IN') : '—'}
            </span>
          </div>
        </div>

        <div className="documents-section">
          <h3>{t('doctor.verification.documentsTitle')}</h3>
          <p className="documents-section-hint">{t('doctor.verification.documentsHint')}</p>

          {DOC_TYPES.map(({ key, labelKey }) => {
            const doc = getDocForType(key);
            const docStatus = doc?.status || 'NOT_UPLOADED';

            return (
              <div key={key} className="verification-doc-row">
                <div className="verification-doc-info">
                  <span className="verification-doc-icon">{doc ? getMimeTypeIcon(doc.mimeType) : '📄'}</span>
                  <div className="verification-doc-text">
                    <span className="verification-doc-name">{t(labelKey)}</span>
                    {doc ? (
                      <span className="verification-doc-filename">{doc.originalName} · {formatFileSize(doc.fileSize)}</span>
                    ) : (
                      <span className="verification-doc-filename">{t('doctor.verification.notUploaded')}</span>
                    )}
                    {doc?.status === 'REJECTED' && doc.rejectionReason && (
                      <span className="verification-doc-rejection">{t('doctor.verification.rejectionReason')}: {doc.rejectionReason}</span>
                    )}
                  </div>
                </div>

                <div className="verification-doc-actions">
                  <span className={`verification-doc-status verification-doc-status--${docStatus.toLowerCase()}`}>
                    {docStatus === 'NOT_UPLOADED' && t('doctor.verification.notUploaded')}
                    {docStatus === 'PENDING' && t('doctor.verification.pendingReview')}
                    {docStatus === 'APPROVED' && t('doctor.verification.approvedDoc')}
                    {docStatus === 'REJECTED' && t('doctor.verification.rejectedDoc')}
                  </span>

                  {!doc && (
                    <button className="primary-btn primary-btn--sm" type="button" onClick={() => openUpload(key)}>
                      {t('doctor.verification.upload')}
                    </button>
                  )}

                  {doc && (
                    <button className="doc-action-btn doc-view-btn" type="button" title={t('documents.view')} onClick={() => handleView(doc)}>
                      👁️
                    </button>
                  )}

                  {doc && (docStatus === 'PENDING' || docStatus === 'REJECTED') && (
                    <button className="doc-action-btn doc-replace-btn" type="button" title={t('doctor.verification.replace')} onClick={() => openReplace(doc)}>
                      🔄
                    </button>
                  )}

                  {doc && (docStatus === 'PENDING' || docStatus === 'REJECTED') && (
                    <button className="doc-action-btn doc-delete-btn" type="button" title={t('documents.delete')} onClick={() => setDeleteTarget(doc)}>
                      🗑️
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {showUpload && (
        <div className="modal-overlay" onClick={closeUpload}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{t('doctor.verification.uploadDocument')}</h2>
              <button className="modal-close" type="button" onClick={closeUpload}>×</button>
            </div>

            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">{t('doctor.verification.documentType')}</label>
                <input className="form-input" type="text" value={t(DOC_TYPES.find((d) => d.key === uploadTargetType)?.labelKey || '')} disabled />
              </div>

              <div className="form-group">
                <label className="form-label">{t('documents.selectFile')} *</label>
                <div
                  className={`documents-dropzone ${dragOver ? 'drag-over' : ''} ${selectedFile ? 'has-file' : ''}`}
                  onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={(e) => handleDrop(e, setSelectedFile, setUploadError)}
                  onClick={() => document.getElementById('doc-upload-input')?.click()}
                >
                  {selectedFile ? (
                    <div className="documents-dropfile-info">
                      <span>{getMimeTypeIcon(selectedFile.type)}</span>
                      <span>{selectedFile.name}</span>
                      <span>{formatFileSize(selectedFile.size)}</span>
                    </div>
                  ) : (
                    <div className="documents-dropfile-placeholder">
                      <span>📎</span>
                      <span>{t('documents.dropOrClick')}</span>
                    </div>
                  )}
                </div>
                <input
                  id="doc-upload-input"
                  type="file"
                  accept={ALLOWED_EXTENSIONS}
                  onChange={(e) => handleFileSelect(e, setSelectedFile, setUploadError)}
                  style={{ display: 'none' }}
                  disabled={uploading}
                />
                <span className="profile-field-hint">{t('documents.fileHint')}</span>
              </div>

              {uploadError && <div className="auth-error">{uploadError}</div>}
            </div>

            <div className="modal-footer">
              <button className="primary-btn" type="button" onClick={handleUpload} disabled={uploading || !selectedFile}>
                {uploading ? t('documents.uploading') : t('documents.upload')}
              </button>
              <button className="secondary-btn" type="button" onClick={closeUpload} disabled={uploading}>
                {t('documents.cancel')}
              </button>
            </div>
          </div>
        </div>
      )}

      {replaceTarget && (
        <div className="modal-overlay" onClick={closeReplace}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{t('doctor.verification.replaceDocument')}</h2>
              <button className="modal-close" type="button" onClick={closeReplace}>×</button>
            </div>

            <div className="modal-body">
              <p className="verification-replace-info">{t('doctor.verification.replacing')} <strong>{replaceTarget.originalName}</strong></p>

              <div className="form-group">
                <label className="form-label">{t('documents.selectFile')} *</label>
                <div
                  className={`documents-dropzone ${replaceFile ? 'has-file' : ''}`}
                  onClick={() => document.getElementById('doc-replace-input')?.click()}
                >
                  {replaceFile ? (
                    <div className="documents-dropfile-info">
                      <span>{getMimeTypeIcon(replaceFile.type)}</span>
                      <span>{replaceFile.name}</span>
                      <span>{formatFileSize(replaceFile.size)}</span>
                    </div>
                  ) : (
                    <div className="documents-dropfile-placeholder">
                      <span>📎</span>
                      <span>{t('documents.dropOrClick')}</span>
                    </div>
                  )}
                </div>
                <input
                  id="doc-replace-input"
                  type="file"
                  accept={ALLOWED_EXTENSIONS}
                  onChange={(e) => handleFileSelect(e, setReplaceFile, setReplaceError)}
                  style={{ display: 'none' }}
                  disabled={replacing}
                />
                <span className="profile-field-hint">{t('documents.fileHint')}</span>
              </div>

              {replaceError && <div className="auth-error">{replaceError}</div>}
            </div>

            <div className="modal-footer">
              <button className="primary-btn" type="button" onClick={handleReplace} disabled={replacing || !replaceFile}>
                {replacing ? t('documents.uploading') : t('doctor.verification.replace')}
              </button>
              <button className="secondary-btn" type="button" onClick={closeReplace} disabled={replacing}>
                {t('documents.cancel')}
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div className="modal-overlay" onClick={() => !deleting && setDeleteTarget(null)}>
          <div className="modal-content modal-confirm" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{t('documents.confirmDelete')}</h2>
              <button className="modal-close" type="button" onClick={() => !deleting && setDeleteTarget(null)}>×</button>
            </div>
            <div className="modal-body">
              <p>{t('documents.confirmDeleteMessage')}</p>
              <p className="document-card-name" style={{ marginTop: '8px' }}>{deleteTarget.originalName}</p>
            </div>
            <div className="modal-footer">
              <button className="primary-btn" type="button" onClick={confirmDelete} disabled={deleting} style={{ background: '#e74c3c' }}>
                {deleting ? t('documents.deleting') : t('documents.delete')}
              </button>
              <button className="secondary-btn" type="button" onClick={() => setDeleteTarget(null)} disabled={deleting}>
                {t('documents.cancel')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default DoctorVerification;
