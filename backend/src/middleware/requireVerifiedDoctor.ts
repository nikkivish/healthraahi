import { NextFunction, Request, Response } from "express";
import { DoctorProfile } from "../models/DoctorProfile";
import { AppError } from "./errorHandler";

export const requireVerifiedDoctor = async (
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError("Authentication required", 401);
    }

    if (req.user.role !== "DOCTOR") {
      throw new AppError("Doctor access required", 403);
    }

    const doctorProfile = await DoctorProfile.findOne({ userId: req.user.id });

    if (!doctorProfile) {
      throw new AppError("Doctor profile not found", 404);
    }

    if (doctorProfile.verificationStatus !== "VERIFIED" || !doctorProfile.isVerified) {
      throw new AppError("Doctor account is not verified", 403);
    }

    next();
  } catch (error) {
    next(error);
  }
};
