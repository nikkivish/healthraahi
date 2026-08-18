import { Router } from "express";
import {
  uploadDocumentsController,
  listDocumentsController,
  downloadDocumentController,
  deleteDocumentController,
} from "../controllers/clinicalRecordDocument.controller";
import { authenticate } from "../middleware/authenticate";
import { requireRole } from "../middleware/requireRole";
import { requireVerifiedDoctor } from "../middleware/requireVerifiedDoctor";
import { uploadMultiMiddleware, handleMulterError } from "../middleware/upload";

const router = Router();

router.post(
  "/:recordId",
  authenticate,
  requireRole("DOCTOR"),
  requireVerifiedDoctor,
  uploadMultiMiddleware,
  handleMulterError,
  uploadDocumentsController
);

router.get(
  "/record/:recordId",
  authenticate,
  listDocumentsController
);

router.get(
  "/:documentId/download",
  authenticate,
  downloadDocumentController
);

router.delete(
  "/:documentId",
  authenticate,
  requireRole("DOCTOR"),
  requireVerifiedDoctor,
  deleteDocumentController
);

export default router;
