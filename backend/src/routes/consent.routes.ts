import { Router } from "express";
import {
  approveConsentController,
  getConsentByIdController,
  getMyConsentsController,
  rejectConsentController,
  requestConsentController,
  revokeConsentController,
} from "../controllers/consent.controller";
import { authenticate } from "../middleware/authenticate";
import { requireRole } from "../middleware/requireRole";

const router = Router();

router.post(
  "/",
  authenticate,
  requireRole("DOCTOR"),
  requestConsentController
);

router.get(
  "/me",
  authenticate,
  getMyConsentsController
);

router.get(
  "/:consentId",
  authenticate,
  getConsentByIdController
);

router.patch(
  "/:consentId/approve",
  authenticate,
  requireRole("WORKER"),
  approveConsentController
);

router.patch(
  "/:consentId/reject",
  authenticate,
  requireRole("WORKER"),
  rejectConsentController
);

router.patch(
  "/:consentId/revoke",
  authenticate,
  requireRole("WORKER"),
  revokeConsentController
);

export default router;
