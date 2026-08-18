import mongoose, { Document, Schema, Types } from "mongoose";

export type AuditAction =
  | "CONSENT_REQUESTED"
  | "CONSENT_APPROVED"
  | "CONSENT_REJECTED"
  | "CONSENT_REVOKED"
  | "CLINICAL_RECORD_CREATED"
  | "CLINICAL_RECORD_UPDATED"
  | "CLINICAL_RECORD_VIEWED"
  | "CONSENT_DENIED"
  | "CLINICAL_RECORD_DENIED"
  | "CAMP_REGISTERED"
  | "CAMP_REGISTRATION_CANCELLED"
  | "CAMP_CREATED"
  | "CAMP_UPDATED"
  | "CAMP_CANCELLED"
  | "DOCTOR_VERIFICATION_APPROVED"
  | "DOCTOR_VERIFICATION_REJECTED"
  | "DOCTOR_VERIFIED"
  | "DOCUMENT_UPLOADED"
  | "DOCUMENT_DOWNLOADED"
  | "DOCUMENT_DELETED";

export type AuditResult = "SUCCESS" | "DENIED" | "FAILED";

export interface IAuditLog extends Document {
  actorUserId: Types.ObjectId;
  actorRole: "WORKER" | "DOCTOR" | "ADMIN";
  action: AuditAction;
  resourceType: "CONSENT" | "CLINICAL_RECORD" | "CAMP" | "DOCTOR_VERIFICATION";
  resourceId: Types.ObjectId;
  result: AuditResult;
  details?: Record<string, unknown>;
  createdAt: Date;
}

const auditLogSchema = new Schema<IAuditLog>(
  {
    actorUserId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },

    actorRole: {
      type: String,
      enum: ["WORKER", "DOCTOR", "ADMIN"],
      required: true,
    },

    action: {
      type: String,
      enum: [
        "CONSENT_REQUESTED",
        "CONSENT_APPROVED",
        "CONSENT_REJECTED",
        "CONSENT_REVOKED",
        "CLINICAL_RECORD_CREATED",
        "CLINICAL_RECORD_UPDATED",
        "CLINICAL_RECORD_VIEWED",
        "CONSENT_DENIED",
        "CLINICAL_RECORD_DENIED",
        "CAMP_REGISTERED",
        "CAMP_REGISTRATION_CANCELLED",
        "CAMP_CREATED",
        "CAMP_UPDATED",
        "CAMP_CANCELLED",
        "DOCTOR_VERIFICATION_APPROVED",
        "DOCTOR_VERIFICATION_REJECTED",
        "DOCTOR_VERIFIED",
        "DOCUMENT_UPLOADED",
        "DOCUMENT_DOWNLOADED",
        "DOCUMENT_DELETED",
      ],
      required: true,
    },

    resourceType: {
      type: String,
      enum: ["CONSENT", "CLINICAL_RECORD", "CAMP", "DOCTOR_VERIFICATION"],
      required: true,
    },

    resourceId: {
      type: Schema.Types.ObjectId,
      required: true,
      index: true,
    },

    result: {
      type: String,
      enum: ["SUCCESS", "DENIED", "FAILED"],
      required: true,
    },

    details: {
      type: Schema.Types.Mixed,
      default: {},
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

export const AuditLog = mongoose.model<IAuditLog>("AuditLog", auditLogSchema);
