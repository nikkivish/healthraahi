import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import {
  getClinicalRecord,
  getClinicalRecordDocuments,
  downloadClinicalRecordDocument,
} from "../api";
import { useLanguage } from "../i18n/LanguageContext";

function formatDate(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function formatDateTime(iso) {
  if (!iso) return "—";
  return new Date(iso).toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatFileSize(bytes) {
  if (!bytes && bytes !== 0) return "—";
  if (bytes < 1024) return bytes + " B";
  if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}

function getMimeTypeIcon(mimeType) {
  if (mimeType === "application/pdf") return "📄";
  if (mimeType?.startsWith("image/")) return "🖼️";
  return "📎";
}

function DoctorRecordDetail() {
  const { recordId } = useParams();
  const { token } = useAuth();
  const { t } = useLanguage();
  const [record, setRecord] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [documents, setDocuments] = useState([]);
  const [documentsLoading, setDocumentsLoading] = useState(false);
  const [documentsError, setDocumentsError] = useState("");

  useEffect(() => {
    if (!token || !recordId) return;

    setLoading(true);
    setError("");

    getClinicalRecord(token, recordId)
      .then((res) => {
        setRecord(res.data.record);
      })
      .catch((err) => {
        setError(err.message || t("doctor.recordDetail.notFound"));
      })
      .finally(() => {
        setLoading(false);
      });
  }, [token, recordId, t]);

  useEffect(() => {
    if (!token || !recordId) return;

    setDocumentsLoading(true);
    setDocumentsError("");

    getClinicalRecordDocuments(token, recordId)
      .then((res) => {
        setDocuments(res.data.documents || []);
      })
      .catch((err) => {
        setDocumentsError(err.message || "Failed to load documents");
      })
      .finally(() => {
        setDocumentsLoading(false);
      });
  }, [token, recordId]);

  const handleView = async (doc) => {
    try {
      const res = await downloadClinicalRecordDocument(token, doc.id);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      window.open(url, "_blank");
      setTimeout(() => URL.revokeObjectURL(url), 60000);
    } catch {
      alert(t("documents.viewFailed"));
    }
  };

  const handleDownload = async (doc) => {
    try {
      const res = await downloadClinicalRecordDocument(token, doc.id);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = doc.originalFileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch {
      alert(t("documents.downloadFailed"));
    }
  };

  if (loading) {
    return (
      <div className="record-detail-page">
        <div className="page-header">
          <h1>{t("doctor.recordDetail.title")}</h1>
        </div>
        <div
          className="auth-card"
          style={{ textAlign: "center", padding: "40px" }}
        >
          <p>{t("common.loadingRecords")}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="record-detail-page">
        <div className="page-header">
          <h1>{t("doctor.recordDetail.title")}</h1>
        </div>
        <div className="auth-error">{error}</div>
        <div style={{ marginTop: 16 }}>
          <Link
            to="/doctor/records"
            className="secondary-btn"
            style={{ textDecoration: "none" }}
          >
            {t("doctor.recordDetail.backToRecords")}
          </Link>
        </div>
      </div>
    );
  }

  if (!record) return null;

  return (
    <div className="record-detail-page">
      <div className="page-header">
        <h1>{t("doctor.recordDetail.title")}</h1>
      </div>

      <div className="record-detail-card">
        <div className="record-detail-header">
          <span className="record-type-badge">{record.recordType}</span>
          <span className="record-detail-date">
            {formatDate(record.createdAt)}
          </span>
        </div>

        <div className="record-detail-section">
          <h3>{t("doctor.recordDetail.workerInformation")}</h3>
          <div className="worker-profile-fields">
            <div className="worker-profile-field">
              <span className="worker-profile-label">
                {t("doctor.recordDetail.workerName")}
              </span>
              <span className="worker-profile-value">
                {record.workerName || "—"}
              </span>
            </div>
            <div className="worker-profile-field">
              <span className="worker-profile-label">
                {t("doctor.workerProfile.healthId")}
              </span>
              <span className="worker-profile-value">
                {record.workerHealthId || "—"}
              </span>
            </div>
          </div>
        </div>

        <div className="record-detail-section">
          <h3>{t("doctor.recordDetail.recordInformation")}</h3>
          <div className="worker-profile-fields">
            <div className="worker-profile-field">
              <span className="worker-profile-label">
                {t("doctor.recordDetail.category")}
              </span>
              <span className="worker-profile-value">
                {record.category || "—"}
              </span>
            </div>
            <div className="worker-profile-field">
              <span className="worker-profile-label">
                {t("doctor.recordDetail.title")}
              </span>
              <span className="worker-profile-value">
                {record.title || "—"}
              </span>
            </div>
            <div className="worker-profile-field">
              <span className="worker-profile-label">
                {t("doctor.recordDetail.summary")}
              </span>
              <span className="worker-profile-value">
                {record.summary || "—"}
              </span>
            </div>
            {record.hospitalName && (
              <div className="worker-profile-field">
                <span className="worker-profile-label">
                  {t("doctor.recordDetail.hospital")}
                </span>
                <span className="worker-profile-value">
                  {record.hospitalName}
                </span>
              </div>
            )}
          </div>
        </div>

        {(record.diagnosis?.length > 0 ||
          record.prescriptions?.length > 0 ||
          record.followUpPlan) && (
          <div className="record-detail-section">
            <h3>{t("doctor.recordDetail.clinicalDetails")}</h3>
            <div className="worker-profile-fields">
              {record.diagnosis?.length > 0 && (
                <div className="worker-profile-field">
                  <span className="worker-profile-label">
                    {t("doctor.recordDetail.diagnosis")}
                  </span>
                  <span className="worker-profile-value">
                    {record.diagnosis.join(", ")}
                  </span>
                </div>
              )}
              {record.prescriptions?.length > 0 && (
                <div className="worker-profile-field">
                  <span className="worker-profile-label">
                    {t("doctor.recordDetail.prescriptions")}
                  </span>
                  <span className="worker-profile-value">
                    {record.prescriptions.join(", ")}
                  </span>
                </div>
              )}
              {record.followUpPlan && (
                <div className="worker-profile-field">
                  <span className="worker-profile-label">
                    {t("doctor.recordDetail.followUpPlan")}
                  </span>
                  <span className="worker-profile-value">
                    {record.followUpPlan}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        <div className="record-detail-section">
          <h3>{t("doctor.recordDetail.metadata")}</h3>
          <div className="worker-profile-fields">
            <div className="worker-profile-field">
              <span className="worker-profile-label">
                {t("doctor.recordDetail.createdBy")}
              </span>
              <span className="worker-profile-value">
                {record.doctorName || "—"}
              </span>
            </div>
            <div className="worker-profile-field">
              <span className="worker-profile-label">
                {t("doctor.recordDetail.createdAt")}
              </span>
              <span className="worker-profile-value">
                {formatDateTime(record.createdAt)}
              </span>
            </div>
            <div className="worker-profile-field">
              <span className="worker-profile-label">
                {t("doctor.recordDetail.updatedAt")}
              </span>
              <span className="worker-profile-value">
                {formatDateTime(record.updatedAt)}
              </span>
            </div>
          </div>
        </div>

        <div className="record-detail-section">
          <h3>{t("doctor.createRecord.attachDocumentsLabel")}</h3>
          {documentsLoading ? (
            <p style={{ color: "var(--muted)", fontSize: "0.9rem" }}>
              {t("common.loadingRecords")}
            </p>
          ) : documentsError ? (
            <div className="auth-error" style={{ marginBottom: 8 }}>
              {documentsError}
            </div>
          ) : documents.length === 0 ? (
            <div className="consent-empty">{t("documents.noDocuments")}</div>
          ) : (
            <div className="documents-list">
              {documents.map((doc) => (
                <div key={doc.id} className="document-card">
                  <div className="document-card-icon">
                    {getMimeTypeIcon(doc.mimeType)}
                  </div>
                  <div className="document-card-info">
                    <div className="document-card-name">
                      {doc.originalFileName}
                    </div>
                    <div className="document-card-meta">
                      <span className="document-card-type">{doc.mimeType}</span>
                      <span className="document-card-dot">·</span>
                      <span>{formatFileSize(doc.fileSize)}</span>
                      <span className="document-card-dot">·</span>
                      <span>
                        {new Date(doc.uploadedAt).toLocaleDateString("en-IN")}
                      </span>
                    </div>
                  </div>
                  <div className="document-card-actions">
                    <button
                      className="doc-action-btn doc-view-btn"
                      type="button"
                      title={t("documents.view")}
                      onClick={() => handleView(doc)}
                    >
                      👁️
                    </button>
                    <button
                      className="doc-action-btn doc-download-btn"
                      type="button"
                      title={t("documents.download")}
                      onClick={() => handleDownload(doc)}
                    >
                      ⬇️
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="worker-profile-actions">
          <Link
            to="/doctor/records"
            className="secondary-btn"
            style={{ textDecoration: "none" }}
          >
            {t("doctor.recordDetail.backToRecords")}
          </Link>
        </div>
      </div>
    </div>
  );
}

export default DoctorRecordDetail;
