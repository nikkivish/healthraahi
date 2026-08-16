import mongoose, { Document, Schema, Types } from "mongoose";

export interface ICampDoctorAssignment extends Document {
  campId: Types.ObjectId;
  doctorId: Types.ObjectId;
  assignedBy: Types.ObjectId;
  assignedAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

const campDoctorAssignmentSchema = new Schema<ICampDoctorAssignment>(
  {
    campId: {
      type: Schema.Types.ObjectId,
      ref: "MedicalCamp",
      required: true,
      index: true,
    },

    doctorId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    assignedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },

    assignedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

campDoctorAssignmentSchema.index({ campId: 1, doctorId: 1 }, { unique: true });

export const CampDoctorAssignment = mongoose.model<ICampDoctorAssignment>(
  "CampDoctorAssignment",
  campDoctorAssignmentSchema
);
