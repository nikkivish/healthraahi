import { Router } from "express";
import adminRoutes from "./admin.routes";
import authRoutes from "./auth.routes";
import campRoutes from "./camp.routes";
import clinicalRecordRoutes from "./clinicalRecord.routes";
import clinicalRecordDocumentRoutes from "./clinicalRecordDocument.routes";
import consentRoutes from "./consent.routes";
import doctorRoutes from "./doctor.routes";
import doctorVerificationDocumentRoutes from "./doctorVerificationDocument.routes";
import healthRoutes from "./health.routes";
import hospitalRoutes from "./hospital.routes";
import workerDocumentRoutes from "./workerDocument.routes";
import workerProfileRoutes from "./workerProfile.routes";

const router = Router();

router.use("/health", healthRoutes);
router.use("/auth", authRoutes);
router.use("/workers", workerProfileRoutes);
router.use("/worker-documents", workerDocumentRoutes);
router.use("/doctors", doctorRoutes);
router.use("/doctor-verification-documents", doctorVerificationDocumentRoutes);
router.use("/hospitals", hospitalRoutes);
router.use("/consents", consentRoutes);
router.use("/clinical-records", clinicalRecordRoutes);
router.use("/clinical-record-documents", clinicalRecordDocumentRoutes);
router.use("/camps", campRoutes);
router.use("/admin", adminRoutes);

export default router;
