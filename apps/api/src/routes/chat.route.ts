import { Router } from "express";
import type { ChatHistoryResponse, SendMessageRequest, SendMessageResponse } from "shared-types";
import { appendMessage, getHistory } from "../chat/chatService.js";

export function createChatRouter(): Router {
  const router = Router();

  // GET /api/chat/:conversationId
  router.get("/:conversationId", async (req, res, next) => {
    try {
      const messages = await getHistory(req.params.conversationId);
      const response: ChatHistoryResponse = { messages };
      res.json(response);
    } catch (err) {
      next(err);
    }
  });

  // POST /api/chat/:conversationId
  router.post("/:conversationId", async (req, res, next) => {
    try {
      const body = req.body as SendMessageRequest;
      const message = await appendMessage(req.params.conversationId, body.senderId, body.text);
      const response: SendMessageResponse = message;
      res.json(response);
    } catch (err) {
      next(err);
    }
  });

  return router;
}
