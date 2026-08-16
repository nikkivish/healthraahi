import { Router } from "express";
import {
  createDoctorProfile,
  getDoctorProfile,
  getDoctorProfileByDoctorId,
  linkDoctorHospital,
  listPendingDoctorProfiles,
  replaceDoctorProfile,
  unlinkDoctorHospital,
  updateDoctorProfile,
  verifyDoctorProfile,
} from "../controllers/doctorProfile.controller";
import { authenticate } from "../middleware/authenticate";
import { requireRole } from "../middleware/requireRole";
import { requireVerifiedDoctor } from "../middleware/requireVerifiedDoctor";

const router = Router();

router.post(
  "/profile",
  authenticate,
  requireRole("DOCTOR"),
  createDoctorProfile
);

router.get(
  "/profile/me",
  authenticate,
  requireRole("DOCTOR"),
  getDoctorProfile
);

router.put(
  "/profile/me",
  authenticate,
  requireRole("DOCTOR"),
  replaceDoctorProfile
);

router.patch(
  "/profile/me",
  authenticate,
  requireRole("DOCTOR"),
  updateDoctorProfile
);

router.patch(
  "/profile/me/hospital",
  authenticate,
  requireRole("DOCTOR"),
  requireVerifiedDoctor,
  linkDoctorHospital
);

router.delete(
  "/profile/me/hospital",
  authenticate,
  requireRole("DOCTOR"),
  requireVerifiedDoctor,
  unlinkDoctorHospital
);

router.get(
  "/pending",
  authenticate,
  requireRole("ADMIN"),
  listPendingDoctorProfiles
);

router.get(
  "/:doctorId",
  authenticate,
  requireRole("ADMIN"),
  getDoctorProfileByDoctorId
);

router.patch(
  "/:doctorId/verify",
  authenticate,
  requireRole("ADMIN"),
  verifyDoctorProfile
);

router.get(
  "/verified/me",
  authenticate,
  requireRole("DOCTOR"),
  requireVerifiedDoctor,
  getDoctorProfile
);

export default router;
