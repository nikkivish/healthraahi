import mongoose from "mongoose";
import { AppError } from "../middleware/errorHandler";
import { AuthenticatedUser } from "../types/express";
import { ClinicalRecord } from "../models/ClinicalRecord";
import { ClinicalRecordDocument } from "../models/ClinicalRecordDocument";
import { Consent } from "../models/Consent";
import { DoctorProfile } from "../models/DoctorProfile";
import { User } from "../models/User";
import {
  uploadFile,
  downloadFileFromBucket,
  deleteFile,
  isAllowedMimeType,
  isAllowedFileSize,
  BUCKET_NAME,
} from "../utils/gridfsStorage";
import { logAuditEvent } from "./auditLog.service";

const serializeDocument = (doc: any) => ({
  id: doc._id.toString(),
  clinicalRecordId: doc.clinicalRecordId.toString(),
  workerId: doc.workerId.toString(),
  doctorId: doc.doctorId.toString(),
  originalFileName: doc.originalFileName,
  mimeType: doc.mimeType,
  fileSize: doc.fileSize,
  uploadedAt: doc.createdAt.toISOString(),
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

const validateConsentForRecord = async (
  workerId: string,
  doctorId: string,
  hospitalId?: string
): Promise<void> => {
  const now = new Date();

  const consent = await Consent.findOne({
    workerId,
    doctorId,
    status: "APPROVED",
    validFrom: { $lte: now },
    validUntil: { $gte: now },
    categories: { $in: ["MEDICAL_RECORDS"] },
    ...(hospitalId ? { hospitalId: { $in: [null, hospitalId] } } : {}),
  }).sort({ createdAt: -1 });

  if (!consent) {
    throw new AppError("Active consent is required to access this record", 403);
  }
};

const verifyRecordAccess = async (
  recordId: string,
  actor: AuthenticatedUser
): Promise<any> => {
  if (!mongoose.Types.ObjectId.isValid(recordId)) {
    throw new AppError("Invalid record ID", 400);
  }

  const record = await ClinicalRecord.findById(recordId)
    .populate("workerId", "name")
    .populate("doctorId", "name");

  if (!record) {
    throw new AppError("Clinical record not found", 404);
  }

  const recordWorkerId = record.workerId._id
    ? record.workerId._id.toString()
    : record.workerId.toString();
  const recordDoctorId = record.doctorId._id
    ? record.doctorId._id.toString()
    : record.doctorId.toString();

  if (actor.role === "WORKER") {
    if (recordWorkerId !== actor.id) {
      throw new AppError("Access denied", 403);
    }
  } else if (actor.role === "DOCTOR") {
    await validateDoctorAccess(actor.id);
    if (recordDoctorId !== actor.id) {
      throw new AppError("Access denied", 403);
    }
    await validateConsentForRecord(recordWorkerId, actor.id);
  } else {
    throw new AppError("Access denied", 403);
  }

  return record;
};

export const uploadClinicalRecordDocuments = async (
  doctorId: string,
  recordId: string,
  files: Express.Multer.File[]
): Promise<{ uploaded: Record<string, unknown>[]; failed: { fileName: string; error: string }[] }> => {
  await validateDoctorAccess(doctorId);

  if (!mongoose.Types.ObjectId.isValid(recordId)) {
    throw new AppError("Invalid record ID", 400);
  }

  const record = await ClinicalRecord.findById(recordId);
  if (!record) {
    throw new AppError("Clinical record not found", 404);
  }

  if (record.doctorId.toString() !== doctorId) {
    throw new AppError("Access denied", 403);
  }

  await validateConsentForRecord(record.workerId.toString(), doctorId);

  const uploaded: Record<string, unknown>[] = [];
  const failed: { fileName: string; error: string }[] = [];

  for (const file of files) {
    if (!isAllowedMimeType(file.mimetype)) {
      failed.push({ fileName: file.originalname, error: `Unsupported file type "${file.mimetype}"` });
      continue;
    }

    if (!isAllowedFileSize(file.size)) {
      failed.push({ fileName: file.originalname, error: "File too large. Maximum size is 10 MB" });
      continue;
    }

    try {
      const uploadResult = await uploadFile(file.buffer, file.originalname, file.mimetype);

      const doc = await ClinicalRecordDocument.create({
        clinicalRecordId: record._id,
        workerId: record.workerId,
        doctorId: new mongoose.Types.ObjectId(doctorId),
        gridfsFileId: uploadResult.fileId,
        originalFileName: file.originalname,
        mimeType: uploadResult.mimeType,
        fileSize: uploadResult.fileSize,
      });

      await logAuditEvent({
        actorUserId: doctorId,
        actorRole: "DOCTOR",
        action: "DOCUMENT_UPLOADED",
        resourceType: "CLINICAL_RECORD",
        resourceId: recordId,
        result: "SUCCESS",
        details: { documentId: doc._id.toString(), fileName: file.originalname, fileSize: file.size },
      });

      uploaded.push(serializeDocument(doc));
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Upload failed";
      failed.push({ fileName: file.originalname, error: msg });
    }
  }

  return { uploaded, failed };
};

export const listClinicalRecordDocuments = async (
  recordId: string,
  actor: AuthenticatedUser
): Promise<Record<string, unknown>[]> => {
  await verifyRecordAccess(recordId, actor);

  const docs = await ClinicalRecordDocument.find({
    clinicalRecordId: new mongoose.Types.ObjectId(recordId),
  }).sort({ createdAt: -1 });

  return docs.map(serializeDocument);
};

export const downloadClinicalRecordDocument = async (
  documentId: string,
  actor: AuthenticatedUser
) => {
  if (!mongoose.Types.ObjectId.isValid(documentId)) {
    throw new AppError("Invalid document ID", 400);
  }

  const doc = await ClinicalRecordDocument.findById(documentId);
  if (!doc) {
    throw new AppError("Document not found", 404);
  }

  await verifyRecordAccess(doc.clinicalRecordId.toString(), actor);

  await logAuditEvent({
    actorUserId: actor.id,
    actorRole: actor.role,
    action: "DOCUMENT_DOWNLOADED",
    resourceType: "CLINICAL_RECORD",
    resourceId: doc.clinicalRecordId.toString(),
    result: "SUCCESS",
    details: { documentId: doc._id.toString(), fileName: doc.originalFileName },
  });

  const { stream, fileName, fileSize } = await downloadFileFromBucket(BUCKET_NAME, doc.gridfsFileId);

  return { stream, fileName, storedMimeType: doc.mimeType, fileSize };
};

export const deleteClinicalRecordDocument = async (
  documentId: string,
  doctorId: string
): Promise<void> => {
  await validateDoctorAccess(doctorId);

  if (!mongoose.Types.ObjectId.isValid(documentId)) {
    throw new AppError("Invalid document ID", 400);
  }

  const doc = await ClinicalRecordDocument.findById(documentId);
  if (!doc) {
    throw new AppError("Document not found", 404);
  }

  if (doc.doctorId.toString() !== doctorId) {
    throw new AppError("Access denied", 403);
  }

  await validateConsentForRecord(doc.workerId.toString(), doctorId);

  await deleteFile(doc.gridfsFileId);
  await ClinicalRecordDocument.findByIdAndDelete(doc._id);

  await logAuditEvent({
    actorUserId: doctorId,
    actorRole: "DOCTOR",
    action: "DOCUMENT_DELETED",
    resourceType: "CLINICAL_RECORD",
    resourceId: doc.clinicalRecordId.toString(),
    result: "SUCCESS",
    details: { documentId: doc._id.toString(), fileName: doc.originalFileName },
  });
};
