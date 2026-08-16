import { IUser, User, UserRole } from "../models/User";
import { AppError } from "../middleware/errorHandler";
import {
  comparePassword,
  hashPassword,
  validatePasswordStrength,
} from "../utils/password";
import { signToken } from "../utils/jwt";
import { createWorkerProfileForUser } from "./workerProfile.service";

export interface SafeUser {
  id: string;
  name: string;
  phone: string;
  email?: string;
  role: UserRole;
  isActive: boolean;
}

export interface RegisterInput {
  name: string;
  phone: string;
  email?: string;
  password: string;
  role: UserRole;
}

export interface LoginInput {
  phone: string;
  password: string;
}

const ALLOWED_ROLES: UserRole[] = ["WORKER", "DOCTOR", "ADMIN"];

export const toSafeUser = (user: IUser): SafeUser => ({
  id: user._id.toString(),
  name: user.name,
  phone: user.phone,
  ...(user.email ? { email: user.email } : {}),
  role: user.role,
  isActive: user.isActive,
});

export const registerUser = async (input: RegisterInput): Promise<SafeUser> => {
  const { name, phone, email, password, role } = input;

  if (!name?.trim()) {
    throw new AppError("Name is required", 400);
  }

  if (!phone?.trim()) {
    throw new AppError("Phone is required", 400);
  }

  if (!password) {
    throw new AppError("Password is required", 400);
  }

  if (!role) {
    throw new AppError("Role is required", 400);
  }

  if (!ALLOWED_ROLES.includes(role)) {
    throw new AppError("Invalid role", 400);
  }

  try {
    validatePasswordStrength(password);
  } catch (error) {
    throw new AppError(
      error instanceof Error ? error.message : "Invalid password",
      400
    );
  }

  const existingPhone = await User.findOne({ phone: phone.trim() });
  if (existingPhone) {
    throw new AppError("Phone number is already registered", 409);
  }

  if (email?.trim()) {
    const existingEmail = await User.findOne({
      email: email.trim().toLowerCase(),
    });
    if (existingEmail) {
      throw new AppError("Email is already registered", 409);
    }
  }

  const passwordHash = await hashPassword(password);

  const user = await User.create({
    name: name.trim(),
    phone: phone.trim(),
    ...(email?.trim() ? { email: email.trim().toLowerCase() } : {}),
    passwordHash,
    role,
  });

  if (role === "WORKER") {
    await createWorkerProfileForUser(user._id.toString(), {});
  }

  return toSafeUser(user);
};

export const loginUser = async (
  input: LoginInput
): Promise<{ token: string; user: SafeUser }> => {
  const { phone, password } = input;

  if (!phone?.trim()) {
    throw new AppError("Phone is required", 400);
  }

  if (!password) {
    throw new AppError("Password is required", 400);
  }

  const user = await User.findOne({ phone: phone.trim() });

  if (!user) {
    throw new AppError("Invalid phone or password", 401);
  }

  const isPasswordValid = await comparePassword(password, user.passwordHash);

  if (!isPasswordValid) {
    throw new AppError("Invalid phone or password", 401);
  }

  if (!user.isActive) {
    throw new AppError("Account is inactive", 403);
  }

  const token = signToken({
    userId: user._id.toString(),
    role: user.role,
  });

  return {
    token,
    user: toSafeUser(user),
  };
};

export const getUserById = async (userId: string): Promise<SafeUser> => {
  const user = await User.findById(userId).select("-passwordHash");

  if (!user) {
    throw new AppError("User not found", 404);
  }

  if (!user.isActive) {
    throw new AppError("Account is inactive", 403);
  }

  return toSafeUser(user);
};
