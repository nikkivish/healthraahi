import { NextFunction, Request, Response } from "express";
import { AppError } from "../middleware/errorHandler";
import {
  createHospital,
  getHospitalById,
  getHospitals,
} from "../services/hospital.service";

export const createHospitalController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const hospital = await createHospital(req.body || {});

    res.status(201).json({
      success: true,
      message: "Hospital created successfully",
      data: { hospital },
    });
  } catch (error) {
    next(error);
  }
};

export const getHospitalsController = async (
  _req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const hospitals = await getHospitals();

    res.status(200).json({
      success: true,
      message: "Hospitals retrieved successfully",
      data: { hospitals },
    });
  } catch (error) {
    next(error);
  }
};

export const getHospitalByIdController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const hospitalId = Array.isArray(req.params.hospitalId)
      ? req.params.hospitalId[0]
      : req.params.hospitalId;

    if (!hospitalId) {
      throw new AppError("Hospital ID is required", 400);
    }

    const hospital = await getHospitalById(hospitalId);

    res.status(200).json({
      success: true,
      message: "Hospital retrieved successfully",
      data: { hospital },
    });
  } catch (error) {
    next(error);
  }
};
