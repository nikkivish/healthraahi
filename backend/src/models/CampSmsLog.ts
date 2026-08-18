import mongoose, { Document, Schema, Types } from "mongoose";

export type CampSmsStatus = "SENT" | "FAILED";

export interface ICampSmsLog extends Document {
  campId: Types.ObjectId;
  workerUserId: Types.ObjectId;
  phone: string;
  status: CampSmsStatus;
  providerMessageId?: string;
  error?: string;
  sentAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const campSmsLogSchema = new Schema<ICampSmsLog>(
  {
    campId: {
      type: Schema.Types.ObjectId,
      ref: "MedicalCamp",
      required: true,
    },

    workerUserId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    phone: {
      type: String,
      required: true,
      trim: true,
    },

    status: {
      type: String,
      enum: ["SENT", "FAILED"],
      required: true,
    },

    providerMessageId: {
      type: String,
      default: undefined,
    },

    error: {
      type: String,
      default: undefined,
    },

    sentAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

campSmsLogSchema.index({ campId: 1, workerUserId: 1 }, { unique: true });

export const CampSmsLog = mongoose.model<ICampSmsLog>(
  "CampSmsLog",
  campSmsLogSchema
);
