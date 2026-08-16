import mongoose, { Document, Schema, Types } from "mongoose";

export type VerificationStatus = "PENDING" | "VERIFIED" | "REJECTED";

export interface IDoctorProfile extends Document {
  userId: Types.ObjectId;
  doctorId: string;
  fullName: string;
  specialization: string;
  medicalRegistrationNumber: string;
  phone: string;
  hospitalId?: Types.ObjectId;
  isVerified: boolean;
  verificationStatus: VerificationStatus;
  verificationReason?: string | null;
  createdAt: Date;
  updatedAt: Date;
}

const doctorProfileSchema = new Schema<IDoctorProfile>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },

    doctorId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },

    fullName: {
      type: String,
      required: true,
      trim: true,
    },

    specialization: {
      type: String,
      required: true,
      trim: true,
    },

    medicalRegistrationNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },

    phone: {
      type: String,
      required: true,
      trim: true,
    },

    hospitalId: {
      type: Schema.Types.ObjectId,
      ref: "Hospital",
      required: false,
    },

    isVerified: {
      type: Boolean,
      default: false,
    },

    verificationStatus: {
      type: String,
      enum: ["PENDING", "VERIFIED", "REJECTED"],
      default: "PENDING",
    },

    verificationReason: {
      type: String,
      trim: true,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

export const DoctorProfile = mongoose.model<IDoctorProfile>(
  "DoctorProfile",
  doctorProfileSchema
);
