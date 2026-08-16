import jwt, { SignOptions } from "jsonwebtoken";
import { env } from "../config/env";
import { UserRole } from "../models/User";

export interface JwtPayload {
  userId: string;
  role: UserRole;
}

export const signToken = (payload: JwtPayload): string => {
  const options: SignOptions = {
    expiresIn: env.jwtExpiresIn as SignOptions["expiresIn"],
  };

  return jwt.sign(payload, env.jwtSecret, options);
};

export const verifyToken = (token: string): JwtPayload => {
  return jwt.verify(token, env.jwtSecret) as JwtPayload;
};
