import { Router } from "express";
import {
  createWorkerProfile,
  getWorkerProfile,
  lookupWorkerIdentityByHealthId,
  replaceWorkerProfile,
  updateWorkerProfile,
} from "../controllers/workerProfile.controller";
import { authenticate } from "../middleware/authenticate";
import { requireRole } from "../middleware/requireRole";

const router = Router();

router.post(
  "/profile",
  authenticate,
  requireRole("WORKER"),
  createWorkerProfile
);

router.get(
  "/profile/me",
  authenticate,
  requireRole("WORKER"),
  getWorkerProfile
);

router.put(
  "/profile/me",
  authenticate,
  requireRole("WORKER"),
  replaceWorkerProfile
);

router.patch(
  "/profile/me",
  authenticate,
  requireRole("WORKER"),
  updateWorkerProfile
);

router.get(
  "/lookup/:healthId",
  authenticate,
  requireRole("DOCTOR", "ADMIN"),
  lookupWorkerIdentityByHealthId
);

export default router;
