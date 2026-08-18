import { Router } from "express";
import {
  uploadDocument,
  listMyDocuments,
  getDocumentById,
  downloadDocument,
  deleteDocument,
} from "../controllers/workerDocument.controller";
import { authenticate } from "../middleware/authenticate";
import { requireRole } from "../middleware/requireRole";
import { uploadMiddleware, handleMulterError } from "../middleware/upload";

const router = Router();

router.post(
  "/",
  authenticate,
  requireRole("WORKER"),
  uploadMiddleware,
  handleMulterError,
  uploadDocument
);

router.get(
  "/me",
  authenticate,
  requireRole("WORKER"),
  listMyDocuments
);

router.get(
  "/:documentId",
  authenticate,
  requireRole("WORKER"),
  getDocumentById
);

router.get(
  "/:documentId/download",
  authenticate,
  requireRole("WORKER"),
  downloadDocument
);

router.delete(
  "/:documentId",
  authenticate,
  requireRole("WORKER"),
  deleteDocument
);

export default router;
