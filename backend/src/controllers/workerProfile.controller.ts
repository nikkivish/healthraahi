import { NextFunction, Request, Response } from "express";
import { AppError } from "../middleware/errorHandler";
import {
  createWorkerProfileForUser,
  getMyWorkerProfile,
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
