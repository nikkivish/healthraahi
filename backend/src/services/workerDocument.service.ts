import mongoose from "mongoose";
import { AppError } from "../middleware/errorHandler";
import {
  DocumentType,
  VALID_DOCUMENT_TYPES,
  WorkerHealthDocument,
  IWorkerHealthDocument,
} from "../models/WorkerHealthDocument";
import {
  uploadFile,
  downloadFile,
  deleteFile,
  isAllowedMimeType,
  isAllowedFileSize,
} from "../utils/gridfsStorage";

const serializeDocument = (doc: IWorkerHealthDocument) => ({
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
});

export const uploadWorkerDocument = async (
  workerId: string,
  file: Express.Multer.File,
  documentType: string,
  description?: string
): Promise<Record<string, unknown>> => {
  if (!VALID_DOCUMENT_TYPES.includes(documentType as DocumentType)) {
    throw new AppError(
      `Invalid document type "${documentType}". Valid types: ${VALID_DOCUMENT_TYPES.join(", ")}`,
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
      (await import("../utils/gridfsStorage")).MAX_FILE_SIZE_BYTES / (1024 * 1024)
    );
    throw new AppError(`File too large. Maximum size is ${maxSizeMB} MB`, 400);
  }

  if (description !== undefined && description !== null) {
    const trimmed = description.trim();
    if (trimmed.length > 500) {
      throw new AppError("Description must be 500 characters or fewer", 400);
    }
    description = trimmed || undefined;
  }

  const uploadResult = await uploadFile(file.buffer, file.originalname, file.mimetype);

  const doc = await WorkerHealthDocument.create({
    workerId: new mongoose.Types.ObjectId(workerId),
    documentType,
    fileName: uploadResult.fileName,
    originalFileName: file.originalname,
    mimeType: uploadResult.mimeType,
    fileSize: uploadResult.fileSize,
    gridfsFileId: uploadResult.fileId,
    description: description || null,
  });

  return serializeDocument(doc);
};

export const listWorkerDocuments = async (
  workerId: string
): Promise<Record<string, unknown>[]> => {
  const docs = await WorkerHealthDocument.find({
    workerId: new mongoose.Types.ObjectId(workerId),
  }).sort({ createdAt: -1 });

  return docs.map(serializeDocument);
};

export const getWorkerDocumentById = async (
  documentId: string,
  workerId: string
): Promise<IWorkerHealthDocument> => {
  if (!mongoose.Types.ObjectId.isValid(documentId)) {
    throw new AppError("Invalid document ID", 400);
  }

  const doc = await WorkerHealthDocument.findById(documentId);

  if (!doc) {
    throw new AppError("Document not found", 404);
  }

  if (doc.workerId.toString() !== workerId) {
    throw new AppError("Access denied", 403);
  }

  return doc;
};

export const downloadWorkerDocument = async (
  documentId: string,
  workerId: string
) => {
  const doc = await getWorkerDocumentById(documentId, workerId);
  return downloadFile(doc.gridfsFileId);
};

export const deleteWorkerDocument = async (
  documentId: string,
  workerId: string
): Promise<void> => {
  const doc = await getWorkerDocumentById(documentId, workerId);

  await deleteFile(doc.gridfsFileId);
  await WorkerHealthDocument.findByIdAndDelete(doc._id);
};
