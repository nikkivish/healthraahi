import mongoose from "mongoose";
import { AppError } from "../middleware/errorHandler";
import {
  DoctorVerificationDocument,
  DoctorVerificationDocumentType,
  DoctorVerificationDocStatus,
  VALID_DOCTOR_DOC_TYPES,
  IDoctorVerificationDocument,
} from "../models/DoctorVerificationDocument";
import {
  uploadFile,
  deleteFile,
  isAllowedMimeType,
  isAllowedFileSize,
} from "../utils/gridfsStorage";
import { logAuditEvent } from "./auditLog.service";

const serializeDocument = (doc: IDoctorVerificationDocument) => ({
  id: doc._id.toString(),
  doctorUserId: doc.doctorUserId.toString(),
  documentType: doc.documentType,
  fileName: doc.fileName,
  originalName: doc.originalName,
  mimeType: doc.mimeType,
  fileSize: doc.fileSize,
  status: doc.status,
  rejectionReason: doc.rejectionReason || null,
  uploadedAt: doc.uploadedAt.toISOString(),
  reviewedAt: doc.reviewedAt ? doc.reviewedAt.toISOString() : null,
  createdAt: doc.createdAt.toISOString(),
  updatedAt: doc.updatedAt.toISOString(),
});

export const uploadDoctorVerificationDocument = async (
  doctorUserId: string,
  file: Express.Multer.File,
  documentType: string
): Promise<Record<string, unknown>> => {
  if (!(VALID_DOCTOR_DOC_TYPES as readonly string[]).includes(documentType)) {
    throw new AppError(
      `Invalid document type "${documentType}". Valid types: ${VALID_DOCTOR_DOC_TYPES.join(", ")}`,
      400
    );
  }

  if (!isAllowedMimeType(file.mimetype)) {
    throw new AppError(
      `Unsupported file type "${file.mimetype}". Allowed: PDF, JPEG, PNG`,
      400
    );
  }

  if (!isAllowedFileSize(file.size)) {
    const maxSizeMB = Math.round(
      (await import("../utils/gridfsStorage.js")).MAX_FILE_SIZE_BYTES / (1024 * 1024)
    );
    throw new AppError(`File too large. Maximum size is ${maxSizeMB} MB`, 400);
  }

  const uploadResult = await uploadFile(file.buffer, file.originalname, file.mimetype);

  const doc = await DoctorVerificationDocument.create({
    doctorUserId: new mongoose.Types.ObjectId(doctorUserId),
    documentType: documentType as DoctorVerificationDocumentType,
    fileName: uploadResult.fileName,
    originalName: file.originalname,
    mimeType: uploadResult.mimeType,
    fileSize: uploadResult.fileSize,
    gridfsFileId: uploadResult.fileId,
    status: "PENDING",
  });

  return serializeDocument(doc);
};

export const listDoctorVerificationDocuments = async (
  doctorUserId: string
): Promise<Record<string, unknown>[]> => {
  const docs = await DoctorVerificationDocument.find({
    doctorUserId: new mongoose.Types.ObjectId(doctorUserId),
  }).sort({ createdAt: -1 });

  return docs.map(serializeDocument);
};

export const getDoctorVerificationDocumentById = async (
  documentId: string,
  doctorUserId: string
): Promise<IDoctorVerificationDocument> => {
  if (!mongoose.Types.ObjectId.isValid(documentId)) {
    throw new AppError("Invalid document ID", 400);
  }

  const doc = await DoctorVerificationDocument.findById(documentId);

  if (!doc) {
    throw new AppError("Document not found", 404);
  }

  if (doc.doctorUserId.toString() !== doctorUserId) {
    throw new AppError("Access denied", 403);
  }

  return doc;
};

export const downloadDoctorVerificationDocument = async (
  documentId: string,
  doctorUserId: string
): Promise<IDoctorVerificationDocument> => {
  return getDoctorVerificationDocumentById(documentId, doctorUserId);
};

export const deleteDoctorVerificationDocument = async (
  documentId: string,
  doctorUserId: string
): Promise<void> => {
  const doc = await getDoctorVerificationDocumentById(documentId, doctorUserId);

  if (doc.status === "APPROVED") {
    throw new AppError("Cannot delete an approved document", 400);
  }

  await deleteFile(doc.gridfsFileId);
  await DoctorVerificationDocument.findByIdAndDelete(doc._id);
};

export const replaceDoctorVerificationDocument = async (
  documentId: string,
  doctorUserId: string,
  file: Express.Multer.File
): Promise<Record<string, unknown>> => {
  const doc = await getDoctorVerificationDocumentById(documentId, doctorUserId);

  if (doc.status === "APPROVED") {
    throw new AppError("Cannot replace an approved document", 400);
  }

  if (!isAllowedMimeType(file.mimetype)) {
    throw new AppError(
      `Unsupported file type "${file.mimetype}". Allowed: PDF, JPEG, PNG`,
      400
    );
  }

  if (!isAllowedFileSize(file.size)) {
    const maxSizeMB = Math.round(
      (await import("../utils/gridfsStorage.js")).MAX_FILE_SIZE_BYTES / (1024 * 1024)
    );
    throw new AppError(`File too large. Maximum size is ${maxSizeMB} MB`, 400);
  }

  await deleteFile(doc.gridfsFileId);

  const uploadResult = await uploadFile(file.buffer, file.originalname, file.mimetype);

  const updated = await DoctorVerificationDocument.findOneAndUpdate(
    { _id: doc._id },
    {
      $set: {
        fileName: uploadResult.fileName,
        originalName: file.originalname,
        mimeType: uploadResult.mimeType,
        fileSize: uploadResult.fileSize,
        gridfsFileId: uploadResult.fileId,
        status: "PENDING",
        rejectionReason: null,
        reviewedAt: null,
      },
    },
    { new: true, runValidators: true }
  );

  if (!updated) {
    throw new AppError("Document replacement failed", 500);
  }

  return serializeDocument(updated);
};

export const adminListDoctorVerificationDocuments = async (
  doctorUserId: string
): Promise<Record<string, unknown>[]> => {
  if (!mongoose.Types.ObjectId.isValid(doctorUserId)) {
    throw new AppError("Invalid doctor user ID", 400);
  }

  const docs = await DoctorVerificationDocument.find({
    doctorUserId: new mongoose.Types.ObjectId(doctorUserId),
  }).sort({ createdAt: -1 });

  return docs.map(serializeDocument);
};

export const adminGetDoctorVerificationDocument = async (
  documentId: string
): Promise<IDoctorVerificationDocument> => {
  if (!mongoose.Types.ObjectId.isValid(documentId)) {
    throw new AppError("Invalid document ID", 400);
  }

  const doc = await DoctorVerificationDocument.findById(documentId);

  if (!doc) {
    throw new AppError("Document not found", 404);
  }

  return doc;
};

export const updateDoctorVerificationDocumentStatus = async (
  documentId: string,
  status: DoctorVerificationDocStatus,
  rejectionReason?: string,
  actorUserId?: string,
  actorRole?: "ADMIN" | "WORKER" | "DOCTOR"
): Promise<Record<string, unknown>> => {
  if (!mongoose.Types.ObjectId.isValid(documentId)) {
    throw new AppError("Invalid document ID", 400);
  }

  if (!["PENDING", "APPROVED", "REJECTED"].includes(status)) {
    throw new AppError("Invalid status value", 400);
  }

  const doc = await DoctorVerificationDocument.findById(documentId);

  if (!doc) {
    throw new AppError("Document not found", 404);
  }

  const updateFields: Record<string, unknown> = {
    status,
    reviewedAt: new Date(),
  };

  if (status === "REJECTED") {
    if (!rejectionReason || !rejectionReason.trim()) {
      throw new AppError("Rejection reason is required when rejecting a document", 400);
    }
    updateFields.rejectionReason = rejectionReason.trim();
  } else {
    updateFields.rejectionReason = null;
  }

  const updated = await DoctorVerificationDocument.findOneAndUpdate(
    { _id: documentId },
    { $set: updateFields },
    { new: true, runValidators: true }
  );

  if (!updated) {
    throw new AppError("Document status update failed", 500);
  }

  if (actorUserId && actorRole) {
    logAuditEvent({
      actorUserId,
      actorRole,
      action: status === "APPROVED" ? "DOCTOR_VERIFICATION_APPROVED" : status === "REJECTED" ? "DOCTOR_VERIFICATION_REJECTED" : "DOCTOR_VERIFICATION_APPROVED",
      resourceType: "DOCTOR_VERIFICATION",
      resourceId: documentId,
      result: "SUCCESS",
      details: {
        documentType: doc.documentType,
        doctorUserId: doc.doctorUserId.toString(),
        previousStatus: doc.status,
        newStatus: status,
        ...(status === "REJECTED" && rejectionReason ? { rejectionReason: rejectionReason.trim() } : {}),
      },
    }).catch(() => {});
  }

  return serializeDocument(updated);
};
