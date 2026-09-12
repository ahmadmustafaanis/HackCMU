import { Router } from "express";
import type { MatchesResponse } from "shared-types";
import { listMatchesForStudent } from "../matches/matchesService.js";

export function createMatchesRouter(): Router {
  const router = Router();

  // GET /api/matches/:userId
  router.get("/:userId", async (req, res, next) => {
    try {
      const matches = await listMatchesForStudent(req.params.userId);
      const response: MatchesResponse = { matches };
      res.json(response);
    } catch (err) {
      next(err);
    }
  });

  return router;
}
