import { NextFunction, Request, Response } from "express";
import { UserRole } from "../models/User";
import { AppError } from "./errorHandler";

export const requireRole =
  (...allowedRoles: UserRole[]) =>
  (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(new AppError("Authentication required", 401));
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      next(new AppError("Insufficient permissions", 403));
      return;
    }

    next();
  };
