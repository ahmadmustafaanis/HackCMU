import { Router } from "express";
import type { ProfileResponse, Student } from "shared-types";
import { getDb } from "../db/connection.js";

/** See auth.route.ts for why this shape is duplicated rather than shared. */
type UserDocument = Omit<Student, "id"> & { _id: string };

function toStudent(doc: UserDocument): Student {
  const { _id, ...rest } = doc;
  return { id: _id, ...rest };
}

export function createProfileRouter(): Router {
  const router = Router();

  // GET /api/profile/:id
  router.get("/:id", async (req, res, next) => {
    try {
      const users = (await getDb()).collection<UserDocument>("users");
      const doc = await users.findOne({ _id: req.params.id });
      if (!doc) {
        res.status(404).json({ error: "profile not found" });
        return;
      }
      const response: ProfileResponse = toStudent(doc);
      res.json(response);
    } catch (err) {
      next(err);
    }
  });

  return router;
}
