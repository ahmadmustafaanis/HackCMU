import { Router } from "express";
import type { ChatHistoryResponse, EventRepository, SendMessageResponse } from "shared-types";
import { requireAuth } from "../auth/requireAuth.js";
import { appendMessage, getHistory } from "../chat/chatService.js";

export function createChatRouter(deps: { eventRepository: EventRepository }): Router {
  const router = Router();

  // Activity group rooms use the event's own id as conversationId, so
  // membership is exactly the event's participantIds — real access control,
  // unlike the legacy 1:1 path below. A conversationId that isn't a known
  // event id falls through to that legacy convention (conversationId ===
  // matchId, no membership model yet — a known, pre-existing gap; a
  // stricter check there needs a real conversation/membership record).
  async function canAccess(conversationId: string, userId: string): Promise<boolean> {
    const event = await deps.eventRepository.getById(conversationId);
    return event ? event.participantIds.includes(userId) : true;
  }

  // GET /api/chat/:conversationId — requireAuth + activity-room membership.
  router.get("/:conversationId", requireAuth, async (req, res, next) => {
    try {
      if (!(await canAccess(req.params.conversationId, req.userId!))) {
        res.status(403).json({ error: "not a participant in this activity" });
        return;
      }
      const messages = await getHistory(req.params.conversationId);
      const response: ChatHistoryResponse = { messages };
      res.json(response);
    } catch (err) {
      next(err);
    }
  });

  // POST /api/chat/:conversationId — requireAuth + activity-room membership;
  // the message's senderId is ALWAYS the verified session's userId, never a
  // client-supplied field (an unauthenticated/forged senderId would let
  // anyone post as anyone else).
  router.post("/:conversationId", requireAuth, async (req, res, next) => {
    try {
      if (!(await canAccess(req.params.conversationId, req.userId!))) {
        res.status(403).json({ error: "not a participant in this activity" });
        return;
      }
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
