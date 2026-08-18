import mongoose from "mongoose";
import multer from "multer";
import { AppError } from "../middleware/errorHandler";
import {
  isAllowedMimeType,
  isAllowedFileSize,
  MAX_FILE_SIZE_BYTES,
  ALLOWED_MIME_TYPES,
} from "../utils/gridfsStorage";

const ALLOWED_MIME_SET = new Set(ALLOWED_MIME_TYPES);

const storage = multer.memoryStorage();

export const uploadMiddleware = multer({
  storage,
  limits: {
    fileSize: MAX_FILE_SIZE_BYTES,
  },
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED_MIME_SET.has(file.mimetype)) {
      cb(
        new AppError(
          `Unsupported file type "${file.mimetype}". Allowed: ${ALLOWED_MIME_TYPES.join(", ")}`,
          400
        )
      );
      return;
    }
    cb(null, true);
  },
}).single("file");

export function handleMulterError(
  err: unknown,
  _req: Express.Request,
  res: Express.Response,
  next: Express.NextFunction
): void {
  if (err instanceof multer.MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      const maxSizeMB = Math.round(MAX_FILE_SIZE_BYTES / (1024 * 1024));
      next(
        new AppError(`File too large. Maximum size is ${maxSizeMB} MB`, 400)
      );
      return;
    }
    next(new AppError(`Upload error: ${err.message}`, 400));
    return;
  }
  next(err);
}

const MAX_FILES = 10;

export const uploadMultiMiddleware = multer({
  storage,
  limits: {
    fileSize: MAX_FILE_SIZE_BYTES,
    files: MAX_FILES,
  },
  fileFilter: (_req, file, cb) => {
    if (!ALLOWED_MIME_SET.has(file.mimetype)) {
      cb(
        new AppError(
          `Unsupported file type "${file.mimetype}". Allowed: ${ALLOWED_MIME_TYPES.join(", ")}`,
          400
        )
      );
      return;
    }
    cb(null, true);
  },
}).array("files", MAX_FILES);
