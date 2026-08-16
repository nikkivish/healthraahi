import { Router } from "express";
import {
  getAdminOverviewController,
  getAuditLogByIdController,
  getAuditLogsController,
} from "../controllers/admin.controller";
import { authenticate } from "../middleware/authenticate";
import { requireRole } from "../middleware/requireRole";

const router = Router();

router.use(authenticate);
router.use(requireRole("ADMIN"));

router.get("/overview", getAdminOverviewController);
router.get("/audit-logs", getAuditLogsController);
router.get("/audit-logs/:auditLogId", getAuditLogByIdController);

export default router;
