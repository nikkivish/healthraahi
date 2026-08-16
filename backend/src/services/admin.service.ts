import mongoose from "mongoose";
import { AuditAction, AuditLog, AuditResult } from "../models/AuditLog";
import { ClinicalRecord } from "../models/ClinicalRecord";
import { Consent } from "../models/Consent";
import { DoctorProfile } from "../models/DoctorProfile";
import { Hospital } from "../models/Hospital";
import { User, UserRole } from "../models/User";
import { WorkerProfile } from "../models/WorkerProfile";
import { AppError } from "../middleware/errorHandler";

export interface AuditLogFilters {
  actorUserId?: string;
  actorRole?: UserRole;
  action?: AuditAction;
  resourceType?: "CONSENT" | "CLINICAL_RECORD" | "CAMP";
  resourceId?: string;
  result?: AuditResult;
}

export interface AuditLogListOptions {
  limit?: number;
  skip?: number;
}

const serializeAuditLog = (log: any) => ({
  id: log._id.toString(),
  actorUserId: log.actorUserId ? log.actorUserId.toString() : undefined,
  actorRole: log.actorRole,
  action: log.action,
  resourceType: log.resourceType,
  resourceId: log.resourceId ? log.resourceId.toString() : undefined,
  result: log.result,
  details: log.details ?? {},
  createdAt: log.createdAt,
});

export const listAuditLogs = async (
  filters: AuditLogFilters = {},
  options: AuditLogListOptions = {}
) => {
  const query: Record<string, unknown> = {};

  if (filters.actorUserId) {
    if (!mongoose.isValidObjectId(filters.actorUserId)) {
      throw new AppError("Invalid actor user ID", 400);
    }
    query.actorUserId = filters.actorUserId;
  }

  if (filters.actorRole) {
    query.actorRole = filters.actorRole;
  }

  if (filters.action) {
    query.action = filters.action;
  }

  if (filters.resourceType) {
    query.resourceType = filters.resourceType;
  }

  if (filters.resourceId) {
    if (!mongoose.isValidObjectId(filters.resourceId)) {
      throw new AppError("Invalid resource ID", 400);
    }
    query.resourceId = filters.resourceId;
  }

  if (filters.result) {
    query.result = filters.result;
  }

  const limit = Math.min(Math.max(options.limit ?? 50, 1), 200);
  const skip = Math.max(options.skip ?? 0, 0);

  const [logs, total] = await Promise.all([
    AuditLog.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean(),
    AuditLog.countDocuments(query),
  ]);

  return {
    logs: logs.map((log) => serializeAuditLog(log)),
    total,
    limit,
    skip,
  };
};

export const getAuditLogById = async (auditLogId: string) => {
  if (!mongoose.isValidObjectId(auditLogId)) {
    throw new AppError("Invalid audit log ID", 400);
  }

  const auditLog = await AuditLog.findById(auditLogId).lean();

  if (!auditLog) {
    throw new AppError("Audit log not found", 404);
  }

  return serializeAuditLog(auditLog);
};

export const getAdminOverview = async () => {
  const [
    totalWorkers,
    totalDoctors,
    totalHospitals,
    totalClinicalRecords,
    totalConsents,
    pendingDoctorVerifications,
    approvedConsents,
    pendingConsents,
    revokedConsents,
  ] = await Promise.all([
    User.countDocuments({ role: "WORKER" }),
    User.countDocuments({ role: "DOCTOR" }),
    Hospital.countDocuments({ isActive: true }),
    ClinicalRecord.countDocuments(),
    Consent.countDocuments(),
    DoctorProfile.countDocuments({ verificationStatus: "PENDING" }),
    Consent.countDocuments({ status: "APPROVED" }),
    Consent.countDocuments({ status: "PENDING" }),
    Consent.countDocuments({ status: "REVOKED" }),
  ]);

  const workerProfiles = await WorkerProfile.countDocuments();

  return {
    totals: {
      workers: totalWorkers,
      workerProfiles,
      doctors: totalDoctors,
      hospitals: totalHospitals,
      clinicalRecords: totalClinicalRecords,
      consents: totalConsents,
    },
    verification: {
      pending: pendingDoctorVerifications,
      totalDoctors: totalDoctors,
    },
    consent: {
      approved: approvedConsents,
      pending: pendingConsents,
      revoked: revokedConsents,
    },
  };
};
