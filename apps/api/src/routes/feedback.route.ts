import { Router } from "express";
import type { FeedbackRequest, FeedbackResponse } from "shared-types";
import { submitFeedback } from "../feedback/feedbackService.js";

export function createFeedbackRouter(): Router {
  const router = Router();

  // POST /api/feedback
  router.post("/", async (req, res, next) => {
    try {
      const body = req.body as FeedbackRequest;
      await submitFeedback(body);
      const response: FeedbackResponse = { ok: true };
      res.json(response);
    } catch (err) {
      next(err);
    }
  });

  return router;
}
