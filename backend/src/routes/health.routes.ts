import { Router, Request, Response } from "express";
import mongoose from "mongoose";

const router = Router();

router.get("/", (_req: Request, res: Response) => {
  const dbState = mongoose.connection.readyState;
  const dbStatusMap: Record<number, string> = {
    0: "disconnected",
    1: "connected",
    2: "connecting",
    3: "disconnecting",
  };

  res.status(200).json({
    success: true,
    message: "Server is healthy",
    data: {
      status: "ok",
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || "development",
      database: dbStatusMap[dbState] ?? "unknown",
    },
  });
});

export default router;
