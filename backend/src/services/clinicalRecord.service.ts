import mongoose from "mongoose";
import { AppError } from "../middleware/errorHandler";
import { AuthenticatedUser } from "../types/express";
import { ClinicalRecord } from "../models/ClinicalRecord";
import { Consent } from "../models/Consent";
import { DoctorProfile } from "../models/DoctorProfile";
import { User } from "../models/User";
import { WorkerProfile } from "../models/WorkerProfile";
import { logAuditEvent } from "./auditLog.service";

export interface ClinicalRecordInput {
  workerId: string;
  hospitalId?: string;
  consentId: string;
  recordType: string;
  category: string;
  title: string;
  summary: string;
  details: Record<string, unknown>;
  diagnosis?: string[];
  prescriptions?: string[];
  followUpPlan?: string;
}

const serializeClinicalRecord = (record: any) => ({
  id: record._id.toString(),
  workerId: record.workerId?._id
    ? record.workerId._id.toString()
    : record.workerId.toString(),
  workerName: record.workerId?.name ?? undefined,
  workerHealthId: record.workerHealthId ?? undefined,
  doctorId: record.doctorId?._id
    ? record.doctorId._id.toString()
    : record.doctorId.toString(),
  doctorName: record.doctorId?.name ?? undefined,
  hospitalId: record.hospitalId
    ? record.hospitalId._id
      ? record.hospitalId._id.toString()
      : record.hospitalId.toString()
    : undefined,
  hospitalName: record.hospitalId?.name ?? undefined,
  consentId: record.consentId.toString(),
  recordType: record.recordType,
  category: record.category,
  title: record.title,
  summary: record.summary,
  details: record.details,
  diagnosis: record.diagnosis ?? [],
  prescriptions: record.prescriptions ?? [],
  followUpPlan: record.followUpPlan ?? undefined,
  createdAt: record.createdAt,
  updatedAt: record.updatedAt,
});

const validateDoctorAccess = async (doctorId: string): Promise<void> => {
  const doctor = await User.findById(doctorId);
  if (!doctor || doctor.role !== "DOCTOR") {
    throw new AppError("Doctor access required", 403);
  }

  const profile = await DoctorProfile.findOne({ userId: doctorId });
  if (!profile || profile.verificationStatus !== "VERIFIED" || !profile.isVerified) {
    throw new AppError("Doctor account is not verified", 403);
  }
};

const validateConsentForRecord = async ({
  workerId,
  doctorId,
  categories,
  hospitalId,
}: {
  workerId: string;
  doctorId: string;
  categories: string[];
  hospitalId?: string;
}): Promise<void> => {
  const now = new Date();

  const consent = await Consent.findOne({
    workerId,
    doctorId,
    status: "APPROVED",
    validFrom: { $lte: now },
    validUntil: { $gte: now },
    categories: { $in: categories },
    ...(hospitalId ? { hospitalId: { $in: [null, hospitalId] } } : {}),
  }).sort({ createdAt: -1 });

  if (!consent) {
    throw new AppError("Active consent is required to access this record", 403);
  }
};

export const createClinicalRecord = async (doctorId: string, input: Partial<ClinicalRecordInput>) => {
  await validateDoctorAccess(doctorId);

  const workerId = Array.isArray(input.workerId) ? input.workerId[0] : input.workerId;
  const consentId = Array.isArray(input.consentId) ? input.consentId[0] : input.consentId;

  if (!workerId || !consentId) {
    throw new AppError("Worker ID and consent ID are required", 400);
  }

  const worker = await User.findById(workerId);
  if (!worker || worker.role !== "WORKER") {
    throw new AppError("Worker not found", 404);
  }

  const consent = await Consent.findById(consentId);
  if (!consent) {
    throw new AppError("Consent not found", 404);
  }

  if (consent.workerId.toString() !== workerId || consent.doctorId.toString() !== doctorId) {
    throw new AppError("Consent does not match the worker and doctor", 403);
  }

  if (consent.status !== "APPROVED") {
    throw new AppError("Consent must be approved before creating a record", 403);
  }

  if (new Date() < consent.validFrom || new Date() > consent.validUntil) {
    throw new AppError("Consent validity period is not active", 403);
  }

  const hospitalId = Array.isArray(input.hospitalId) ? input.hospitalId[0] : input.hospitalId;
  if (hospitalId && consent.hospitalId && consent.hospitalId.toString() !== hospitalId) {
    throw new AppError("Consent does not cover this hospital", 403);
  }

  const category = Array.isArray(input.category) ? input.category[0] : input.category;
  const recordType = Array.isArray(input.recordType) ? input.recordType[0] : input.recordType;
  const title = Array.isArray(input.title) ? input.title[0] : input.title;
  const summary = Array.isArray(input.summary) ? input.summary[0] : input.summary;

  if (!category || !recordType || !title || !summary) {
    throw new AppError("Category, record type, title, and summary are required", 400);
  }

  if (!consent.categories.includes(category)) {
    throw new AppError("Consent does not cover this record category", 403);
  }

  const record = await ClinicalRecord.create({
    workerId,
    doctorId,
    ...(hospitalId ? { hospitalId } : {}),
    consentId,
    recordType,
    category,
    title,
    summary,
    details: input.details || {},
    diagnosis: input.diagnosis || [],
    prescriptions: input.prescriptions || [],
    followUpPlan: input.followUpPlan,
  });

  await logAuditEvent({
    actorUserId: doctorId,
    actorRole: "DOCTOR",
    action: "CLINICAL_RECORD_CREATED",
    resourceType: "CLINICAL_RECORD",
    resourceId: record._id.toString(),
    result: "SUCCESS",
    details: {
      workerId,
      category,
      recordType,
    },
  });

  const populated = await ClinicalRecord.findById(record._id)
    .populate("workerId", "name")
    .populate("doctorId", "name")
    .populate("hospitalId", "name");

  const workerProfile = await WorkerProfile.findOne({ userId: workerId })
    .select("healthId")
    .lean();

  return serializeClinicalRecord({
    ...(populated || record).toObject(),
    workerHealthId: workerProfile?.healthId,
  });
};

export const getWorkerClinicalRecords = async (workerId: string, actor: AuthenticatedUser) => {
  if (actor.role === "WORKER" && actor.id !== workerId) {
    throw new AppError("You can only access your own records", 403);
  }

  if (actor.role === "DOCTOR") {
    await validateDoctorAccess(actor.id);
    const hasConsent = await Consent.findOne({
      workerId,
      doctorId: actor.id,
      status: "APPROVED",
      validFrom: { $lte: new Date() },
      validUntil: { $gte: new Date() },
    });
    if (!hasConsent) {
      throw new AppError("Active consent is required to access this worker's records", 403);
    }
  }

  const records = await ClinicalRecord.find({ workerId })
    .populate("doctorId", "name")
    .populate("hospitalId", "name")
    .sort({ createdAt: -1 });

  return records.map((record) => serializeClinicalRecord(record));
};

export const getDoctorAccessibleRecords = async (doctorId: string) => {
  await validateDoctorAccess(doctorId);

  const now = new Date();

  const validConsents = await Consent.find({
    doctorId,
    status: "APPROVED",
    validFrom: { $lte: now },
    validUntil: { $gte: now },
  }).lean();

  if (validConsents.length === 0) {
    return [];
  }

  const workerConsentMap = new Map<
    string,
    { categories: string[]; hospitalId?: string }
  >();
  for (const c of validConsents) {
    const wid = c.workerId.toString();
    const existing = workerConsentMap.get(wid);
    if (existing) {
      existing.categories = [
        ...new Set([...existing.categories, ...c.categories]),
      ];
    } else {
      workerConsentMap.set(wid, {
        categories: [...c.categories],
        hospitalId: c.hospitalId ? c.hospitalId.toString() : undefined,
      });
    }
  }

  const workerIds = [...workerConsentMap.keys()];

  const records = await ClinicalRecord.find({
    workerId: { $in: workerIds },
  })
    .populate("workerId", "name")
    .populate("doctorId", "name")
    .populate("hospitalId", "name")
    .sort({ createdAt: -1 })
    .lean();

  const workerHealthIdMap = new Map<string, string>();
  const profiles = await WorkerProfile.find({
    userId: { $in: workerIds },
  })
    .select("userId healthId")
    .lean();
  for (const p of profiles) {
    workerHealthIdMap.set(p.userId.toString(), p.healthId);
  }

  const filtered = records.filter((record: any) => {
    const wid = record.workerId._id
      ? record.workerId._id.toString()
      : record.workerId.toString();
    const consentInfo = workerConsentMap.get(wid);
    if (!consentInfo) return false;
    if (!consentInfo.categories.includes(record.category)) return false;
    if (
      record.hospitalId &&
      consentInfo.hospitalId &&
      record.hospitalId.toString() !== consentInfo.hospitalId
    ) {
      return false;
    }
    return true;
  });

  return filtered.map((record: any) => {
    const wid = record.workerId._id
      ? record.workerId._id.toString()
      : record.workerId.toString();
    return serializeClinicalRecord({
      ...record,
      workerHealthId: workerHealthIdMap.get(wid),
    });
  });
};

export const getClinicalRecordById = async (recordId: string, actor: AuthenticatedUser) => {
  if (!mongoose.isValidObjectId(recordId)) {
    throw new AppError("Invalid record ID", 400);
  }

  const record = await ClinicalRecord.findById(recordId)
    .populate("workerId", "name")
    .populate("doctorId", "name")
    .populate("hospitalId", "name");
  if (!record) {
    throw new AppError("Clinical record not found", 404);
  }

  const recordWorkerId = record.workerId._id
    ? record.workerId._id.toString()
    : record.workerId.toString();

  if (actor.role === "WORKER" && recordWorkerId !== actor.id) {
    throw new AppError("You can only access your own records", 403);
  }

  if (actor.role === "DOCTOR") {
    await validateDoctorAccess(actor.id);
    await validateConsentForRecord({
      workerId: recordWorkerId,
      doctorId: actor.id,
      categories: [record.category],
      hospitalId: record.hospitalId
        ? record.hospitalId._id
          ? record.hospitalId._id.toString()
          : record.hospitalId.toString()
        : undefined,
    });
  }

  if (actor.role === "ADMIN") {
    throw new AppError("Admin does not have direct access to clinical records", 403);
  }

  const workerProfile = await WorkerProfile.findOne({ userId: recordWorkerId })
    .select("healthId")
    .lean();

  await logAuditEvent({
    actorUserId: actor.id,
    actorRole: actor.role,
    action: "CLINICAL_RECORD_VIEWED",
    resourceType: "CLINICAL_RECORD",
    resourceId: record._id.toString(),
    result: "SUCCESS",
    details: { recordType: record.recordType, category: record.category },
  });

  return serializeClinicalRecord({
    ...record.toObject(),
    workerHealthId: workerProfile?.healthId,
  });
};

export const updateClinicalRecord = async (doctorId: string, recordId: string, input: Partial<ClinicalRecordInput>) => {
  await validateDoctorAccess(doctorId);

  const record = await ClinicalRecord.findById(recordId);
  if (!record) {
    throw new AppError("Clinical record not found", 404);
  }

  if (record.doctorId.toString() !== doctorId) {
    throw new AppError("You can only update your own clinical records", 403);
  }

  const consent = await Consent.findById(record.consentId);
  if (!consent || consent.status !== "APPROVED") {
    throw new AppError("Active consent is required to update this record", 403);
  }

  const updatePayload: Record<string, unknown> = {};

  if (input.title) updatePayload.title = input.title;
  if (input.summary) updatePayload.summary = input.summary;
  if (input.details) updatePayload.details = input.details;
  if (input.diagnosis) updatePayload.diagnosis = input.diagnosis;
  if (input.prescriptions) updatePayload.prescriptions = input.prescriptions;
  if (input.followUpPlan) updatePayload.followUpPlan = input.followUpPlan;

  if (Object.keys(updatePayload).length === 0) {
    throw new AppError("No update fields were provided", 400);
  }

  const updatedRecord = await ClinicalRecord.findOneAndUpdate(
    { _id: recordId, doctorId },
    { $set: updatePayload },
    { new: true, runValidators: true }
  );

  if (!updatedRecord) {
    throw new AppError("Clinical record update failed", 500);
  }

  await logAuditEvent({
    actorUserId: doctorId,
    actorRole: "DOCTOR",
    action: "CLINICAL_RECORD_UPDATED",
    resourceType: "CLINICAL_RECORD",
    resourceId: updatedRecord._id.toString(),
    result: "SUCCESS",
    details: { fields: Object.keys(updatePayload) },
  });

  return serializeClinicalRecord(updatedRecord);
};
