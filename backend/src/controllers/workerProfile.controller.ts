import mongoose from "mongoose";
import { NextFunction, Request, Response } from "express";
import { AppError } from "../middleware/errorHandler";
import { Consent } from "../models/Consent";
import { DoctorProfile } from "../models/DoctorProfile";
import { User } from "../models/User";
import { isConsentActiveForAccess } from "../services/consent.service";
import {
  createWorkerProfileForUser,
  getMyWorkerProfile,
  getWorkerProfileByUserId,
  lookupWorkerByHealthId,
  replaceWorkerProfileForUser,
  updateWorkerProfileForUser,
} from "../services/workerProfile.service";

const rejectImmutableFields = (req: Request): void => {
  if (
    req.body &&
    Object.prototype.hasOwnProperty.call(req.body, "userId")
  ) {
    throw new AppError("userId cannot be set manually", 400);
  }

  if (
    req.body &&
    Object.prototype.hasOwnProperty.call(req.body, "healthId")
  ) {
    throw new AppError("healthId cannot be set manually", 400);
  }
};

export const createWorkerProfile = async (
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

    rejectImmutableFields(req);

    const profile = await createWorkerProfileForUser(req.user.id, req.body || {});

    res.status(201).json({
      success: true,
      message: "Worker profile created successfully",
      data: { profile },
    });
  } catch (error) {
    next(error);
  }
};

export const getWorkerProfile = async (
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

    const profile = await getMyWorkerProfile(req.user.id);

    res.status(200).json({
      success: true,
      message: "Worker profile retrieved successfully",
      data: { profile },
    });
  } catch (error) {
    next(error);
  }
};

export const lookupWorkerIdentityByHealthId = async (
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

    if (req.user.role !== "DOCTOR" && req.user.role !== "ADMIN") {
      res.status(403).json({
        success: false,
        message: "Doctor or admin access required",
      });
      return;
    }

    const healthId = Array.isArray(req.params.healthId)
      ? req.params.healthId[0]
      : req.params.healthId;

    const worker = await lookupWorkerByHealthId(healthId || "");

    res.status(200).json({
      success: true,
      message: "Worker identified successfully",
      data: { worker },
    });
  } catch (error) {
    next(error);
  }
};

export const getWorkerProfileForDoctor = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: "Authentication required" });
      return;
    }

    if (req.user.role !== "DOCTOR") {
      res.status(403).json({ success: false, message: "Doctor access required" });
      return;
    }

    const doctorProfile = await DoctorProfile.findOne({ userId: req.user.id });
    if (!doctorProfile || doctorProfile.verificationStatus !== "VERIFIED" || !doctorProfile.isVerified) {
      res.status(403).json({ success: false, message: "Doctor account is not verified" });
      return;
    }

    const healthId = Array.isArray(req.params.healthId)
      ? req.params.healthId[0]
      : req.params.healthId;

    const workerIdentity = await lookupWorkerByHealthId(healthId || "");

    const consent = await isConsentActiveForAccess({
      workerId: workerIdentity.userId as string,
      doctorId: req.user.id,
      categories: ["HEALTH_INFO", "MEDICAL_RECORDS", "GENERAL"],
    });

    const latestConsentDoc = await Consent.findOne({
      workerId: new mongoose.Types.ObjectId(workerIdentity.userId as string),
      doctorId: new mongoose.Types.ObjectId(req.user.id),
    }).sort({ createdAt: -1 });
    const latestConsent = latestConsentDoc
      ? {
          id: latestConsentDoc._id.toString(),
          status: latestConsentDoc.status,
          categories: latestConsentDoc.categories,
          validFrom: latestConsentDoc.validFrom.toISOString(),
          validUntil: latestConsentDoc.validUntil.toISOString(),
        }
      : null;

    let profile: Record<string, unknown> = {};

    const workerProfile = await getWorkerProfileByUserId(workerIdentity.userId as string);
    if (workerProfile) {
      profile = {
        userId: workerProfile.userId.toString(),
        healthId: workerProfile.healthId,
        ...(workerProfile.dateOfBirth ? { dateOfBirth: workerProfile.dateOfBirth.toISOString() } : {}),
        ...(workerProfile.gender ? { gender: workerProfile.gender } : {}),
      };
    }

    if (consent) {
      if (workerProfile) {
        if (workerProfile.bloodGroup) profile.bloodGroup = workerProfile.bloodGroup;
        if (workerProfile.address) profile.address = workerProfile.address;
        if (workerProfile.emergencyContact) profile.emergencyContact = workerProfile.emergencyContact;
        if (workerProfile.allergies && workerProfile.allergies.length > 0) {
          profile.allergies = workerProfile.allergies;
        }
      }
    }

    const workerUser = await User.findById(workerIdentity.userId).select("name phone email");

    res.status(200).json({
      success: true,
      message: "Worker profile retrieved successfully",
      data: {
        worker: {
          ...workerIdentity,
          ...(profile as Record<string, unknown>),
          name: workerUser?.name || workerIdentity.name,
          phone: workerUser?.phone || workerIdentity.phone,
          ...(workerUser?.email ? { email: workerUser.email } : {}),
        },
        consent: consent || null,
        latestConsent,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const replaceWorkerProfile = async (
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

    rejectImmutableFields(req);

    const profile = await replaceWorkerProfileForUser(req.user.id, req.body || {});

    res.status(200).json({
      success: true,
      message: "Worker profile updated successfully",
      data: { profile },
    });
  } catch (error) {
    next(error);
  }
};

export const updateWorkerProfile = async (
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

    rejectImmutableFields(req);

    const profile = await updateWorkerProfileForUser(req.user.id, req.body || {});

    res.status(200).json({
      success: true,
      message: "Worker profile updated successfully",
      data: { profile },
    });
  } catch (error) {
    next(error);
  }
};
