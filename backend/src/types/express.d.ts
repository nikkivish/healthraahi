import { UserRole } from "../models/User";

export interface AuthenticatedUser {
  id: string;
  name: string;
  phone: string;
  email?: string;
  role: UserRole;
  isActive: boolean;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

export {};
