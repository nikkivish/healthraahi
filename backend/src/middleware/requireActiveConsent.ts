import { NextFunction, Request, Response } from "express";
import { AppError } from "./errorHandler";
import { Consent } from "../models/Consent";

export const requireActiveConsent = async (
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      throw new AppError("Authentication required", 401);
    }

    const workerId = Array.isArray(req.params.workerId)
      ? req.params.workerId[0]
      : req.params.workerId;

    const doctorId = req.user.id;
    const categories = Array.isArray(req.body?.categories)
      ? req.body.categories
      : typeof req.body?.category === "string"
        ? [req.body.category]
        : [];

    const hospitalId = Array.isArray(req.body?.hospitalId)
      ? req.body.hospitalId[0]
      : req.body?.hospitalId;

    if (!workerId) {
      throw new AppError("Worker ID is required", 400);
    }

    if (!categories.length) {
      throw new AppError("Consent categories are required", 400);
    }

    const now = new Date();
    const consent = await Consent.findOne({
      workerId,
      doctorId,
      status: "APPROVED",
      validFrom: { $lte: now },
      validUntil: { $gte: now },
      categories: { $in: categories },
      ...(hospitalId ? { hospitalId: { $in: [null, hospitalId] } } : {}),
    }).sort({ createdAt: -1 });

    if (!consent) {
      throw new AppError("Active consent is required to access this record", 403);
    }

    next();
  } catch (error) {
    next(error);
  }
};
