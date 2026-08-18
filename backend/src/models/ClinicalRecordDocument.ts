import mongoose, { Document, Schema, Types } from "mongoose";

export interface IClinicalRecordDocument extends Document {
  clinicalRecordId: Types.ObjectId;
  workerId: Types.ObjectId;
  doctorId: Types.ObjectId;
  gridfsFileId: Types.ObjectId;
  originalFileName: string;
  mimeType: string;
  fileSize: number;
  createdAt: Date;
}

const clinicalRecordDocumentSchema = new Schema<IClinicalRecordDocument>(
  {
    clinicalRecordId: {
      type: Schema.Types.ObjectId,
      ref: "ClinicalRecord",
      required: true,
      index: true,
    },

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
    },

    gridfsFileId: {
      type: Schema.Types.ObjectId,
      required: true,
    },

    originalFileName: {
      type: String,
      required: true,
    },

    mimeType: {
      type: String,
      required: true,
    },

    fileSize: {
      type: Number,
      required: true,
      min: 1,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

clinicalRecordDocumentSchema.index({ clinicalRecordId: 1, createdAt: -1 });

export const ClinicalRecordDocument = mongoose.model<IClinicalRecordDocument>(
  "ClinicalRecordDocument",
  clinicalRecordDocumentSchema
);
