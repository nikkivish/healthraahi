import mongoose, { Document, Schema, Types } from "mongoose";

export type CampRegistrationStatus =
  | "CONFIRMED"
  | "CANCELLED"
  | "ATTENDED"
  | "NO_SHOW";

export interface ICampRegistration extends Document {
  campId: Types.ObjectId;
  workerId: Types.ObjectId;
  timeSlotIndex: number;
  healthConcerns?: string;
  status: CampRegistrationStatus;
  registeredAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const campRegistrationSchema = new Schema<ICampRegistration>(
  {
    campId: {
      type: Schema.Types.ObjectId,
      ref: "MedicalCamp",
      required: true,
      index: true,
    },

    workerId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    timeSlotIndex: {
      type: Number,
      required: true,
      min: 0,
    },

    healthConcerns: {
      type: String,
      trim: true,
      default: null,
    },

    status: {
      type: String,
      enum: ["CONFIRMED", "CANCELLED", "ATTENDED", "NO_SHOW"],
      default: "CONFIRMED",
    },

    registeredAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

campRegistrationSchema.index({ campId: 1, workerId: 1 }, { unique: true });
campRegistrationSchema.index({ workerId: 1, status: 1 });

export const CampRegistration = mongoose.model<ICampRegistration>(
  "CampRegistration",
  campRegistrationSchema
);
