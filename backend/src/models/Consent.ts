import mongoose, { Document, Schema, Types } from "mongoose";

export type ConsentStatus =
  | "PENDING"
  | "APPROVED"
  | "REJECTED"
  | "REVOKED"
  | "EXPIRED";

export interface IConsent extends Document {
  workerId: Types.ObjectId;
  doctorId: Types.ObjectId;
  hospitalId?: Types.ObjectId;
  categories: string[];
  purpose: string;
  status: ConsentStatus;
  validFrom: Date;
  validUntil: Date;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const consentSchema = new Schema<IConsent>(
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

    categories: {
      type: [String],
      required: true,
      validate: {
        validator: (categories: string[]) =>
          Array.isArray(categories) && categories.length > 0,
        message: "At least one consent category is required",
      },
    },

    purpose: {
      type: String,
      required: true,
      trim: true,
    },

    status: {
      type: String,
      enum: ["PENDING", "APPROVED", "REJECTED", "REVOKED", "EXPIRED"],
      default: "PENDING",
    },

    validFrom: {
      type: Date,
      required: true,
    },

    validUntil: {
      type: Date,
      required: true,
    },

    notes: {
      type: String,
      trim: true,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

consentSchema.index({ workerId: 1, doctorId: 1, validFrom: 1, validUntil: 1 });

export const Consent = mongoose.model<IConsent>("Consent", consentSchema);
