import mongoose, { Document, Schema } from "mongoose";

export interface IHospital extends Document {
  hospitalId: string;
  name: string;
  registrationNumber: string;
  address: string;
  city: string;
  state: string;
  phone: string;
  email?: string;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const hospitalSchema = new Schema<IHospital>(
  {
    hospitalId: {
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

    registrationNumber: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      index: true,
    },

    address: {
      type: String,
      required: true,
      trim: true,
    },

    city: {
      type: String,
      required: true,
      trim: true,
    },

    state: {
      type: String,
      required: true,
      trim: true,
    },

    phone: {
      type: String,
      required: true,
      trim: true,
    },

    email: {
      type: String,
      trim: true,
      lowercase: true,
    },

    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

export const Hospital = mongoose.model<IHospital>("Hospital", hospitalSchema);
