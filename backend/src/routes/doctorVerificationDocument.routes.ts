import { Router } from "express";
import {
  uploadVerificationDocument,
  listMyVerificationDocuments,
  downloadMyVerificationDocument,
  deleteMyVerificationDocument,
  replaceMyVerificationDocument,
  adminListDoctorDocuments,
  adminDownloadDoctorDocument,
  adminUpdateDocumentStatus,
} from "../controllers/doctorVerificationDocument.controller";
import { authenticate } from "../middleware/authenticate";
import { requireRole } from "../middleware/requireRole";
import { uploadMiddleware, handleMulterError } from "../middleware/upload";

const router = Router();

router.post(
  "/",
  authenticate,
  requireRole("DOCTOR"),
  uploadMiddleware,
  handleMulterError,
  uploadVerificationDocument
);

router.get(
  "/me",
  authenticate,
  requireRole("DOCTOR"),
  listMyVerificationDocuments
);

router.get(
  "/:documentId/download",
  authenticate,
  requireRole("DOCTOR"),
  downloadMyVerificationDocument
);

router.put(
  "/:documentId/replace",
  authenticate,
  requireRole("DOCTOR"),
  uploadMiddleware,
  handleMulterError,
  replaceMyVerificationDocument
);

router.delete(
  "/:documentId",
  authenticate,
  requireRole("DOCTOR"),
  deleteMyVerificationDocument
);

router.get(
  "/admin/:doctorUserId",
  authenticate,
  requireRole("ADMIN"),
  adminListDoctorDocuments
);

router.get(
  "/admin/doc/:documentId/download",
  authenticate,
  requireRole("ADMIN"),
  adminDownloadDoctorDocument
);

router.patch(
  "/admin/doc/:documentId/status",
  authenticate,
  requireRole("ADMIN"),
  adminUpdateDocumentStatus
);

export default router;
