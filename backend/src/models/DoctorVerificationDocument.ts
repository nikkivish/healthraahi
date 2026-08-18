import mongoose, { Document, Schema, Types } from "mongoose";

export type DoctorVerificationDocumentType =
  | "MEDICAL_COUNCIL_REGISTRATION"
  | "IDENTITY_PROOF"
  | "QUALIFICATION_CERTIFICATE";

export const VALID_DOCTOR_DOC_TYPES: DoctorVerificationDocumentType[] = [
  "MEDICAL_COUNCIL_REGISTRATION",
  "IDENTITY_PROOF",
  "QUALIFICATION_CERTIFICATE",
];

export const DOCTOR_DOC_TYPE_LABELS: Record<DoctorVerificationDocumentType, string> = {
  MEDICAL_COUNCIL_REGISTRATION: "Medical Council Registration",
  IDENTITY_PROOF: "Identity Proof",
  QUALIFICATION_CERTIFICATE: "Qualification Certificate",
};

export type DoctorVerificationDocStatus = "PENDING" | "APPROVED" | "REJECTED";

export interface IDoctorVerificationDocument extends Document {
  doctorUserId: Types.ObjectId;
  documentType: DoctorVerificationDocumentType;
  fileName: string;
  originalName: string;
  mimeType: string;
  fileSize: number;
  gridfsFileId: Types.ObjectId;
  status: DoctorVerificationDocStatus;
  rejectionReason: string | null;
  uploadedAt: Date;
  reviewedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

const doctorVerificationDocumentSchema = new Schema<IDoctorVerificationDocument>(
  {
    doctorUserId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    documentType: {
      type: String,
      enum: {
        values: VALID_DOCTOR_DOC_TYPES,
        message: "Invalid document type: {VALUE}",
      },
      required: true,
    },

    fileName: {
      type: String,
      required: true,
      trim: true,
    },

    originalName: {
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

    status: {
      type: String,
      enum: {
        values: ["PENDING", "APPROVED", "REJECTED"],
        message: "Invalid status: {VALUE}",
      },
      default: "PENDING",
    },

    rejectionReason: {
      type: String,
      trim: true,
      default: null,
    },

    uploadedAt: {
      type: Date,
      default: Date.now,
    },

    reviewedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

doctorVerificationDocumentSchema.index({ doctorUserId: 1, documentType: 1 });
doctorVerificationDocumentSchema.index({ doctorUserId: 1, createdAt: -1 });

export const DoctorVerificationDocument = mongoose.model<IDoctorVerificationDocument>(
  "DoctorVerificationDocument",
  doctorVerificationDocumentSchema
);
