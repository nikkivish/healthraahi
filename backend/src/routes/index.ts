import { Router } from "express";
import adminRoutes from "./admin.routes";
import authRoutes from "./auth.routes";
import campRoutes from "./camp.routes";
import clinicalRecordRoutes from "./clinicalRecord.routes";
import consentRoutes from "./consent.routes";
import doctorRoutes from "./doctor.routes";
import healthRoutes from "./health.routes";
import hospitalRoutes from "./hospital.routes";
import workerProfileRoutes from "./workerProfile.routes";

const router = Router();

router.use("/health", healthRoutes);
router.use("/auth", authRoutes);
router.use("/workers", workerProfileRoutes);
router.use("/doctors", doctorRoutes);
router.use("/hospitals", hospitalRoutes);
router.use("/consents", consentRoutes);
router.use("/clinical-records", clinicalRecordRoutes);
router.use("/camps", campRoutes);
router.use("/admin", adminRoutes);

export default router;
