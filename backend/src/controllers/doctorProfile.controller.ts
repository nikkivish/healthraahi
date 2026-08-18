import { NextFunction, Request, Response } from "express";
import { AppError } from "../middleware/errorHandler";
import {
  createDoctorProfileForUser,
  getDoctorProfileById,
  getMyDoctorProfile,
  getPendingDoctorProfiles,
  linkDoctorToHospital,
  replaceDoctorProfileForUser,
  unlinkDoctorFromHospital,
  updateDoctorProfileForUser,
  updateDoctorVerificationStatus,
} from "../services/doctorProfile.service";

const rejectImmutableDoctorFields = (req: Request): void => {
  if (req.body && Object.prototype.hasOwnProperty.call(req.body, "userId")) {
    throw new AppError("userId cannot be set manually", 400);
  }

  if (req.body && Object.prototype.hasOwnProperty.call(req.body, "doctorId")) {
    throw new AppError("doctorId cannot be set manually", 400);
  }

  if (req.body && Object.prototype.hasOwnProperty.call(req.body, "verificationStatus")) {
    throw new AppError("verificationStatus cannot be set manually", 400);
  }

  if (req.body && Object.prototype.hasOwnProperty.call(req.body, "isVerified")) {
    throw new AppError("isVerified cannot be set manually", 400);
  }
};

export const createDoctorProfile = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: "Authentication required",
      });
      return;
    }

    rejectImmutableDoctorFields(req);

    const profile = await createDoctorProfileForUser(req.user.id, req.body || {});

    res.status(201).json({
      success: true,
      message: "Doctor profile created successfully",
      data: { profile },
    });
  } catch (error) {
    next(error);
  }
};

export const getDoctorProfile = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: "Authentication required",
      });
      return;
    }

    const profile = await getMyDoctorProfile(req.user.id);

    res.status(200).json({
      success: true,
      message: "Doctor profile retrieved successfully",
      data: { profile },
    });
  } catch (error) {
    next(error);
  }
};

export const replaceDoctorProfile = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: "Authentication required",
      });
      return;
    }

    rejectImmutableDoctorFields(req);

    const profile = await replaceDoctorProfileForUser(req.user.id, req.body || {});

    res.status(200).json({
      success: true,
      message: "Doctor profile replaced successfully",
      data: { profile },
    });
  } catch (error) {
    next(error);
  }
};

export const updateDoctorProfile = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: "Authentication required",
      });
      return;
    }

    rejectImmutableDoctorFields(req);

    const profile = await updateDoctorProfileForUser(req.user.id, req.body || {});

    res.status(200).json({
      success: true,
      message: "Doctor profile updated successfully",
      data: { profile },
    });
  } catch (error) {
    next(error);
  }
};

export const listPendingDoctorProfiles = async (
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const profiles = await getPendingDoctorProfiles();

    res.status(200).json({
      success: true,
      message: "Pending doctor profiles retrieved successfully",
      data: { profiles },
    });
  } catch (error) {
    next(error);
  }
};

export const verifyDoctorProfile = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const doctorId = Array.isArray(req.params.doctorId)
      ? req.params.doctorId[0]
      : req.params.doctorId;
    const statusValue = Array.isArray(req.body?.status)
      ? req.body.status[0]
      : req.body?.status;
    const reasonValue = Array.isArray(req.body?.reason)
      ? req.body.reason[0]
      : req.body?.reason;

    if (!doctorId) {
      throw new AppError("Doctor ID is required", 400);
    }

    if (
      typeof statusValue !== "string" ||
      !["PENDING", "VERIFIED", "REJECTED"].includes(statusValue)
    ) {
      throw new AppError("Invalid verification status", 400);
    }

    const profile = await updateDoctorVerificationStatus(
      doctorId,
      statusValue as "PENDING" | "VERIFIED" | "REJECTED",
      typeof reasonValue === "string" ? reasonValue : undefined,
      req.user?.id
    );

    res.status(200).json({
      success: true,
      message: `Doctor verification status updated to ${statusValue}`,
      data: { profile },
    });
  } catch (error) {
    next(error);
  }
};

export const getDoctorProfileByDoctorId = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const doctorId = Array.isArray(req.params.doctorId)
      ? req.params.doctorId[0]
      : req.params.doctorId;

    if (!doctorId) {
      throw new AppError("Doctor ID is required", 400);
    }

    const profile = await getDoctorProfileById(doctorId);

    res.status(200).json({
      success: true,
      message: "Doctor profile retrieved successfully",
      data: { profile },
    });
  } catch (error) {
    next(error);
  }
};

export const linkDoctorHospital = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: "Authentication required",
      });
      return;
    }

    const hospitalId = Array.isArray(req.body?.hospitalId)
      ? req.body.hospitalId[0]
      : req.body?.hospitalId;

    if (!hospitalId || typeof hospitalId !== "string" || !hospitalId.trim()) {
      throw new AppError("Hospital ID is required", 400);
    }

    const profile = await linkDoctorToHospital(req.user.id, hospitalId);

    res.status(200).json({
      success: true,
      message: "Doctor hospital association updated successfully",
      data: { profile },
    });
  } catch (error) {
    next(error);
  }
};

export const unlinkDoctorHospital = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({
        success: false,
        message: "Authentication required",
      });
      return;
    }

    const profile = await unlinkDoctorFromHospital(req.user.id);

    res.status(200).json({
      success: true,
      message: "Doctor hospital association removed successfully",
      data: { profile },
    });
  } catch (error) {
    next(error);
  }
};
