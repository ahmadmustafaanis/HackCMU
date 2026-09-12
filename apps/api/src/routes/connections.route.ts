import { Router } from "express";
import type { ConnectionsResponse } from "shared-types";
import { requireAuth } from "../auth/requireAuth.js";
import { listConnectionsForStudent } from "../matches/matchesService.js";

export function createConnectionsRouter(): Router {
  const router = Router();

  // GET /api/connections/:userId — requireAuth + ownership check, same as
  // matches.route.ts.
  router.get("/:userId", requireAuth, async (req, res, next) => {
    try {
      if (req.params.userId !== req.userId) {
        res.status(403).json({ error: "cannot view another student's connections" });
        return;
      }
      const connections = await listConnectionsForStudent(req.params.userId);
      const response: ConnectionsResponse = { connections };
      res.json(response);
    } catch (err) {
      next(err);
    }
  });

  return router;
}
