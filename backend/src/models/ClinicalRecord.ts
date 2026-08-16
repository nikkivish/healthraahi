import mongoose, { Document, Schema, Types } from "mongoose";

export type ClinicalRecordType =
  | "CONSULTATION"
  | "DIAGNOSIS"
  | "PRESCRIPTION"
  | "LAB"
  | "TREATMENT"
  | "FOLLOW_UP";

export interface IClinicalRecord extends Document {
  workerId: Types.ObjectId;
  doctorId: Types.ObjectId;
  hospitalId?: Types.ObjectId;
  consentId: Types.ObjectId;
  recordType: ClinicalRecordType;
  category: string;
  title: string;
  summary: string;
  details: Record<string, unknown>;
  diagnosis?: string[];
  prescriptions?: string[];
  followUpPlan?: string;
  createdAt: Date;
  updatedAt: Date;
}

const clinicalRecordSchema = new Schema<IClinicalRecord>(
  {
    workerId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    doctorId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    hospitalId: {
      type: Schema.Types.ObjectId,
      ref: "Hospital",
      default: null,
    },

    consentId: {
      type: Schema.Types.ObjectId,
      ref: "Consent",
      required: true,
      index: true,
    },

    recordType: {
      type: String,
      enum: [
        "CONSULTATION",
        "DIAGNOSIS",
        "PRESCRIPTION",
        "LAB",
        "TREATMENT",
        "FOLLOW_UP",
      ],
      required: true,
    },

    category: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },

    title: {
      type: String,
      required: true,
      trim: true,
    },

    summary: {
      type: String,
      required: true,
      trim: true,
    },

    details: {
      type: Schema.Types.Mixed,
      required: true,
    },

    diagnosis: {
      type: [String],
      default: [],
    },

    prescriptions: {
      type: [String],
      default: [],
    },

    followUpPlan: {
      type: String,
      trim: true,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

export const ClinicalRecord = mongoose.model<IClinicalRecord>(
  "ClinicalRecord",
  clinicalRecordSchema
);
