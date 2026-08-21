import { Router } from "express";
import {
  listActiveCampsController,
  getCampByIdController,
  registerForCampController,
  listMyRegistrationsController,
  cancelRegistrationController,
  listCampRegistrationsController,
  listAllCampsController,
  createCampController,
  updateCampController,
  cancelCampController,
  assignDoctorToCampController,
  adminListCampRegistrationsController,
} from "../controllers/camp.controller";
import { authenticate } from "../middleware/authenticate";
import { requireRole } from "../middleware/requireRole";

const router = Router();

// ─── Admin routes (must come before /:campId) ──────────────────────────────

router.get(
  "/admin/all",
  authenticate,
  requireRole("ADMIN"),
  listAllCampsController
);

router.post(
  "/admin/create",
  authenticate,
  requireRole("ADMIN"),
  createCampController
);

router.patch(
  "/admin/:campId",
  authenticate,
  requireRole("ADMIN"),
  updateCampController
);

router.patch(
  "/admin/:campId/cancel",
  authenticate,
  requireRole("ADMIN"),
  cancelCampController
);

router.post(
  "/admin/:campId/assign-doctor",
  authenticate,
  requireRole("ADMIN"),
  assignDoctorToCampController
);

router.get(
  "/admin/:campId/registrations",
  authenticate,
  requireRole("ADMIN"),
  adminListCampRegistrationsController
);

// ─── Worker routes (must come before /:campId) ──────────────────────────────

router.get(
  "/my-registrations",
  authenticate,
  requireRole("WORKER"),
  listMyRegistrationsController
);

router.patch(
  "/my-registrations/:regId/cancel",
  authenticate,
  requireRole("WORKER"),
  cancelRegistrationController
);

// ─── Public routes ──────────────────────────────────────────────────────────

router.get("/", listActiveCampsController);

router.get("/:campId", getCampByIdController);

// ─── Authenticated routes using /:campId ────────────────────────────────────

router.post(
  "/:campId/register",
  authenticate,
  requireRole("WORKER"),
  registerForCampController
);

router.get(
  "/:campId/registrations",
  authenticate,
  requireRole("DOCTOR", "ADMIN"),
  listCampRegistrationsController
);

export default router;
