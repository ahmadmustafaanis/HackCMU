import { Router } from "express";
import type { FeedbackRequest, FeedbackResponse } from "shared-types";
import { requireAuth } from "../auth/requireAuth.js";
import { submitFeedback } from "../feedback/feedbackService.js";

export function createFeedbackRouter(): Router {
  const router = Router();

  // POST /api/feedback — requireAuth; userId is always the verified
  // session's, never the request body's.
  router.post("/", requireAuth, async (req, res, next) => {
    try {
      const body = req.body as FeedbackRequest;
      await submitFeedback({ ...body, userId: req.userId! });
      const response: FeedbackResponse = { ok: true };
      res.json(response);
    } catch (err) {
      next(err);
    }
  });

  return router;
}
