import { Router } from "express";
import type { ConnectionsResponse } from "shared-types";
import { listConnectionsForStudent } from "../matches/matchesService.js";

export function createConnectionsRouter(): Router {
  const router = Router();

  // GET /api/connections/:userId
  router.get("/:userId", async (req, res, next) => {
    try {
      const connections = await listConnectionsForStudent(req.params.userId);
      const response: ConnectionsResponse = { connections };
      res.json(response);
    } catch (err) {
      next(err);
    }
  });

  return router;
}
