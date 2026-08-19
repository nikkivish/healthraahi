import { NextFunction, Request, Response } from "express";
import { AppError } from "../middleware/errorHandler";
import {
  createChatSession,
  getChatSession,
  listChatSessions,
  sendMessage,
} from "../services/ai.service";

export const createChatSessionController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: "Authentication required" });
      return;
    }

    const role = req.user.role as "WORKER" | "DOCTOR";

    const session = await createChatSession(req.user.id, role, {
      clinicalRecordId: req.body?.clinicalRecordId,
    });

    res.status(201).json({
      success: true,
      message: "Chat session created successfully",
      data: { session },
    });
  } catch (error) {
    next(error);
  }
};

export const sendMessageController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: "Authentication required" });
      return;
    }

    const sessionId = Array.isArray(req.params.id)
      ? req.params.id[0]
      : req.params.id;

    if (!sessionId) {
      throw new AppError("Session ID is required", 400);
    }

    const content = Array.isArray(req.body?.content)
      ? req.body.content[0]
      : req.body?.content;

    if (!content || typeof content !== "string" || !content.trim()) {
      throw new AppError("Message content is required", 400);
    }

    const role = req.user.role as "WORKER" | "DOCTOR";

    const workerId = role === "DOCTOR"
      ? (Array.isArray(req.body?.workerId) ? req.body.workerId[0] : req.body?.workerId)
      : undefined;

    const session = await sendMessage(
      req.user.id,
      sessionId,
      content,
      role,
      workerId
    );

    res.status(200).json({
      success: true,
      message: "Message sent successfully",
      data: { session },
    });
  } catch (error) {
    next(error);
  }
};

export const getChatSessionController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: "Authentication required" });
      return;
    }

    const sessionId = Array.isArray(req.params.id)
      ? req.params.id[0]
      : req.params.id;

    if (!sessionId) {
      throw new AppError("Session ID is required", 400);
    }

    const session = await getChatSession(req.user.id, sessionId);

    res.status(200).json({
      success: true,
      message: "Chat session retrieved successfully",
      data: { session },
    });
  } catch (error) {
    next(error);
  }
};

export const listChatSessionsController = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.user) {
      res.status(401).json({ success: false, message: "Authentication required" });
      return;
    }

    const sessions = await listChatSessions(req.user.id);

    res.status(200).json({
      success: true,
      message: "Chat sessions retrieved successfully",
      data: { sessions },
    });
  } catch (error) {
    next(error);
  }
};
