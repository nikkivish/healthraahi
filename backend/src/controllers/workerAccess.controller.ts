import mongoose from "mongoose";
import { NextFunction, Request, Response } from "express";
import { AppError } from "../middleware/errorHandler";
import { Consent } from "../models/Consent";
import { DoctorProfile } from "../models/DoctorProfile";
import { User } from "../models/User";
import { isConsentActiveForAccess } from "../services/consent.service";
import { lookupWorkerByHealthId } from "../services/workerProfile.service";

export const verifyWorkerAccess = async (
  req: Request,
  res: Response,
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
    if (!doctorProfile || doctorProfile.verificationStatus !== "VERIFIED" || !doctorProfile.isVerified) {
      throw new AppError("Doctor account is not verified", 403);
    }

    const healthId = Array.isArray(req.params.healthId)
      ? req.params.healthId[0]
      : req.params.healthId;

    if (!healthId || !healthId.trim()) {
      throw new AppError("Health ID is required", 400);
    }

    const workerIdentity = await lookupWorkerByHealthId(healthId.trim());

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
          purpose: latestConsentDoc.purpose,
          validFrom: latestConsentDoc.validFrom.toISOString(),
          validUntil: latestConsentDoc.validUntil.toISOString(),
        }
      : null;

    let profile: Record<string, unknown> = {};

    const { getWorkerProfileByUserId } = await import("../services/workerProfile.service");
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
      message: consent ? "Worker access verified successfully" : "Worker found — active consent required for record access",
      data: {
        verified: !!consent,
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
