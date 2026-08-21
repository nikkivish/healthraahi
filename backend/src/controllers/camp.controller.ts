import { NextFunction, Request, Response } from "express";
import { AppError } from "../middleware/errorHandler";
import {
  listActiveCamps,
  getCampById,
  registerForCamp,
  listMyRegistrations,
  cancelRegistration,
  listCampRegistrations,
  listAllCamps,
  createCamp,
  updateCamp,
  cancelCamp,
  assignDoctorToCamp,
  adminListCampRegistrations,
} from "../services/camp.service";
import {
  isSmsConfigured,
  getSmsDiagnostics,
  sendCampCreationSms,
} from "../services/sms.service";
import { MedicalCamp } from "../models/MedicalCamp";

const normalizeString = (value: unknown): string | undefined => {
  if (Array.isArray(value)) {
    return typeof value[0] === "string" ? value[0] : undefined;
  }
  return typeof value === "string" ? value : undefined;
};

// ─── Public: List active camps ──────────────────────────────────────────────

export const listActiveCampsController = async (
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const camps = await listActiveCamps();
    res.status(200).json({
      success: true,
      message: "Camps retrieved successfully",
      data: { camps },
    });
  } catch (error) {
    next(error);
  }
};

// ─── Public: Get camp by ID ────────────────────────────────────────────────

export const getCampByIdController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const campId = normalizeString(req.params.campId);
    if (!campId) {
      throw new AppError("Camp ID is required", 400);
    }

    const camp = await getCampById(campId);
    res.status(200).json({
      success: true,
      message: "Camp retrieved successfully",
      data: { camp },
    });
  } catch (error) {
    next(error);
  }
};

// ─── Worker: Register for camp ──────────────────────────────────────────────

export const registerForCampController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      res
        .status(401)
        .json({ success: false, message: "Authentication required" });
      return;
    }

    if (req.user.role !== "WORKER") {
      res
        .status(403)
        .json({ success: false, message: "Only workers can register for camps" });
      return;
    }

    const campId = normalizeString(req.params.campId);
    if (!campId) {
      throw new AppError("Camp ID is required", 400);
    }

    const timeSlotIndex = Array.isArray(req.body.timeSlotIndex)
      ? Number(req.body.timeSlotIndex[0])
      : Number(req.body.timeSlotIndex);

    const healthConcerns = normalizeString(req.body.healthConcerns);

    const registration = await registerForCamp(
      req.user.id,
      campId,
      timeSlotIndex,
      healthConcerns
    );

    res.status(201).json({
      success: true,
      message: "Registration successful",
      data: { registration },
    });
  } catch (error) {
    next(error);
  }
};

// ─── Worker: My registrations ───────────────────────────────────────────────

export const listMyRegistrationsController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      res
        .status(401)
        .json({ success: false, message: "Authentication required" });
      return;
    }

    if (req.user.role !== "WORKER") {
      res
        .status(403)
        .json({ success: false, message: "Only workers can view their registrations" });
      return;
    }

    const registrations = await listMyRegistrations(req.user.id);
    res.status(200).json({
      success: true,
      message: "Registrations retrieved successfully",
      data: { registrations },
    });
  } catch (error) {
    next(error);
  }
};

// ─── Worker: Cancel registration ────────────────────────────────────────────

export const cancelRegistrationController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      res
        .status(401)
        .json({ success: false, message: "Authentication required" });
      return;
    }

    if (req.user.role !== "WORKER") {
      res
        .status(403)
        .json({ success: false, message: "Only workers can cancel their registrations" });
      return;
    }

    const regId = normalizeString(req.params.regId);
    if (!regId) {
      throw new AppError("Registration ID is required", 400);
    }

    const registration = await cancelRegistration(req.user.id, regId);
    res.status(200).json({
      success: true,
      message: "Registration cancelled successfully",
      data: { registration },
    });
  } catch (error) {
    next(error);
  }
};

// ─── Doctor: List registered workers for assigned camp ──────────────────────

export const listCampRegistrationsController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      res
        .status(401)
        .json({ success: false, message: "Authentication required" });
      return;
    }

    if (req.user.role !== "DOCTOR" && req.user.role !== "ADMIN") {
      res
        .status(403)
        .json({ success: false, message: "Insufficient permissions" });
      return;
    }

    const campId = normalizeString(req.params.campId);
    if (!campId) {
      throw new AppError("Camp ID is required", 400);
    }

    const registrations = await listCampRegistrations(req.user.id, campId);
    res.status(200).json({
      success: true,
      message: "Camp registrations retrieved successfully",
      data: { registrations },
    });
  } catch (error) {
    next(error);
  }
};

// ─── Admin: List all camps ──────────────────────────────────────────────────

export const listAllCampsController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      res
        .status(401)
        .json({ success: false, message: "Authentication required" });
      return;
    }

    if (req.user.role !== "ADMIN") {
      res
        .status(403)
        .json({ success: false, message: "Admin access required" });
      return;
    }

    const camps = await listAllCamps();
    res.status(200).json({
      success: true,
      message: "Camps retrieved successfully",
      data: { camps },
    });
  } catch (error) {
    next(error);
  }
};

// ─── Admin: Create camp ─────────────────────────────────────────────────────

export const createCampController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      res
        .status(401)
        .json({ success: false, message: "Authentication required" });
      return;
    }

    if (req.user.role !== "ADMIN") {
      res
        .status(403)
        .json({ success: false, message: "Admin access required" });
      return;
    }

    const camp = await createCamp(req.user.id, {
      name: normalizeString(req.body.name) || "",
      date: normalizeString(req.body.date) || "",
      timeSlots: Array.isArray(req.body.timeSlots)
        ? req.body.timeSlots
        : [],
      location: normalizeString(req.body.location) || "",
      city: normalizeString(req.body.city) || "",
      specialties: Array.isArray(req.body.specialties)
        ? req.body.specialties
        : [],
      feeType: normalizeString(req.body.feeType) as "FREE" | "PAID" | undefined,
      description: normalizeString(req.body.description) || "",
      organizer: normalizeString(req.body.organizer) || "",
    });

    res.status(201).json({
      success: true,
      message: "Camp created successfully",
      data: { camp },
    });
  } catch (error) {
    next(error);
  }
};

// ─── Admin: Edit camp ───────────────────────────────────────────────────────

export const updateCampController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      res
        .status(401)
        .json({ success: false, message: "Authentication required" });
      return;
    }

    if (req.user.role !== "ADMIN") {
      res
        .status(403)
        .json({ success: false, message: "Admin access required" });
      return;
    }

    const campId = normalizeString(req.params.campId);
    if (!campId) {
      throw new AppError("Camp ID is required", 400);
    }

    const camp = await updateCamp(req.user.id, campId, {
      name: normalizeString(req.body.name),
      date: normalizeString(req.body.date),
      timeSlots: Array.isArray(req.body.timeSlots)
        ? req.body.timeSlots
        : undefined,
      location: normalizeString(req.body.location),
      city: normalizeString(req.body.city),
      specialties: Array.isArray(req.body.specialties)
        ? req.body.specialties
        : undefined,
      feeType: normalizeString(req.body.feeType) as
        | "FREE"
        | "PAID"
        | undefined,
      description: normalizeString(req.body.description),
      organizer: normalizeString(req.body.organizer),
    });

    res.status(200).json({
      success: true,
      message: "Camp updated successfully",
      data: { camp },
    });
  } catch (error) {
    next(error);
  }
};

// ─── Admin: Cancel camp ─────────────────────────────────────────────────────

export const cancelCampController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      res
        .status(401)
        .json({ success: false, message: "Authentication required" });
      return;
    }

    if (req.user.role !== "ADMIN") {
      res
        .status(403)
        .json({ success: false, message: "Admin access required" });
      return;
    }

    const campId = normalizeString(req.params.campId);
    if (!campId) {
      throw new AppError("Camp ID is required", 400);
    }

    const camp = await cancelCamp(req.user.id, campId);
    res.status(200).json({
      success: true,
      message: "Camp cancelled successfully",
      data: { camp },
    });
  } catch (error) {
    next(error);
  }
};

// ─── Admin: Assign doctor to camp ───────────────────────────────────────────

export const assignDoctorToCampController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      res
        .status(401)
        .json({ success: false, message: "Authentication required" });
      return;
    }

    if (req.user.role !== "ADMIN") {
      res
        .status(403)
        .json({ success: false, message: "Admin access required" });
      return;
    }

    const campId = normalizeString(req.params.campId);
    const doctorId = normalizeString(req.body.doctorId);

    if (!campId) {
      throw new AppError("Camp ID is required", 400);
    }
    if (!doctorId) {
      throw new AppError("Doctor ID is required", 400);
    }

    const result = await assignDoctorToCamp(req.user.id, campId, doctorId);
    res.status(201).json({
      success: true,
      message: "Doctor assigned to camp successfully",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

// ─── Admin: List camp registrations ─────────────────────────────────────────

export const adminListCampRegistrationsController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      res
        .status(401)
        .json({ success: false, message: "Authentication required" });
      return;
    }

    if (req.user.role !== "ADMIN") {
      res
        .status(403)
        .json({ success: false, message: "Admin access required" });
      return;
    }

    const campId = normalizeString(req.params.campId);
    if (!campId) {
      throw new AppError("Camp ID is required", 400);
    }

    const registrations = await adminListCampRegistrations(campId);
    res.status(200).json({
      success: true,
      message: "Camp registrations retrieved successfully",
      data: { registrations },
    });
  } catch (error) {
    next(error);
  }
};

// ─── Admin: SMS diagnostic status ────────────────────────────────────────────

export const campSmsStatusController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      res
        .status(401)
        .json({ success: false, message: "Authentication required" });
      return;
    }

    if (req.user.role !== "ADMIN") {
      res
        .status(403)
        .json({ success: false, message: "Admin access required" });
      return;
    }

    const diagnostics = await getSmsDiagnostics();
    res.status(200).json({
      success: true,
      message: "SMS status retrieved successfully",
      data: diagnostics,
    });
  } catch (error) {
    next(error);
  }
};

// ─── Admin: Resend SMS for a camp ────────────────────────────────────────────

export const resendCampSmsController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      res
        .status(401)
        .json({ success: false, message: "Authentication required" });
      return;
    }

    if (req.user.role !== "ADMIN") {
      res
        .status(403)
        .json({ success: false, message: "Admin access required" });
      return;
    }

    if (!isSmsConfigured()) {
      res.status(400).json({
        success: false,
        message: "MSG91 SMS provider is not configured. Please set MSG91_AUTH_KEY, MSG91_FLOW_ID, and MSG91_SENDER_ID environment variables.",
      });
      return;
    }

    const campId = normalizeString(req.params.campId);
    if (!campId) {
      throw new AppError("Camp ID is required", 400);
    }

    const camp = await MedicalCamp.findById(campId);
    if (!camp) {
      throw new AppError("Camp not found", 404);
    }

    const smsResult = await sendCampCreationSms(camp);

    res.status(200).json({
      success: true,
      message: "SMS batch triggered",
      data: {
        campName: camp.name,
        smsResult,
      },
    });
  } catch (error) {
    next(error);
  }
};
