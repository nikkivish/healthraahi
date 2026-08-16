import mongoose, { Document, Schema, Types } from "mongoose";

export type Gender = "MALE" | "FEMALE" | "OTHER" | "PREFER_NOT_TO_SAY";

export type BloodGroup =
  | "A+"
  | "A-"
  | "B+"
  | "B-"
  | "AB+"
  | "AB-"
  | "O+"
  | "O-";

export interface IEmergencyContact {
  name: string;
  phone: string;
  relationship: string;
}

export interface IWorkerProfile extends Document {
  userId: Types.ObjectId;
  healthId: string;
  dateOfBirth?: Date;
  gender?: Gender;
  bloodGroup?: BloodGroup;
  address?: string;
  emergencyContact?: IEmergencyContact;
  allergies: string[];
  createdAt: Date;
  updatedAt: Date;
}

const emergencyContactSchema = new Schema<IEmergencyContact>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    phone: {
      type: String,
      required: true,
      trim: true,
    },
    relationship: {
      type: String,
      required: true,
      trim: true,
    },
  },
  { _id: false }
);

const workerProfileSchema = new Schema<IWorkerProfile>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },

    healthId: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },

    dateOfBirth: {
      type: Date,
      validate: {
        validator: (value: Date) => value <= new Date(),
        message: "Date of birth cannot be in the future",
      },
    },

    gender: {
      type: String,
      enum: ["MALE", "FEMALE", "OTHER", "PREFER_NOT_TO_SAY"],
    },

    bloodGroup: {
      type: String,
      enum: ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"],
    },

    address: {
      type: String,
      trim: true,
    },

    emergencyContact: {
      type: emergencyContactSchema,
      required: false,
    },

    allergies: {
      type: [String],
      default: [],
      validate: {
        validator: (allergies: string[]) =>
          allergies.every((allergy) => allergy.trim().length > 0),
        message: "Allergy entries cannot be empty",
      },
    },
  },
  {
    timestamps: true,
  }
);

export const WorkerProfile = mongoose.model<IWorkerProfile>(
  "WorkerProfile",
  workerProfileSchema
);
