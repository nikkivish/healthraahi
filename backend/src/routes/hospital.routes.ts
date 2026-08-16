import { Router } from "express";
import {
  createHospitalController,
  getHospitalByIdController,
  getHospitalsController,
} from "../controllers/hospital.controller";
import { authenticate } from "../middleware/authenticate";
import { requireRole } from "../middleware/requireRole";

const router = Router();

router.post(
  "/",
  authenticate,
  requireRole("ADMIN"),
  createHospitalController
);

router.get(
  "/",
  authenticate,
  getHospitalsController
);

router.get(
  "/:hospitalId",
  authenticate,
  getHospitalByIdController
);

export default router;
