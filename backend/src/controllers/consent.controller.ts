import { NextFunction, Request, Response } from "express";
import { AppError } from "../middleware/errorHandler";
import {
  approveConsent,
  getConsentById,
  getDoctorConsents,
  getWorkerConsents,
  rejectConsent,
  requestConsent,
  revokeConsent,
} from "../services/consent.service";

export const requestConsentController = async (
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

    const consent = await requestConsent({
      workerId: Array.isArray(req.body?.workerId) ? req.body.workerId[0] : req.body?.workerId,
      doctorId: req.user.id,
      hospitalId: Array.isArray(req.body?.hospitalId) ? req.body.hospitalId[0] : req.body?.hospitalId,
      categories: Array.isArray(req.body?.categories) ? req.body.categories : [],
      purpose: Array.isArray(req.body?.purpose) ? req.body.purpose[0] : req.body?.purpose,
      validFrom: Array.isArray(req.body?.validFrom) ? req.body.validFrom[0] : req.body?.validFrom,
      validUntil: Array.isArray(req.body?.validUntil) ? req.body.validUntil[0] : req.body?.validUntil,
      notes: Array.isArray(req.body?.notes) ? req.body.notes[0] : req.body?.notes,
    });

    res.status(201).json({
      success: true,
      message: "Consent request created successfully",
      data: { consent },
    });
  } catch (error) {
    next(error);
  }
};

export const getMyConsentsController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: "Authentication required" });
      return;
    }

    const consents =
      req.user.role === "WORKER"
        ? await getWorkerConsents(req.user.id)
        : await getDoctorConsents(req.user.id);

    res.status(200).json({
      success: true,
      message: "Consents retrieved successfully",
      data: { consents },
    });
  } catch (error) {
    next(error);
  }
};

export const getConsentByIdController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: "Authentication required" });
      return;
    }

    const consentId = Array.isArray(req.params.consentId)
      ? req.params.consentId[0]
      : req.params.consentId;

    if (!consentId) {
      throw new AppError("Consent ID is required", 400);
    }

    const consent = await getConsentById(consentId);
    const isOwnedByWorker = consent.workerId === req.user.id;
    const isRequestedByDoctor = consent.doctorId === req.user.id;

    if (!isOwnedByWorker && !isRequestedByDoctor && req.user.role !== "ADMIN") {
      throw new AppError("You do not have access to this consent", 403);
    }

    res.status(200).json({
      success: true,
      message: "Consent retrieved successfully",
      data: { consent },
    });
  } catch (error) {
    next(error);
  }
};

export const approveConsentController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: "Authentication required" });
      return;
    }

    if (req.user.role !== "WORKER") {
      res.status(403).json({ success: false, message: "Worker access required" });
      return;
    }

    const consentId = Array.isArray(req.params.consentId)
      ? req.params.consentId[0]
      : req.params.consentId;

    if (!consentId) {
      throw new AppError("Consent ID is required", 400);
    }

    const consent = await approveConsent(req.user.id, consentId);

    res.status(200).json({
      success: true,
      message: "Consent approved successfully",
      data: { consent },
    });
  } catch (error) {
    next(error);
  }
};

export const rejectConsentController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: "Authentication required" });
      return;
    }

    if (req.user.role !== "WORKER") {
      res.status(403).json({ success: false, message: "Worker access required" });
      return;
    }

    const consentId = Array.isArray(req.params.consentId)
      ? req.params.consentId[0]
      : req.params.consentId;

    if (!consentId) {
      throw new AppError("Consent ID is required", 400);
    }

    const consent = await rejectConsent(req.user.id, consentId);

    res.status(200).json({
      success: true,
      message: "Consent rejected successfully",
      data: { consent },
    });
  } catch (error) {
    next(error);
  }
};

export const revokeConsentController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: "Authentication required" });
      return;
    }

    if (req.user.role !== "WORKER") {
      res.status(403).json({ success: false, message: "Worker access required" });
      return;
    }

    const consentId = Array.isArray(req.params.consentId)
      ? req.params.consentId[0]
      : req.params.consentId;

    if (!consentId) {
      throw new AppError("Consent ID is required", 400);
    }

    const consent = await revokeConsent(req.user.id, consentId);

    res.status(200).json({
      success: true,
      message: "Consent revoked successfully",
      data: { consent },
    });
  } catch (error) {
    next(error);
  }
};
