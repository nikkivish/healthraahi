import mongoose from "mongoose";
import { NextFunction, Request, Response } from "express";
import { AppError } from "../middleware/errorHandler";
import {
  uploadClinicalRecordDocuments,
  listClinicalRecordDocuments,
  downloadClinicalRecordDocument,
  deleteClinicalRecordDocument,
} from "../services/clinicalRecordDocument.service";

export const uploadDocumentsController = async (
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

    const recordId = Array.isArray(req.params.recordId)
      ? req.params.recordId[0]
      : req.params.recordId;

    if (!recordId) {
      throw new AppError("Record ID is required", 400);
    }

    const files = req.files as Express.Multer.File[] | undefined;
    if (!files || files.length === 0) {
      throw new AppError("At least one file is required", 400);
    }

    const result = await uploadClinicalRecordDocuments(req.user.id, recordId, files);

    res.status(201).json({
      success: true,
      message: result.failed.length > 0
        ? `${result.uploaded.length} file(s) uploaded, ${result.failed.length} failed`
        : `${result.uploaded.length} file(s) uploaded successfully`,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const listDocumentsController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: "Authentication required" });
      return;
    }

    const recordId = Array.isArray(req.params.recordId)
      ? req.params.recordId[0]
      : req.params.recordId;

    if (!recordId) {
      throw new AppError("Record ID is required", 400);
    }

    const documents = await listClinicalRecordDocuments(recordId, req.user);

    res.status(200).json({
      success: true,
      message: "Documents retrieved successfully",
      data: { documents },
    });
  } catch (error) {
    next(error);
  }
};

export const downloadDocumentController = async (
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

    const { stream, fileName, storedMimeType, fileSize } = await downloadClinicalRecordDocument(
      documentId,
      req.user
    );

    res.set("Content-Type", storedMimeType);
    res.set("Content-Length", fileSize.toString());
    res.set("Content-Disposition", `attachment; filename="${fileName}"`);

    stream.pipe(res);
  } catch (error) {
    next(error);
  }
};

export const deleteDocumentController = async (
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

    await deleteClinicalRecordDocument(documentId, req.user.id);

    res.status(200).json({
      success: true,
      message: "Document deleted successfully",
    });
  } catch (error) {
    next(error);
  }
};
