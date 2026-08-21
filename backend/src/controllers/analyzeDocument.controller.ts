import { NextFunction, Request, Response } from "express";
import { AppError } from "../middleware/errorHandler";
import { analyzeDocument, listDocumentsForAnalysis } from "../services/analyzeDocument.service";

export const analyzeDocumentController = async (
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
    const documentId = Array.isArray(req.body?.documentId)
      ? req.body.documentId[0]
      : req.body?.documentId;

    if (!documentId || typeof documentId !== "string") {
      throw new AppError("documentId is required", 400);
    }

    const action = Array.isArray(req.body?.action)
      ? req.body.action[0]
      : req.body?.action || "analyze";

    const workerId = role === "DOCTOR"
      ? (Array.isArray(req.body?.workerId) ? req.body.workerId[0] : req.body?.workerId)
      : undefined;

    const result = await analyzeDocument(
      req.user.id,
      role,
      documentId,
      action,
      workerId
    );

    res.status(200).json({
      success: true,
      message: "Document analysis completed",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const listAnalyzableDocumentsController = async (
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

    const workerId = role === "DOCTOR"
      ? (Array.isArray(req.query?.workerId) ? req.query.workerId[0] as string : req.query?.workerId as string)
      : undefined;

    const documents = await listDocumentsForAnalysis(
      req.user.id,
      role,
      workerId
    );

    res.status(200).json({
      success: true,
      message: "Analyzable documents retrieved",
      data: { documents },
    });
  } catch (error) {
    next(error);
  }
};
