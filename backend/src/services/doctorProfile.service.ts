import mongoose from "mongoose";
import { AppError } from "../middleware/errorHandler";
import { DoctorProfile, VerificationStatus } from "../models/DoctorProfile";
import { Hospital } from "../models/Hospital";
import { User } from "../models/User";

export interface DoctorProfileEditableInput {
  fullName?: string;
  specialization?: string;
  medicalRegistrationNumber?: string;
  phone?: string;
  hospitalId?: string;
}

export interface DoctorProfileVerificationInput {
  status: VerificationStatus;
  reason?: string;
}

const serializeDoctorProfile = async (profile: any) => {
  const hospital = profile.hospitalId
    ? await Hospital.findById(profile.hospitalId).select("_id name address")
    : null;

  return {
    id: profile._id.toString(),
    userId: profile.userId.toString(),
    doctorId: profile.doctorId,
    fullName: profile.fullName,
    specialization: profile.specialization,
    medicalRegistrationNumber: profile.medicalRegistrationNumber,
    phone: profile.phone,
    hospitalId: profile.hospitalId ? profile.hospitalId.toString() : undefined,
    hospital: hospital
      ? {
          id: hospital._id.toString(),
          name: hospital.name,
          address: hospital.address,
        }
      : undefined,
    isVerified: profile.isVerified,
    verificationStatus: profile.verificationStatus,
    createdAt: profile.createdAt,
    updatedAt: profile.updatedAt,
  };
};

const normalizeDoctorProfileInput = async (
  input: DoctorProfileEditableInput
): Promise<Record<string, unknown>> => {
  const normalized: Record<string, unknown> = {};

  if (input.fullName !== undefined) {
    const fullName = input.fullName.trim();
    if (!fullName) {
      throw new AppError("Full name is required", 400);
    }
    normalized.fullName = fullName;
  }

  if (input.specialization !== undefined) {
    const specialization = input.specialization.trim();
    if (!specialization) {
      throw new AppError("Specialization is required", 400);
    }
    normalized.specialization = specialization;
  }

  if (input.medicalRegistrationNumber !== undefined) {
    const medicalRegistrationNumber = input.medicalRegistrationNumber.trim();
    if (!medicalRegistrationNumber) {
      throw new AppError("Medical registration number is required", 400);
    }
    normalized.medicalRegistrationNumber = medicalRegistrationNumber;
  }

  if (input.phone !== undefined) {
    const phone = input.phone.trim();
    if (!phone) {
      throw new AppError("Phone is required", 400);
    }
    normalized.phone = phone;
  }

  if (input.hospitalId !== undefined) {
    if (!input.hospitalId.trim()) {
      throw new AppError("Hospital ID is required", 400);
    }

    const hospital = await Hospital.findById(input.hospitalId);
    if (!hospital) {
      throw new AppError("Hospital not found", 404);
    }

    normalized.hospitalId = hospital._id;
  }

  return normalized;
};

export const getDoctorProfileByUserId = async (userId: string) => {
  return DoctorProfile.findOne({ userId });
};

export const getDoctorProfileByDoctorId = async (doctorId: string) => {
  return DoctorProfile.findOne({ doctorId });
};

export const createDoctorProfileForUser = async (
  userId: string,
  input: DoctorProfileEditableInput
) => {
  if (!userId) {
    throw new AppError("User ID is required", 400);
  }

  const user = await User.findById(userId);
  if (!user) {
    throw new AppError("User not found", 404);
  }

  if (user.role !== "DOCTOR") {
    throw new AppError("Only doctors can create a doctor profile", 403);
  }

  const existing = await getDoctorProfileByUserId(userId);
  if (existing) {
    throw new AppError("Doctor profile already exists", 409);
  }

  const fullName = input.fullName?.trim();
  const specialization = input.specialization?.trim();
  const medicalRegistrationNumber = input.medicalRegistrationNumber?.trim();
  const phone = input.phone?.trim();

  if (!fullName || !specialization || !medicalRegistrationNumber || !phone) {
    throw new AppError("Full name, specialization, registration number, and phone are required", 400);
  }

  const doctorId = `DR-${Date.now().toString(36).toUpperCase()}-${Math.random()
    .toString(36)
    .slice(2, 7)
    .toUpperCase()}`;

  const hospitalId = input.hospitalId?.trim();
  if (hospitalId) {
    const hospital = await Hospital.findById(hospitalId);
    if (!hospital) {
      throw new AppError("Hospital not found", 404);
    }
  }

  const duplicateDoctorId = await getDoctorProfileByDoctorId(doctorId);
  if (duplicateDoctorId) {
    throw new AppError("Doctor ID already exists", 409);
  }

  const duplicateRegistrationNumber = await DoctorProfile.findOne({
    medicalRegistrationNumber,
  });
  if (duplicateRegistrationNumber) {
    throw new AppError("Medical registration number already exists", 409);
  }

  const profile = await DoctorProfile.create({
    userId,
    doctorId,
    fullName,
    specialization,
    medicalRegistrationNumber,
    phone,
    ...(hospitalId ? { hospitalId } : {}),
    isVerified: false,
    verificationStatus: "PENDING",
  });

  return await serializeDoctorProfile(profile);
};

export const getMyDoctorProfile = async (userId: string) => {
  const profile = await getDoctorProfileByUserId(userId);
  if (!profile) {
    throw new AppError("Doctor profile not found", 404);
  }

  return await serializeDoctorProfile(profile);
};

export const updateDoctorProfileForUser = async (
  userId: string,
  input: DoctorProfileEditableInput
) => {
  const existingProfile = await getDoctorProfileByUserId(userId);
  if (!existingProfile) {
    throw new AppError("Doctor profile not found", 404);
  }

  if (existingProfile.verificationStatus === "VERIFIED") {
    throw new AppError("Verified doctors cannot modify their profile through this endpoint", 403);
  }

  if (input.hospitalId !== undefined && input.hospitalId.trim()) {
    const hospital = await Hospital.findById(input.hospitalId);
    if (!hospital) {
      throw new AppError("Hospital not found", 404);
    }
  }

  const updatePayload: Record<string, unknown> = {};

  if (input.fullName !== undefined) {
    const fullName = input.fullName.trim();
    if (!fullName) {
      throw new AppError("Full name is required", 400);
    }
    updatePayload.fullName = fullName;
  }

  if (input.specialization !== undefined) {
    const specialization = input.specialization.trim();
    if (!specialization) {
      throw new AppError("Specialization is required", 400);
    }
    updatePayload.specialization = specialization;
  }

  if (input.medicalRegistrationNumber !== undefined) {
    const medicalRegistrationNumber = input.medicalRegistrationNumber.trim();
    if (!medicalRegistrationNumber) {
      throw new AppError("Medical registration number is required", 400);
    }

    const duplicate = await DoctorProfile.findOne({
      medicalRegistrationNumber,
      userId: { $ne: userId },
    });
    if (duplicate) {
      throw new AppError("Medical registration number already exists", 409);
    }
    updatePayload.medicalRegistrationNumber = medicalRegistrationNumber;
  }

  if (input.phone !== undefined) {
    const phone = input.phone.trim();
    if (!phone) {
      throw new AppError("Phone is required", 400);
    }
    updatePayload.phone = phone;
  }

  if (input.hospitalId !== undefined) {
    if (!input.hospitalId.trim()) {
      throw new AppError("Hospital ID is required", 400);
    }
    const hospital = await Hospital.findById(input.hospitalId);
    if (!hospital) {
      throw new AppError("Hospital not found", 404);
    }
    updatePayload.hospitalId = hospital._id;
  }

  const updatedProfile = await DoctorProfile.findOneAndUpdate(
    { userId },
    { $set: updatePayload },
    { new: true, runValidators: true }
  );

  if (!updatedProfile) {
    throw new AppError("Doctor profile update failed", 500);
  }

  return await serializeDoctorProfile(updatedProfile);
};

export const linkDoctorToHospital = async (userId: string, hospitalId: string) => {
  if (!userId) {
    throw new AppError("User ID is required", 400);
  }

  if (!hospitalId || !hospitalId.trim()) {
    throw new AppError("Hospital ID is required", 400);
  }

  if (!mongoose.isValidObjectId(hospitalId)) {
    throw new AppError("Invalid hospital ID", 400);
  }

  const profile = await getDoctorProfileByUserId(userId);
  if (!profile) {
    throw new AppError("Doctor profile not found", 404);
  }

  if (profile.verificationStatus !== "VERIFIED" || !profile.isVerified) {
    throw new AppError("Doctor account is not verified", 403);
  }

  const hospital = await Hospital.findById(hospitalId);
  if (!hospital) {
    throw new AppError("Hospital not found", 404);
  }

  const updatedProfile = await DoctorProfile.findOneAndUpdate(
    { userId },
    { $set: { hospitalId: hospital._id } },
    { new: true, runValidators: true }
  );

  if (!updatedProfile) {
    throw new AppError("Hospital linking failed", 500);
  }

  return await serializeDoctorProfile(updatedProfile);
};

export const unlinkDoctorFromHospital = async (userId: string) => {
  const profile = await getDoctorProfileByUserId(userId);
  if (!profile) {
    throw new AppError("Doctor profile not found", 404);
  }

  if (profile.verificationStatus !== "VERIFIED" || !profile.isVerified) {
    throw new AppError("Doctor account is not verified", 403);
  }

  const updatedProfile = await DoctorProfile.findOneAndUpdate(
    { userId },
    { $unset: { hospitalId: 1 } },
    { new: true, runValidators: true }
  );

  if (!updatedProfile) {
    throw new AppError("Hospital unlink failed", 500);
  }

  return await serializeDoctorProfile(updatedProfile);
};

export const replaceDoctorProfileForUser = async (
  userId: string,
  input: DoctorProfileEditableInput
) => {
  const existingProfile = await getDoctorProfileByUserId(userId);
  if (!existingProfile) {
    throw new AppError("Doctor profile not found", 404);
  }

  if (existingProfile.verificationStatus === "VERIFIED") {
    throw new AppError("Verified doctors cannot replace their profile through this endpoint", 403);
  }

  const replacement = {
    userId,
    doctorId: existingProfile.doctorId,
    isVerified: false,
    verificationStatus: "PENDING",
    ...(await normalizeDoctorProfileInput(input)),
  };

  const updatedProfile = await DoctorProfile.findOneAndUpdate(
    { userId },
    replacement,
    { new: true, overwrite: true, runValidators: true }
  );

  if (!updatedProfile) {
    throw new AppError("Doctor profile replacement failed", 500);
  }

  return await serializeDoctorProfile(updatedProfile);
};

export const getPendingDoctorProfiles = async () => {
  return DoctorProfile.find({ verificationStatus: "PENDING" }).sort({ createdAt: -1 });
};

export const updateDoctorVerificationStatus = async (
  doctorId: string,
  status: VerificationStatus,
  reason?: string
) => {
  const profile = await DoctorProfile.findOne({ doctorId });

  if (!profile) {
    throw new AppError("Doctor profile not found", 404);
  }

  if (!status || !["PENDING", "VERIFIED", "REJECTED"].includes(status)) {
    throw new AppError("Invalid verification status", 400);
  }

  profile.verificationStatus = status;
  profile.isVerified = status === "VERIFIED";

  if (reason && reason.trim()) {
    profile.set("verificationReason", reason.trim());
  }

  await profile.save();

  return await serializeDoctorProfile(profile);
};

export const getDoctorProfileById = async (doctorId: string) => {
  const profile = await DoctorProfile.findOne({ doctorId });
  if (!profile) {
    throw new AppError("Doctor profile not found", 404);
  }
  return await serializeDoctorProfile(profile);
};
