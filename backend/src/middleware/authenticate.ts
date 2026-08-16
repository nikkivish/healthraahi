import { NextFunction, Request, Response } from "express";
import { AppError } from "./errorHandler";
import { getUserById } from "../services/auth.service";
import { verifyToken } from "../utils/jwt";

export const authenticate = async (
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader?.startsWith("Bearer ")) {
      throw new AppError("Authentication required", 401);
    }

    const token = authHeader.slice(7).trim();

    if (!token) {
      throw new AppError("Authentication required", 401);
    }

    let payload;
    try {
      payload = verifyToken(token);
    } catch {
      throw new AppError("Invalid or expired token", 401);
    }

    const user = await getUserById(payload.userId);
    req.user = user;

    next();
  } catch (error) {
    next(error);
  }
};
