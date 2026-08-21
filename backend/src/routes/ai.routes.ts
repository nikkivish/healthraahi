import { Router } from "express";
import {
  createChatSessionController,
  getChatSessionController,
  listChatSessionsController,
  sendMessageController,
} from "../controllers/ai.controller";
import {
  analyzeDocumentController,
  listAnalyzableDocumentsController,
} from "../controllers/analyzeDocument.controller";
import { authenticate } from "../middleware/authenticate";

const router = Router();

router.post(
  "/sessions",
  authenticate,
  createChatSessionController
);

router.get(
  "/sessions",
  authenticate,
  listChatSessionsController
);

router.get(
  "/sessions/:id",
  authenticate,
  getChatSessionController
);

router.post(
  "/sessions/:id/messages",
  authenticate,
  sendMessageController
);

router.get(
  "/documents/list",
  authenticate,
  listAnalyzableDocumentsController
);

router.post(
  "/analyze-document",
  authenticate,
  analyzeDocumentController
);

export default router;
