import { AppError } from "../middleware/errorHandler";
import { User } from "../models/User";
import {
  BloodGroup,
  Gender,
  IEmergencyContact,
  IWorkerProfile,
  WorkerProfile,
} from "../models/WorkerProfile";

export interface WorkerProfileEditableInput {
  dateOfBirth?: Date | string;
  gender?: Gender;
  bloodGroup?: BloodGroup;
  address?: string;
  emergencyContact?: IEmergencyContact;
  allergies?: string[];
}

const VALID_GENDERS: Gender[] = [
  "MALE",
  "FEMALE",
  "OTHER",
  "PREFER_NOT_TO_SAY",
];

const VALID_BLOOD_GROUPS: BloodGroup[] = [
  "A+",
  "A-",
  "B+",
  "B-",
  "AB+",
  "AB-",
  "O+",
  "O-",
];

const stripImmutableFields = (payload: Record<string, unknown>) => {
  const filtered: Record<string, unknown> = { ...payload };
  delete filtered.userId;
  delete filtered.healthId;
  return filtered;
};

const normalizeAllergies = (allergies?: string[]): string[] | undefined => {
  if (allergies === undefined) {
    return undefined;
  }

  const cleaned = allergies
    .map((allergy) => allergy?.trim())
    .filter((allergy): allergy is string => Boolean(allergy));

  if (cleaned.length !== allergies.length) {
    throw new AppError("Allergy entries cannot be empty", 400);
  }

  return cleaned;
};

const normalizeEditableInput = (
  input: WorkerProfileEditableInput
): Record<string, unknown> => {
  const normalized: Record<string, unknown> = {};

  if (input.dateOfBirth !== undefined) {
    const dateOfBirth =
      input.dateOfBirth instanceof Date
        ? input.dateOfBirth
        : new Date(input.dateOfBirth);

    if (Number.isNaN(dateOfBirth.getTime())) {
      throw new AppError("Invalid date of birth", 400);
    }

    if (dateOfBirth > new Date()) {
      throw new AppError("Date of birth cannot be in the future", 400);
    }

    normalized.dateOfBirth = dateOfBirth;
  }

  if (input.gender !== undefined) {
    if (!VALID_GENDERS.includes(input.gender)) {
      throw new AppError("Invalid gender", 400);
    }
    normalized.gender = input.gender;
  }

  if (input.bloodGroup !== undefined) {
    if (!VALID_BLOOD_GROUPS.includes(input.bloodGroup)) {
      throw new AppError("Invalid blood group", 400);
    }
    normalized.bloodGroup = input.bloodGroup;
  }

  if (input.address !== undefined) {
    normalized.address = input.address.trim();
  }

  if (input.emergencyContact !== undefined) {
    const { name, phone, relationship } = input.emergencyContact;

    if (!name?.trim() || !phone?.trim() || !relationship?.trim()) {
      throw new AppError("Emergency contact details are incomplete", 400);
    }

    normalized.emergencyContact = {
      name: name.trim(),
      phone: phone.trim(),
      relationship: relationship.trim(),
    };
  }

  if (input.allergies !== undefined) {
    normalized.allergies = normalizeAllergies(input.allergies);
  }

  return stripImmutableFields(normalized);
};

const generateHealthId = (): string => {
  const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const randomPart = Math.random().toString(36).slice(2, 8).toUpperCase();
  return `WH-${datePart}-${randomPart}`;
};

const serializeWorkerProfile = (profile: IWorkerProfile) => ({
  userId: profile.userId.toString(),
  healthId: profile.healthId,
  ...(profile.dateOfBirth ? { dateOfBirth: profile.dateOfBirth.toISOString() } : {}),
  ...(profile.gender ? { gender: profile.gender } : {}),
  ...(profile.bloodGroup ? { bloodGroup: profile.bloodGroup } : {}),
  ...(profile.address ? { address: profile.address } : {}),
  ...(profile.emergencyContact ? { emergencyContact: profile.emergencyContact } : {}),
  allergies: profile.allergies ?? [],
});

export const getWorkerProfileByUserId = async (
  userId: string
): Promise<IWorkerProfile | null> => {
  return WorkerProfile.findOne({ userId });
};

export const createWorkerProfileForUser = async (
  userId: string,
  input: WorkerProfileEditableInput
): Promise<Record<string, unknown>> => {
  if (!userId) {
    throw new AppError("User ID is required", 400);
  }

  const existingProfile = await getWorkerProfileByUserId(userId);
  if (existingProfile) {
    throw new AppError("Worker profile already exists", 409);
  }

  const payload = normalizeEditableInput(input);

  let createdProfile: IWorkerProfile | null = null;
  let attempts = 0;

  while (!createdProfile && attempts < 5) {
    try {
      createdProfile = await WorkerProfile.create({
        userId,
        healthId: generateHealthId(),
        ...payload,
      });
    } catch (error: unknown) {
      if (
        typeof error === "object" &&
        error !== null &&
        "code" in error &&
        (error as { code?: number }).code === 11000
      ) {
        attempts += 1;
        continue;
      }
      throw error;
    }
  }

  if (!createdProfile) {
    throw new AppError("Unable to create worker profile", 500);
  }

  return serializeWorkerProfile(createdProfile);
};

export const getMyWorkerProfile = async (
  userId: string
): Promise<Record<string, unknown>> => {
  const profile = await getWorkerProfileByUserId(userId);

  if (!profile) {
    throw new AppError("Worker profile not found", 404);
  }

  return serializeWorkerProfile(profile);
};

export const lookupWorkerByHealthId = async (
  healthId: string
): Promise<Record<string, unknown>> => {
  const normalizedHealthId = healthId?.trim();

  if (!normalizedHealthId) {
    throw new AppError("Health ID is required", 400);
  }

  const profile = await WorkerProfile.findOne({ healthId: normalizedHealthId });

  if (!profile) {
    throw new AppError("Worker not found", 404);
  }

  const user = await User.findById(profile.userId).select(
    "name phone email role isActive"
  );

  if (!user) {
    throw new AppError("Worker not found", 404);
  }

  return {
    id: user._id.toString(),
    userId: user._id.toString(),
    name: user.name,
    phone: user.phone,
    ...(user.email ? { email: user.email } : {}),
    role: user.role,
    healthId: profile.healthId,
    isActive: user.isActive,
  };
};

export const replaceWorkerProfileForUser = async (
  userId: string,
  input: WorkerProfileEditableInput
): Promise<Record<string, unknown>> => {
  const existingProfile = await getWorkerProfileByUserId(userId);

  if (!existingProfile) {
    throw new AppError("Worker profile not found", 404);
  }

  const replacement = {
    userId,
    healthId: existingProfile.healthId,
    ...normalizeEditableInput(input),
  };

  const updatedProfile = await WorkerProfile.findOneAndUpdate(
    { userId },
    replacement,
    { new: true, overwrite: true, runValidators: true }
  );

  if (!updatedProfile) {
    throw new AppError("Worker profile update failed", 500);
  }

  return serializeWorkerProfile(updatedProfile);
};

export const updateWorkerProfileForUser = async (
  userId: string,
  input: WorkerProfileEditableInput
): Promise<Record<string, unknown>> => {
  const existingProfile = await getWorkerProfileByUserId(userId);

  if (!existingProfile) {
    throw new AppError("Worker profile not found", 404);
  }

  const updatePayload = normalizeEditableInput(input);

  const updatedProfile = await WorkerProfile.findOneAndUpdate(
    { userId },
    { $set: updatePayload },
    { new: true, runValidators: true }
  );

  if (!updatedProfile) {
    throw new AppError("Worker profile update failed", 500);
  }

  return serializeWorkerProfile(updatedProfile);
};
