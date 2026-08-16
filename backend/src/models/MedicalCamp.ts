import mongoose, { Document, Schema, Types } from "mongoose";

export type CampStatus = "UPCOMING" | "ONGOING" | "COMPLETED" | "CANCELLED";

export interface ITimeSlot {
  startTime: string;
  endTime: string;
  capacity: number;
  registeredCount: number;
}

export interface IMedicalCamp extends Document {
  campId: string;
  name: string;
  date: Date;
  timeSlots: ITimeSlot[];
  location: string;
  city: string;
  specialties: string[];
  feeType: "FREE" | "PAID";
  description: string;
  organizer: string;
  status: CampStatus;
  assignedDoctors: Types.ObjectId[];
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const timeSlotSchema = new Schema<ITimeSlot>(
  {
    startTime: { type: String, required: true, trim: true },
    endTime: { type: String, required: true, trim: true },
    capacity: { type: Number, required: true, min: 1 },
    registeredCount: { type: Number, default: 0, min: 0 },
  },
  { _id: false }
);

const medicalCampSchema = new Schema<IMedicalCamp>(
  {
    campId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },

    name: {
      type: String,
      required: true,
      trim: true,
    },

    date: {
      type: Date,
      required: true,
    },

    timeSlots: {
      type: [timeSlotSchema],
      required: true,
      validate: {
        validator: (slots: ITimeSlot[]) =>
          Array.isArray(slots) && slots.length > 0,
        message: "At least one time slot is required",
      },
    },

    location: {
      type: String,
      required: true,
      trim: true,
    },

    city: {
      type: String,
      required: true,
      trim: true,
    },

    specialties: {
      type: [String],
      default: [],
    },

    feeType: {
      type: String,
      enum: ["FREE", "PAID"],
      default: "FREE",
    },

    description: {
      type: String,
      required: true,
      trim: true,
    },

    organizer: {
      type: String,
      required: true,
      trim: true,
    },

    status: {
      type: String,
      enum: ["UPCOMING", "ONGOING", "COMPLETED", "CANCELLED"],
      default: "UPCOMING",
    },

    assignedDoctors: [
      {
        type: Schema.Types.ObjectId,
        ref: "User",
      },
    ],

    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

medicalCampSchema.index({ status: 1, date: 1 });
medicalCampSchema.index({ city: 1 });

export const MedicalCamp = mongoose.model<IMedicalCamp>(
  "MedicalCamp",
  medicalCampSchema
);
