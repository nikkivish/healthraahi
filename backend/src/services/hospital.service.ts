import mongoose from "mongoose";
import { AppError } from "../middleware/errorHandler";
import { Hospital, IHospital } from "../models/Hospital";

export interface HospitalInput {
  hospitalId: string;
  name: string;
  registrationNumber: string;
  address: string;
  city: string;
  state: string;
  phone: string;
  email?: string;
  isActive?: boolean;
}

export const serializeHospital = (hospital: IHospital) => ({
  id: hospital._id.toString(),
  hospitalId: hospital.hospitalId,
  name: hospital.name,
  registrationNumber: hospital.registrationNumber,
  address: hospital.address,
  city: hospital.city,
  state: hospital.state,
  phone: hospital.phone,
  ...(hospital.email ? { email: hospital.email } : {}),
  isActive: hospital.isActive,
  createdAt: hospital.createdAt,
  updatedAt: hospital.updatedAt,
});

const rejectImmutableHospitalFields = (input: Record<string, unknown>): void => {
  if (Object.prototype.hasOwnProperty.call(input, "_id")) {
    throw new AppError("_id cannot be set manually", 400);
  }

  if (Object.prototype.hasOwnProperty.call(input, "createdAt")) {
    throw new AppError("createdAt cannot be set manually", 400);
  }

  if (Object.prototype.hasOwnProperty.call(input, "updatedAt")) {
    throw new AppError("updatedAt cannot be set manually", 400);
  }
};

export const createHospital = async (input: HospitalInput) => {
  const payload = { ...input };

  rejectImmutableHospitalFields(payload);

  const requiredFields: Array<[string, string]> = [
    ["hospitalId", payload.hospitalId],
    ["name", payload.name],
    ["registrationNumber", payload.registrationNumber],
    ["address", payload.address],
    ["city", payload.city],
    ["state", payload.state],
    ["phone", payload.phone],
  ];

  for (const [field, value] of requiredFields) {
    if (!value || !String(value).trim()) {
      throw new AppError(`${field} is required`, 400);
    }
  }

  const normalizedHospitalId = payload.hospitalId.trim();
  const normalizedRegistrationNumber = payload.registrationNumber.trim();

  const existingHospital = await Hospital.findOne({
    $or: [
      { hospitalId: normalizedHospitalId },
      { registrationNumber: normalizedRegistrationNumber },
    ],
  });

  if (existingHospital) {
    throw new AppError("Hospital already exists", 409);
  }

  const hospital = await Hospital.create({
    hospitalId: normalizedHospitalId,
    name: payload.name.trim(),
    registrationNumber: normalizedRegistrationNumber,
    address: payload.address.trim(),
    city: payload.city.trim(),
    state: payload.state.trim(),
    phone: payload.phone.trim(),
    ...(payload.email?.trim() ? { email: payload.email.trim().toLowerCase() } : {}),
    isActive: payload.isActive ?? true,
  });

  return serializeHospital(hospital);
};

export const getHospitals = async () => {
  const hospitals = await Hospital.find({ isActive: true }).sort({ name: 1 });
  return hospitals.map((hospital) => serializeHospital(hospital));
};

export const getHospitalById = async (hospitalId: string) => {
  if (!mongoose.isValidObjectId(hospitalId)) {
    throw new AppError("Invalid hospital ID", 400);
  }

  const hospital = await Hospital.findById(hospitalId);

  if (!hospital) {
    throw new AppError("Hospital not found", 404);
  }

  return serializeHospital(hospital);
};
