import { NextFunction, Request, Response } from "express";
import { AppError } from "../middleware/errorHandler";
import { AuditAction } from "../models/AuditLog";
import { UserRole } from "../models/User";
import { getAdminOverview, getAuditLogById, listAuditLogs } from "../services/admin.service";

const normalizeQueryString = (value: unknown): string | undefined => {
  if (Array.isArray(value)) {
    return typeof value[0] === "string" ? value[0] : undefined;
  }

  return typeof value === "string" ? value : undefined;
};

const isUserRole = (value: string | undefined): value is UserRole =>
  value === "WORKER" || value === "DOCTOR" || value === "ADMIN";

const isAuditAction = (value: string | undefined): value is AuditAction =>
  value === "CONSENT_REQUESTED" ||
  value === "CONSENT_APPROVED" ||
  value === "CONSENT_REJECTED" ||
  value === "CONSENT_REVOKED" ||
  value === "CLINICAL_RECORD_CREATED" ||
  value === "CLINICAL_RECORD_UPDATED" ||
  value === "CLINICAL_RECORD_VIEWED" ||
  value === "CONSENT_DENIED" ||
  value === "CLINICAL_RECORD_DENIED" ||
  value === "CAMP_REGISTERED" ||
  value === "CAMP_REGISTRATION_CANCELLED" ||
  value === "CAMP_CREATED" ||
  value === "CAMP_UPDATED" ||
  value === "CAMP_CANCELLED";

const isValidAuditResourceType = (
  value: string | undefined
): value is "CONSENT" | "CLINICAL_RECORD" | "CAMP" =>
  value === "CONSENT" || value === "CLINICAL_RECORD" || value === "CAMP";

const isValidAuditResult = (
  value: string | undefined
): value is "SUCCESS" | "DENIED" | "FAILED" =>
  value === "SUCCESS" || value === "DENIED" || value === "FAILED";

export const getAuditLogsController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: "Authentication required" });
      return;
    }

    if (req.user.role !== "ADMIN") {
      res.status(403).json({ success: false, message: "Admin access required" });
      return;
    }

    const actorRoleParam = normalizeQueryString(req.query.actorRole);
    const actionParam = normalizeQueryString(req.query.action);
    const resourceTypeParam = normalizeQueryString(req.query.resourceType);
    const resultParam = normalizeQueryString(req.query.result);

    const filters: {
      actorUserId?: string;
      actorRole?: UserRole;
      action?: AuditAction;
     resourceType?: "CONSENT" | "CLINICAL_RECORD" | "CAMP";
      resourceId?: string;
      result?: "SUCCESS" | "DENIED" | "FAILED";
    } = {
      actorUserId: normalizeQueryString(req.query.actorUserId),
      actorRole: isUserRole(actorRoleParam) ? actorRoleParam : undefined,
      action: isAuditAction(actionParam) ? actionParam : undefined,
      resourceType: isValidAuditResourceType(resourceTypeParam)
        ? resourceTypeParam
        : undefined,
      resourceId: normalizeQueryString(req.query.resourceId),
      result: isValidAuditResult(resultParam) ? resultParam : undefined,
    };

    const limit = Number(
      Array.isArray(req.query.limit) ? req.query.limit[0] : req.query.limit ?? 50
    );
    const skip = Number(
      Array.isArray(req.query.skip) ? req.query.skip[0] : req.query.skip ?? 0
    );

    const auditLogs = await listAuditLogs(filters, {
      limit: Number.isFinite(limit) ? limit : 50,
      skip: Number.isFinite(skip) ? skip : 0,
    });

    res.status(200).json({
      success: true,
      message: "Audit logs retrieved successfully",
      data: auditLogs,
    });
  } catch (error) {
    next(error);
  }
};

export const getAuditLogByIdController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: "Authentication required" });
      return;
    }

    if (req.user.role !== "ADMIN") {
      res.status(403).json({ success: false, message: "Admin access required" });
      return;
    }

    const auditLogId = Array.isArray(req.params.auditLogId)
      ? req.params.auditLogId[0]
      : req.params.auditLogId;

    if (!auditLogId) {
      throw new AppError("Audit log ID is required", 400);
    }

    const auditLog = await getAuditLogById(auditLogId);

    res.status(200).json({
      success: true,
      message: "Audit log retrieved successfully",
      data: { auditLog },
    });
  } catch (error) {
    next(error);
  }
};

export const getAdminOverviewController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: "Authentication required" });
      return;
    }

    if (req.user.role !== "ADMIN") {
      res.status(403).json({ success: false, message: "Admin access required" });
      return;
    }

    const overview = await getAdminOverview();

    res.status(200).json({
      success: true,
      message: "Admin overview retrieved successfully",
      data: { overview },
    });
  } catch (error) {
    next(error);
  }
};
