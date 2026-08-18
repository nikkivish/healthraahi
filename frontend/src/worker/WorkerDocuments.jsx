import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../auth/AuthContext';
import { useLanguage } from '../i18n/LanguageContext';
import {
  getWorkerDocuments,
  uploadWorkerDocument,
  deleteWorkerDocument,
  downloadWorkerDocumentFile,
} from '../api';

const DOCUMENT_TYPES = [
  'BLOOD_TEST_REPORT',
  'PRESCRIPTION',
  'XRAY_REPORT',
  'VACCINATION_CERTIFICATE',
  'MEDICAL_CERTIFICATE',
  'DISCHARGE_SUMMARY',
  'LAB_REPORT',
  'IMAGING_REPORT',
  'INSURANCE_DOCUMENT',
  'OTHER',
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

function WorkerDocuments() {
  const { token } = useAuth();
  const { t } = useLanguage();
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const [showUpload, setShowUpload] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const [uploadForm, setUploadForm] = useState({
    documentType: '',
    file: null,
    description: '',
  });
  const [dragOver, setDragOver] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const fetchDocuments = useCallback(() => {
    setLoading(true);
    setError('');
    getWorkerDocuments(token)
      .then((res) => setDocuments(res.data.documents))
      .catch((err) => setError(err.message || 'Failed to load documents'))
      .finally(() => setLoading(false));
  }, [token]);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  const resetUpload = () => {
    setUploadForm({ documentType: '', file: null, description: '' });
    setUploadError('');
  };

  const openUpload = () => {
    resetUpload();
    setShowUpload(true);
  };

  const closeUpload = () => {
    setShowUpload(false);
    resetUpload();
  };

  const handleFileSelect = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!ALLOWED_TYPES.includes(file.type)) {
      setUploadError(t('documents.unsupportedFileType'));
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      setUploadError(t('documents.fileTooLarge'));
      return;
    }

    setUploadForm((prev) => ({ ...prev, file }));
    setUploadError('');
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (!file) return;

    if (!ALLOWED_TYPES.includes(file.type)) {
      setUploadError(t('documents.unsupportedFileType'));
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      setUploadError(t('documents.fileTooLarge'));
      return;
    }

    setUploadForm((prev) => ({ ...prev, file }));
    setUploadError('');
  };

  const handleUpload = async () => {
    if (!uploadForm.file) {
      setUploadError(t('documents.selectFile'));
      return;
    }
    if (!uploadForm.documentType) {
      setUploadError(t('documents.documentTypeRequired'));
      return;
    }

    setUploading(true);
    setUploadError('');

    try {
      await uploadWorkerDocument(token, uploadForm.file, uploadForm.documentType, uploadForm.description);
      closeUpload();
      fetchDocuments();
      setSuccessMsg(t('documents.uploadSuccess'));
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err) {
      setUploadError(err.message || t('documents.uploadFailed'));
    } finally {
      setUploading(false);
    }
  };

  const handleView = async (doc) => {
    try {
      const res = await downloadWorkerDocumentFile(token, doc.id);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      window.open(url, '_blank');
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch {
      alert(t('documents.viewFailed'));
    }
  };

  const handleDownload = async (doc) => {
    try {
      const res = await downloadWorkerDocumentFile(token, doc.id);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = doc.originalFileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      alert(t('documents.downloadFailed'));
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await deleteWorkerDocument(token, deleteTarget.id);
      setDeleteTarget(null);
      fetchDocuments();
      setSuccessMsg(t('documents.deleteSuccess'));
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err) {
      setDeleteTarget(null);
      alert(err.message || t('documents.deleteFailed'));
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="documents-page">
        <div className="auth-card" style={{ textAlign: 'center', padding: '40px' }}>
          <p>{t('common.loading')}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="documents-page">
      <div className="page-header">
        <h1>{t('documents.title')}</h1>
        <button className="primary-btn" type="button" onClick={openUpload}>
          {t('documents.uploadDocument')}
        </button>
      </div>

      {error && <div className="auth-error">{error}</div>}
      {successMsg && <div className="profile-save-success">{successMsg}</div>}

      {documents.length === 0 ? (
        <div className="documents-empty">
          <div className="documents-empty-icon">📁</div>
          <p>{t('documents.noDocuments')}</p>
          <button className="primary-btn" type="button" onClick={openUpload}>
            {t('documents.uploadDocument')}
          </button>
        </div>
      ) : (
        <div className="documents-list">
          {documents.map((doc) => (
            <div key={doc.id} className="document-card">
              <div className="document-card-icon">{getMimeTypeIcon(doc.mimeType)}</div>
              <div className="document-card-info">
                <div className="document-card-name">{doc.originalFileName}</div>
                <div className="document-card-meta">
                  <span className="document-card-type">{t(`documents.types.${doc.documentType}`)}</span>
                  <span className="document-card-dot">·</span>
                  <span>{formatFileSize(doc.fileSize)}</span>
                  <span className="document-card-dot">·</span>
                  <span>{new Date(doc.uploadedAt).toLocaleDateString('en-IN')}</span>
                </div>
                {doc.description && (
                  <div className="document-card-desc">{doc.description}</div>
                )}
              </div>
              <div className="document-card-actions">
                <button
                  className="doc-action-btn doc-view-btn"
                  type="button"
                  title={t('documents.view')}
                  onClick={() => handleView(doc)}
                >
                  👁️
                </button>
                <button
                  className="doc-action-btn doc-download-btn"
                  type="button"
                  title={t('documents.download')}
                  onClick={() => handleDownload(doc)}
                >
                  ⬇️
                </button>
                <button
                  className="doc-action-btn doc-delete-btn"
                  type="button"
                  title={t('documents.delete')}
                  onClick={() => setDeleteTarget(doc)}
                >
                  🗑️
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {showUpload && (
        <div className="modal-overlay" onClick={closeUpload}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>{t('documents.uploadDocument')}</h2>
              <button className="modal-close" type="button" onClick={closeUpload}>×</button>
            </div>

            <div className="modal-body">
              <div className="form-group">
                <label className="form-label">{t('documents.documentType')} *</label>
                <select
                  className="form-input"
                  value={uploadForm.documentType}
                  onChange={(e) => setUploadForm((prev) => ({ ...prev, documentType: e.target.value }))}
                  disabled={uploading}
                >
                  <option value="">{t('documents.selectType')}</option>
                  {DOCUMENT_TYPES.map((dt) => (
                    <option key={dt} value={dt}>{t(`documents.types.${dt}`)}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">{t('documents.selectFile')} *</label>
                <div
                  className={`documents-dropzone ${dragOver ? 'drag-over' : ''} ${uploadForm.file ? 'has-file' : ''}`}
                  onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
                  onDragLeave={() => setDragOver(false)}
                  onDrop={handleDrop}
                  onClick={() => document.getElementById('doc-file-input')?.click()}
                >
                  {uploadForm.file ? (
                    <div className="documents-dropfile-info">
                      <span>{getMimeTypeIcon(uploadForm.file.type)}</span>
                      <span>{uploadForm.file.name}</span>
                      <span>{formatFileSize(uploadForm.file.size)}</span>
                    </div>
                  ) : (
                    <div className="documents-dropfile-placeholder">
                      <span>📎</span>
                      <span>{t('documents.dropOrClick')}</span>
                    </div>
                  )}
                </div>
                <input
                  id="doc-file-input"
                  type="file"
                  accept={ALLOWED_EXTENSIONS}
                  onChange={handleFileSelect}
                  style={{ display: 'none' }}
                  disabled={uploading}
                />
                <span className="profile-field-hint">
                  {t('documents.fileHint')}
                </span>
              </div>

              <div className="form-group">
                <label className="form-label">{t('documents.description')}</label>
                <textarea
                  className="form-input"
                  rows={2}
                  value={uploadForm.description}
                  onChange={(e) => setUploadForm((prev) => ({ ...prev, description: e.target.value }))}
                  placeholder={t('documents.descriptionPlaceholder')}
                  disabled={uploading}
                  maxLength={500}
                />
              </div>

              {uploadError && <div className="auth-error">{uploadError}</div>}
            </div>

            <div className="modal-footer">
              <button
                className="primary-btn"
                type="button"
                onClick={handleUpload}
                disabled={uploading || !uploadForm.file || !uploadForm.documentType}
              >
                {uploading ? t('documents.uploading') : t('documents.upload')}
              </button>
              <button
                className="secondary-btn"
                type="button"
                onClick={closeUpload}
                disabled={uploading}
              >
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
              <p className="document-card-name" style={{ marginTop: '8px' }}>{deleteTarget.originalFileName}</p>
            </div>
            <div className="modal-footer">
              <button
                className="primary-btn"
                type="button"
                onClick={confirmDelete}
                disabled={deleting}
                style={{ background: '#e74c3c' }}
              >
                {deleting ? t('documents.deleting') : t('documents.delete')}
              </button>
              <button
                className="secondary-btn"
                type="button"
                onClick={() => setDeleteTarget(null)}
                disabled={deleting}
              >
                {t('documents.cancel')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default WorkerDocuments;
