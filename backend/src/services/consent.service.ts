import mongoose from "mongoose";
import { AppError } from "../middleware/errorHandler";
import { Consent, IConsent } from "../models/Consent";
import { Hospital } from "../models/Hospital";
import { User } from "../models/User";
import { logAuditEvent } from "./auditLog.service";

export interface ConsentRequestInput {
  workerId: string;
  doctorId: string;
  hospitalId?: string;
  categories: string[];
  purpose: string;
  validFrom?: Date | string;
  validUntil: Date | string;
  notes?: string;
}

export const serializeConsent = (consent: IConsent) => ({
  id: consent._id.toString(),
  workerId: consent.workerId.toString(),
  doctorId: consent.doctorId.toString(),
  hospitalId: consent.hospitalId ? consent.hospitalId.toString() : undefined,
  categories: consent.categories,
  purpose: consent.purpose,
  status: consent.status,
  validFrom: consent.validFrom.toISOString(),
  validUntil: consent.validUntil.toISOString(),
  ...(consent.notes ? { notes: consent.notes } : {}),
  createdAt: consent.createdAt,
  updatedAt: consent.updatedAt,
});

const normalizeCategories = (categories: unknown): string[] => {
  if (!Array.isArray(categories) || categories.length === 0) {
    throw new AppError("At least one consent category is required", 400);
  }

  const normalized = categories
    .map((category) => (typeof category === "string" ? category.trim() : ""))
    .filter(Boolean);

  if (normalized.length !== categories.length) {
    throw new AppError("Consent categories cannot be empty", 400);
  }

  return normalized;
};

const normalizeDate = (value: Date | string | undefined, field: string): Date => {
  if (!value) {
    throw new AppError(`${field} is required`, 400);
  }

  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new AppError(`Invalid ${field}`, 400);
  }

  return date;
};

export const requestConsent = async (input: ConsentRequestInput) => {
  if (!input.workerId || !input.doctorId) {
    throw new AppError("Worker ID and doctor ID are required", 400);
  }

  if (input.workerId === input.doctorId) {
    throw new AppError("A doctor cannot create consent for their own identity", 400);
  }

  const worker = await User.findById(input.workerId);
  if (!worker) {
    throw new AppError("Worker not found", 404);
  }

  if (worker.role !== "WORKER") {
    throw new AppError("Consent can only be requested for a worker", 400);
  }

  const doctor = await User.findById(input.doctorId);
  if (!doctor) {
    throw new AppError("Doctor not found", 404);
  }

  if (doctor.role !== "DOCTOR") {
    throw new AppError("Consent request must be for a doctor", 400);
  }

  if (input.hospitalId && input.hospitalId.trim()) {
    if (!mongoose.isValidObjectId(input.hospitalId)) {
      throw new AppError("Invalid hospital ID", 400);
    }

    const hospital = await Hospital.findById(input.hospitalId);
    if (!hospital) {
      throw new AppError("Hospital not found", 404);
    }
  }

  const categories = normalizeCategories(input.categories);
  const purpose = input.purpose?.trim();
  if (!purpose) {
    throw new AppError("Consent purpose is required", 400);
  }

  const validFrom = normalizeDate(input.validFrom ?? new Date(), "validFrom");
  const validUntil = normalizeDate(input.validUntil, "validUntil");

  if (validUntil <= validFrom) {
    throw new AppError("Consent validUntil must be after validFrom", 400);
  }

  const consent = await Consent.create({
    workerId: input.workerId,
    doctorId: input.doctorId,
    ...(input.hospitalId && input.hospitalId.trim() ? { hospitalId: input.hospitalId } : {}),
    categories,
    purpose,
    status: "PENDING",
    validFrom,
    validUntil,
    ...(input.notes?.trim() ? { notes: input.notes.trim() } : {}),
  });

  await logAuditEvent({
    actorUserId: input.doctorId,
    actorRole: "DOCTOR",
    action: "CONSENT_REQUESTED",
    resourceType: "CONSENT",
    resourceId: consent._id.toString(),
    result: "SUCCESS",
    details: {
      workerId: input.workerId,
      categories,
      purpose,
    },
  });

  return serializeConsent(consent);
};

export const getConsentById = async (consentId: string) => {
  if (!mongoose.isValidObjectId(consentId)) {
    throw new AppError("Invalid consent ID", 400);
  }

  const consent = await Consent.findById(consentId);
  if (!consent) {
    throw new AppError("Consent not found", 404);
  }

  return serializeConsent(consent);
};

export const getWorkerConsents = async (workerId: string) => {
  const consents = await Consent.find({ workerId }).sort({ createdAt: -1 });
  return consents.map((consent) => serializeConsent(consent));
};

export const getDoctorConsents = async (doctorId: string) => {
  const consents = await Consent.find({ doctorId }).sort({ createdAt: -1 });
  return consents.map((consent) => serializeConsent(consent));
};

export const isConsentActiveForAccess = async ({
  workerId,
  doctorId,
  categories,
  hospitalId,
}: {
  workerId: string;
  doctorId: string;
  categories: string[];
  hospitalId?: string;
}) => {
  const now = new Date();

  const normalizedCategories = normalizeCategories(categories);
  const filter: Record<string, unknown> = {
    workerId,
    doctorId,
    status: "APPROVED",
    validFrom: { $lte: now },
    validUntil: { $gte: now },
    categories: { $in: normalizedCategories },
  };

  if (hospitalId && hospitalId.trim()) {
    filter.hospitalId = { $in: [null, hospitalId] };
  }

  const consent = await Consent.findOne(filter).sort({ createdAt: -1 });
  return consent ? serializeConsent(consent) : null;
};

export const approveConsent = async (workerId: string, consentId: string) => {
  const consent = await Consent.findById(consentId);
  if (!consent) {
    throw new AppError("Consent not found", 404);
  }

  if (consent.workerId.toString() !== workerId) {
    throw new AppError("You can only approve your own consent requests", 403);
  }

  if (consent.status !== "PENDING") {
    throw new AppError("Only pending consent can be approved", 400);
  }

  if (new Date() > consent.validUntil) {
    throw new AppError("Consent validity period has expired", 400);
  }

  consent.status = "APPROVED";
  await consent.save();

  await logAuditEvent({
    actorUserId: workerId,
    actorRole: "WORKER",
    action: "CONSENT_APPROVED",
    resourceType: "CONSENT",
    resourceId: consent._id.toString(),
    result: "SUCCESS",
    details: {
      doctorId: consent.doctorId.toString(),
      categories: consent.categories,
    },
  });

  return serializeConsent(consent);
};

export const rejectConsent = async (workerId: string, consentId: string) => {
  const consent = await Consent.findById(consentId);
  if (!consent) {
    throw new AppError("Consent not found", 404);
  }

  if (consent.workerId.toString() !== workerId) {
    throw new AppError("You can only reject your own consent requests", 403);
  }

  if (consent.status !== "PENDING") {
    throw new AppError("Only pending consent can be rejected", 400);
  }

  consent.status = "REJECTED";
  await consent.save();

  await logAuditEvent({
    actorUserId: workerId,
    actorRole: "WORKER",
    action: "CONSENT_REJECTED",
    resourceType: "CONSENT",
    resourceId: consent._id.toString(),
    result: "SUCCESS",
  });

  return serializeConsent(consent);
};

export const revokeConsent = async (workerId: string, consentId: string) => {
  const consent = await Consent.findById(consentId);
  if (!consent) {
    throw new AppError("Consent not found", 404);
  }

  if (consent.workerId.toString() !== workerId) {
    throw new AppError("You can only revoke your own consent", 403);
  }

  if (consent.status === "REVOKED" || consent.status === "REJECTED") {
    throw new AppError("Consent is already inactive", 400);
  }

  consent.status = "REVOKED";
  await consent.save();

  await logAuditEvent({
    actorUserId: workerId,
    actorRole: "WORKER",
    action: "CONSENT_REVOKED",
    resourceType: "CONSENT",
    resourceId: consent._id.toString(),
    result: "SUCCESS",
  });

  return serializeConsent(consent);
};
