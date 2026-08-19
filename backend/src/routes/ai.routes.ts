import { Router } from "express";
import {
  createChatSessionController,
  getChatSessionController,
  listChatSessionsController,
  sendMessageController,
} from "../controllers/ai.controller";
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

export default router;
