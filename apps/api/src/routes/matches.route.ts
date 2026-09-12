import { Router } from "express";
import type { MatchesResponse } from "shared-types";
import { requireAuth } from "../auth/requireAuth.js";
import { listMatchesForStudent } from "../matches/matchesService.js";

export function createMatchesRouter(): Router {
  const router = Router();

  // GET /api/matches/:userId — requireAuth, and the path's :userId must
  // match the verified session (403 otherwise) — you can only ever list
  // your OWN matches, not anyone else's by guessing their id. The URL shape
  // is kept as-is (rather than switching to a bare /me) for frontend
  // compatibility.
  router.get("/:userId", requireAuth, async (req, res, next) => {
    try {
      if (req.params.userId !== req.userId) {
        res.status(403).json({ error: "cannot view another student's matches" });
        return;
      }
      const matches = await listMatchesForStudent(req.params.userId);
      const response: MatchesResponse = { matches };
      res.json(response);
    } catch (err) {
      next(err);
    }
  });

  return router;
}
