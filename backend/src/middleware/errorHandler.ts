import { NextFunction, Request, Response } from "express";

export class AppError extends Error {
  statusCode: number;
  isOperational: boolean;

  constructor(message: string, statusCode: number) {
    super(message);
    this.statusCode = statusCode;
    this.isOperational = true;
  }
}

export const notFoundHandler = (
  req: Request,
  _res: Response,
  next: NextFunction
): void => {
  next(new AppError(`Route not found: ${req.method} ${req.originalUrl}`, 404));
};

export const errorHandler = (
  err: Error | AppError,
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  const statusCode = err instanceof AppError ? err.statusCode : 500;
  const message =
    err instanceof AppError
      ? err.message
      : "Internal server error";

  if (statusCode === 500) {
    console.error(err);
  }

  res.status(statusCode).json({
    success: false,
    message,
    ...(process.env.NODE_ENV === "development" && statusCode === 500
      ? { stack: err.stack }
      : {}),
  });
};
