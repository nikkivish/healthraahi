import { NextFunction, Request, Response } from "express";
import mongoose from "mongoose";
import { AppError } from "../middleware/errorHandler";
import {
  uploadWorkerDocument,
  listWorkerDocuments,
  getWorkerDocumentById,
  deleteWorkerDocument,
} from "../services/workerDocument.service";

export const uploadDocument = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: "Authentication required" });
      return;
    }

    if (req.user.role !== "WORKER") {
      res.status(403).json({ success: false, message: "Worker access required" });
      return;
    }

    if (!req.file) {
      throw new AppError("No file uploaded", 400);
    }

    const { documentType, description } = req.body || {};

    if (!documentType) {
      throw new AppError("documentType is required", 400);
    }

    const document = await uploadWorkerDocument(
      req.user.id,
      req.file,
      documentType,
      description
    );

    res.status(201).json({
      success: true,
      message: "Document uploaded successfully",
      data: { document },
    });
  } catch (error) {
    next(error);
  }
};

export const listMyDocuments = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: "Authentication required" });
      return;
    }

    if (req.user.role !== "WORKER") {
      res.status(403).json({ success: false, message: "Worker access required" });
      return;
    }

    const documents = await listWorkerDocuments(req.user.id);

    res.status(200).json({
      success: true,
      message: "Documents retrieved successfully",
      data: { documents },
    });
  } catch (error) {
    next(error);
  }
};

export const getDocumentById = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: "Authentication required" });
      return;
    }

    if (req.user.role !== "WORKER") {
      res.status(403).json({ success: false, message: "Worker access required" });
      return;
    }

    const documentId = Array.isArray(req.params.documentId)
      ? req.params.documentId[0]
      : req.params.documentId;

    if (!documentId) {
      throw new AppError("Document ID is required", 400);
    }

    const doc = await getWorkerDocumentById(documentId, req.user.id);

    res.status(200).json({
      success: true,
      message: "Document retrieved successfully",
      data: { document: {
        id: doc._id.toString(),
        workerId: doc.workerId.toString(),
        documentType: doc.documentType,
        fileName: doc.fileName,
        originalFileName: doc.originalFileName,
        mimeType: doc.mimeType,
        fileSize: doc.fileSize,
        description: doc.description || null,
        uploadedAt: doc.createdAt.toISOString(),
        updatedAt: doc.updatedAt.toISOString(),
      }},
    });
  } catch (error) {
    next(error);
  }
};

export const downloadDocument = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: "Authentication required" });
      return;
    }

    if (req.user.role !== "WORKER") {
      res.status(403).json({ success: false, message: "Worker access required" });
      return;
    }

    const documentId = Array.isArray(req.params.documentId)
      ? req.params.documentId[0]
      : req.params.documentId;

    if (!documentId) {
      throw new AppError("Document ID is required", 400);
    }

    const doc = await getWorkerDocumentById(documentId, req.user.id);

    const db = mongoose.connection.db;
    if (!db) {
      throw new AppError("Database not connected", 500);
    }
    const bucket = new mongoose.mongo.GridFSBucket(db, { bucketName: "worker_documents" });
    const downloadStream = bucket.openDownloadStream(doc.gridfsFileId);

    res.set("Content-Type", doc.mimeType);
    res.set("Content-Length", doc.fileSize.toString());
    res.set("Content-Disposition", `attachment; filename="${doc.originalFileName}"`);

    downloadStream.pipe(res);
  } catch (error) {
    next(error);
  }
};

export const deleteDocument = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: "Authentication required" });
      return;
    }

    if (req.user.role !== "WORKER") {
      res.status(403).json({ success: false, message: "Worker access required" });
      return;
    }

    const documentId = Array.isArray(req.params.documentId)
      ? req.params.documentId[0]
      : req.params.documentId;

    if (!documentId) {
      throw new AppError("Document ID is required", 400);
    }

    await deleteWorkerDocument(documentId, req.user.id);

    res.status(200).json({
      success: true,
      message: "Document deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};
