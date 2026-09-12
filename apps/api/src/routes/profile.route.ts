import { Router } from "express";
import type { ProfileResponse, Student } from "shared-types";
import { requireAuth } from "../auth/requireAuth.js";
import { getDb } from "../db/connection.js";

/** See auth.route.ts for why this shape (and the explicit-allowlist
 * toStudent below, instead of a `{ ...rest }` spread) is duplicated rather
 * than shared — critically, it's what keeps `email`/`googleId` from ever
 * leaking through this endpoint, which any signed-in user can call to view
 * ANOTHER student's public profile. */
interface UserDocument {
  _id: string;
  name: string;
  initials: string;
  program: string;
  year: string;
  bio: string;
  interests: string[];
  vibes: string[];
  preferredActivities: string[];
  approximateLocation: string;
  walkingMinutes: number;
  availabilityLabel: string;
  avatarUrl?: string;
  ratingAverage?: number;
  ratingCount?: number;
}

function toStudent(doc: UserDocument): Student {
  return {
    id: doc._id,
    name: doc.name,
    initials: doc.initials,
    program: doc.program,
    year: doc.year,
    bio: doc.bio,
    interests: doc.interests as Student["interests"],
    vibes: doc.vibes as Student["vibes"],
    preferredActivities: doc.preferredActivities,
    approximateLocation: doc.approximateLocation,
    walkingMinutes: doc.walkingMinutes,
    availabilityLabel: doc.availabilityLabel,
    avatarUrl: doc.avatarUrl,
    ratingAverage: doc.ratingAverage,
    ratingCount: doc.ratingCount,
  };
}

export function createProfileRouter(): Router {
  const router = Router();

  // GET /api/profile/:id — any signed-in user may view another student's
  // public profile (e.g. from Match Results); requireAuth just rules out
  // fully anonymous access, it doesn't restrict *whose* profile you can see.
  router.get("/:id", requireAuth, async (req, res, next) => {
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
