import { Router } from "express";
import {
  createClinicalRecordController,
  getClinicalRecordByIdController,
  getDoctorAccessibleRecordsController,
  getWorkerClinicalRecordsController,
  updateClinicalRecordController,
} from "../controllers/clinicalRecord.controller";
import { authenticate } from "../middleware/authenticate";
import { requireRole } from "../middleware/requireRole";
import { requireVerifiedDoctor } from "../middleware/requireVerifiedDoctor";

const router = Router();

router.post(
  "/",
  authenticate,
  requireRole("DOCTOR"),
  requireVerifiedDoctor,
  createClinicalRecordController
);

router.get(
  "/me",
  authenticate,
  requireRole("WORKER"),
  getWorkerClinicalRecordsController
);

router.get(
  "/doctor-access",
  authenticate,
  requireRole("DOCTOR"),
  requireVerifiedDoctor,
  getDoctorAccessibleRecordsController
);

router.get(
  "/:recordId",
  authenticate,
  getClinicalRecordByIdController
);

router.patch(
  "/:recordId",
  authenticate,
  requireRole("DOCTOR"),
  requireVerifiedDoctor,
  updateClinicalRecordController
);

export default router;
