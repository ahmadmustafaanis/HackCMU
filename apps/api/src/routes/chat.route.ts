import { Router } from "express";
import type { ChatHistoryResponse, SendMessageResponse } from "shared-types";
import { requireAuth } from "../auth/requireAuth.js";
import { appendMessage, getHistory } from "../chat/chatService.js";

export function createChatRouter(): Router {
  const router = Router();

  // GET /api/chat/:conversationId — requireAuth. NOTE: this does not yet
  // check that the caller is actually a member of this conversation (there's
  // no conversation-membership model beyond conversationId === matchId by
  // convention) — a known, documented gap, not something requireAuth alone
  // can close; a stricter check needs a real conversation/membership record.
  router.get("/:conversationId", requireAuth, async (req, res, next) => {
    try {
      const messages = await getHistory(req.params.conversationId);
      const response: ChatHistoryResponse = { messages };
      res.json(response);
    } catch (err) {
      next(err);
    }
  });

  // POST /api/chat/:conversationId — requireAuth; the message's senderId is
  // ALWAYS the verified session's userId, never a client-supplied field (an
  // unauthenticated/forged senderId would let anyone post as anyone else).
  router.post("/:conversationId", requireAuth, async (req, res, next) => {
    try {
      const body = req.body as { text: string };
      const message = await appendMessage(req.params.conversationId, req.userId!, body.text);
      const response: SendMessageResponse = message;
      res.json(response);
    } catch (err) {
      next(err);
    }
  });

  return router;
}
