import { NextFunction, Request, Response } from "express";
import mongoose from "mongoose";
import { AppError } from "../middleware/errorHandler";
import {
  uploadDoctorVerificationDocument,
  listDoctorVerificationDocuments,
  getDoctorVerificationDocumentById,
  deleteDoctorVerificationDocument,
  replaceDoctorVerificationDocument,
  adminListDoctorVerificationDocuments,
  adminGetDoctorVerificationDocument,
  updateDoctorVerificationDocumentStatus,
} from "../services/doctorVerificationDocument.service";

export const uploadVerificationDocument = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: "Authentication required" });
      return;
    }

    if (req.user.role !== "DOCTOR") {
      res.status(403).json({ success: false, message: "Doctor access required" });
      return;
    }

    if (!req.file) {
      throw new AppError("No file uploaded", 400);
    }

    const { documentType } = req.body || {};

    if (!documentType) {
      throw new AppError("documentType is required", 400);
    }

    const document = await uploadDoctorVerificationDocument(
      req.user.id,
      req.file,
      documentType
    );

    res.status(201).json({
      success: true,
      message: "Verification document uploaded successfully",
      data: { document },
    });
  } catch (error) {
    next(error);
  }
};

export const listMyVerificationDocuments = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: "Authentication required" });
      return;
    }

    if (req.user.role !== "DOCTOR") {
      res.status(403).json({ success: false, message: "Doctor access required" });
      return;
    }

    const documents = await listDoctorVerificationDocuments(req.user.id);

    res.status(200).json({
      success: true,
      message: "Verification documents retrieved successfully",
      data: { documents },
    });
  } catch (error) {
    next(error);
  }
};

export const downloadMyVerificationDocument = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: "Authentication required" });
      return;
    }

    if (req.user.role !== "DOCTOR") {
      res.status(403).json({ success: false, message: "Doctor access required" });
      return;
    }

    const documentId = Array.isArray(req.params.documentId)
      ? req.params.documentId[0]
      : req.params.documentId;

    if (!documentId) {
      throw new AppError("Document ID is required", 400);
    }

    const doc = await getDoctorVerificationDocumentById(documentId, req.user.id);

    const db = mongoose.connection.db;
    if (!db) {
      throw new AppError("Database not connected", 500);
    }
    const bucket = new mongoose.mongo.GridFSBucket(db, { bucketName: "worker_documents" });
    const downloadStream = bucket.openDownloadStream(doc.gridfsFileId);

    res.set("Content-Type", doc.mimeType);
    res.set("Content-Length", doc.fileSize.toString());
    res.set("Content-Disposition", `attachment; filename="${doc.originalName}"`);

    downloadStream.pipe(res);
  } catch (error) {
    next(error);
  }
};

export const deleteMyVerificationDocument = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: "Authentication required" });
      return;
    }

    if (req.user.role !== "DOCTOR") {
      res.status(403).json({ success: false, message: "Doctor access required" });
      return;
    }

    const documentId = Array.isArray(req.params.documentId)
      ? req.params.documentId[0]
      : req.params.documentId;

    if (!documentId) {
      throw new AppError("Document ID is required", 400);
    }

    await deleteDoctorVerificationDocument(documentId, req.user.id);

    res.status(200).json({
      success: true,
      message: "Verification document deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};

export const replaceMyVerificationDocument = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: "Authentication required" });
      return;
    }

    if (req.user.role !== "DOCTOR") {
      res.status(403).json({ success: false, message: "Doctor access required" });
      return;
    }

    if (!req.file) {
      throw new AppError("No file uploaded", 400);
    }

    const documentId = Array.isArray(req.params.documentId)
      ? req.params.documentId[0]
      : req.params.documentId;

    if (!documentId) {
      throw new AppError("Document ID is required", 400);
    }

    const document = await replaceDoctorVerificationDocument(
      documentId,
      req.user.id,
      req.file
    );

    res.status(200).json({
      success: true,
      message: "Verification document replaced successfully",
      data: { document },
    });
  } catch (error) {
    next(error);
  }
};

export const adminListDoctorDocuments = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const doctorUserId = Array.isArray(req.params.doctorUserId)
      ? req.params.doctorUserId[0]
      : req.params.doctorUserId;

    if (!doctorUserId) {
      throw new AppError("Doctor user ID is required", 400);
    }

    const documents = await adminListDoctorVerificationDocuments(doctorUserId);

    res.status(200).json({
      success: true,
      message: "Doctor verification documents retrieved successfully",
      data: { documents },
    });
  } catch (error) {
    next(error);
  }
};

export const adminDownloadDoctorDocument = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const documentId = Array.isArray(req.params.documentId)
      ? req.params.documentId[0]
      : req.params.documentId;

    if (!documentId) {
      throw new AppError("Document ID is required", 400);
    }

    const doc = await adminGetDoctorVerificationDocument(documentId);

    const db = mongoose.connection.db;
    if (!db) {
      throw new AppError("Database not connected", 500);
    }
    const bucket = new mongoose.mongo.GridFSBucket(db, { bucketName: "worker_documents" });
    const downloadStream = bucket.openDownloadStream(doc.gridfsFileId);

    res.set("Content-Type", doc.mimeType);
    res.set("Content-Length", doc.fileSize.toString());
    res.set("Content-Disposition", `attachment; filename="${doc.originalName}"`);

    downloadStream.pipe(res);
  } catch (error) {
    next(error);
  }
};

export const adminUpdateDocumentStatus = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: "Authentication required" });
      return;
    }

    const documentId = Array.isArray(req.params.documentId)
      ? req.params.documentId[0]
      : req.params.documentId;

    if (!documentId) {
      throw new AppError("Document ID is required", 400);
    }

    const { status, rejectionReason } = req.body || {};

    if (!status || typeof status !== "string") {
      throw new AppError("status is required", 400);
    }

    if (!["PENDING", "APPROVED", "REJECTED"].includes(status)) {
      throw new AppError("Invalid status value", 400);
    }

    const document = await updateDoctorVerificationDocumentStatus(
      documentId,
      status as "PENDING" | "APPROVED" | "REJECTED",
      typeof rejectionReason === "string" ? rejectionReason : undefined,
      req.user.id,
      req.user.role
    );

    res.status(200).json({
      success: true,
      message: `Document status updated to ${status}`,
      data: { document },
    });
  } catch (error) {
    next(error);
  }
};
