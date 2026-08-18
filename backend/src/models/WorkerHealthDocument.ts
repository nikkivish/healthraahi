import mongoose, { Document, Schema, Types } from "mongoose";

export type DocumentType =
  | "BLOOD_TEST_REPORT"
  | "PRESCRIPTION"
  | "XRAY_REPORT"
  | "VACCINATION_CERTIFICATE"
  | "MEDICAL_CERTIFICATE"
  | "DISCHARGE_SUMMARY"
  | "LAB_REPORT"
  | "IMAGING_REPORT"
  | "INSURANCE_DOCUMENT"
  | "OTHER";

export const DOCUMENT_TYPE_LABELS: Record<DocumentType, string> = {
  BLOOD_TEST_REPORT: "Blood Test Report",
  PRESCRIPTION: "Prescription",
  XRAY_REPORT: "X-Ray Report",
  VACCINATION_CERTIFICATE: "Vaccination Certificate",
  MEDICAL_CERTIFICATE: "Medical Certificate",
  DISCHARGE_SUMMARY: "Discharge Summary",
  LAB_REPORT: "Lab Report",
  IMAGING_REPORT: "Imaging Report",
  INSURANCE_DOCUMENT: "Insurance Document",
  OTHER: "Other",
};

export const VALID_DOCUMENT_TYPES: DocumentType[] = [
  "BLOOD_TEST_REPORT",
  "PRESCRIPTION",
  "XRAY_REPORT",
  "VACCINATION_CERTIFICATE",
  "MEDICAL_CERTIFICATE",
  "DISCHARGE_SUMMARY",
  "LAB_REPORT",
  "IMAGING_REPORT",
  "INSURANCE_DOCUMENT",
  "OTHER",
];

export interface IWorkerHealthDocument extends Document {
  workerId: Types.ObjectId;
  documentType: DocumentType;
  fileName: string;
  originalFileName: string;
  mimeType: string;
  fileSize: number;
  gridfsFileId: Types.ObjectId;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
}

const workerHealthDocumentSchema = new Schema<IWorkerHealthDocument>(
  {
    workerId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    documentType: {
      type: String,
      enum: VALID_DOCUMENT_TYPES,
      required: true,
    },
    fileName: {
      type: String,
      required: true,
      trim: true,
    },
    originalFileName: {
      type: String,
      required: true,
      trim: true,
    },
    mimeType: {
      type: String,
      required: true,
      trim: true,
    },
    fileSize: {
      type: Number,
      required: true,
      min: 1,
    },
    gridfsFileId: {
      type: Schema.Types.ObjectId,
      required: true,
    },
    description: {
      type: String,
      trim: true,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

workerHealthDocumentSchema.index({ workerId: 1, createdAt: -1 });

export const WorkerHealthDocument = mongoose.model<IWorkerHealthDocument>(
  "WorkerHealthDocument",
  workerHealthDocumentSchema
);
