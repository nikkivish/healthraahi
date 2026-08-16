import { NextFunction, Request, Response } from "express";
import { AppError } from "../middleware/errorHandler";
import {
  createClinicalRecord,
  getClinicalRecordById,
  getDoctorAccessibleRecords,
  getWorkerClinicalRecords,
  updateClinicalRecord,
} from "../services/clinicalRecord.service";

export const createClinicalRecordController = async (
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

    const record = await createClinicalRecord(req.user.id, req.body || {});

    res.status(201).json({
      success: true,
      message: "Clinical record created successfully",
      data: { record },
    });
  } catch (error) {
    next(error);
  }
};

export const getWorkerClinicalRecordsController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: "Authentication required" });
      return;
    }

    const workerId =
      req.user.role === "WORKER"
        ? req.user.id
        : Array.isArray(req.params.workerId)
          ? req.params.workerId[0]
          : req.params.workerId;

    if (!workerId) {
      throw new AppError("Worker ID is required", 400);
    }

    if (req.user.role === "WORKER" && req.user.id !== workerId) {
      throw new AppError("You can only access your own records", 403);
    }

    const records = await getWorkerClinicalRecords(workerId, req.user);

    res.status(200).json({
      success: true,
      message: "Clinical records retrieved successfully",
      data: { records },
    });
  } catch (error) {
    next(error);
  }
};

export const getDoctorAccessibleRecordsController = async (
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

    const records = await getDoctorAccessibleRecords(req.user.id);

    res.status(200).json({
      success: true,
      message: "Doctor-accessible records retrieved successfully",
      data: { records },
    });
  } catch (error) {
    next(error);
  }
};

export const getClinicalRecordByIdController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: "Authentication required" });
      return;
    }

    const recordId = Array.isArray(req.params.recordId)
      ? req.params.recordId[0]
      : req.params.recordId;

    if (!recordId) {
      throw new AppError("Record ID is required", 400);
    }

    const record = await getClinicalRecordById(recordId, req.user);

    res.status(200).json({
      success: true,
      message: "Clinical record retrieved successfully",
      data: { record },
    });
  } catch (error) {
    next(error);
  }
};

export const updateClinicalRecordController = async (
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

    const recordId = Array.isArray(req.params.recordId)
      ? req.params.recordId[0]
      : req.params.recordId;

    if (!recordId) {
      throw new AppError("Record ID is required", 400);
    }

    const record = await updateClinicalRecord(req.user.id, recordId, req.body || {});

    res.status(200).json({
      success: true,
      message: "Clinical record updated successfully",
      data: { record },
    });
  } catch (error) {
    next(error);
  }
};
