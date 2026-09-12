import { Router } from "express";
import type { NotificationsResponse } from "shared-types";
import { requireAuth } from "../auth/requireAuth.js";
import { listNotifications } from "../notifications/notificationService.js";

export function createNotificationsRouter(): Router {
  const router = Router();
  router.get("/", requireAuth, async (req, res, next) => {
    try {
      const response: NotificationsResponse = { notifications: await listNotifications(req.userId!) };
      res.json(response);
    } catch (err) {
      next(err);
    }
  });
  return router;
}