import { AuditLog, AuditAction, AuditResult } from "../models/AuditLog";
import { UserRole } from "../models/User";

interface LogAuditInput {
  actorUserId: string;
  actorRole: UserRole;
  action: AuditAction;
  resourceType: "CONSENT" | "CLINICAL_RECORD" | "CAMP" | "DOCTOR_VERIFICATION";
  resourceId: string;
  result: AuditResult;
  details?: Record<string, unknown>;
}

export const logAuditEvent = async (input: LogAuditInput): Promise<void> => {
  try {
    await AuditLog.create({
      actorUserId: input.actorUserId,
      actorRole: input.actorRole,
      action: input.action,
      resourceType: input.resourceType,
      resourceId: input.resourceId,
      result: input.result,
      ...(input.details ? { details: input.details } : {}),
    });
  } catch (error) {
    console.error("Audit logging failed:", error);
  }
};
