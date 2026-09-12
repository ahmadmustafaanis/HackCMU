import { Router } from "express";
import type { OnboardingRequest, OnboardingResponse, Student } from "shared-types";
import { requireAuth } from "../auth/requireAuth.js";
import { getDb } from "../db/connection.js";

/** See auth.route.ts for why this shape (and the explicit-allowlist
 * toStudent below, instead of a `{ ...rest }` spread) is duplicated rather
 * than shared. */
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
  googleId?: string;
  email?: string;
  emailVerified?: boolean;
  authProvider?: "google" | "demo";
  createdAt?: string;
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
  };
}

export function createOnboardingRouter(): Router {
  const router = Router();

  // POST /api/onboarding — merges the given fields into the CALLER's own
  // profile (requireAuth — never another user's, regardless of what a
  // `userId` field in the body might claim).
  router.post("/", requireAuth, async (req, res, next) => {
    try {
      const body = req.body as OnboardingRequest;
      const userId = req.userId!;
      const users = (await getDb()).collection<UserDocument>("users");

      const existing = await users.findOne({ _id: userId });
      if (!existing) {
        res.status(404).json({ error: "no profile for this session — sign in again" });
        return;
      }

      const updated = await users.findOneAndUpdate(
        { _id: userId },
        { $set: { interests: body.interests, vibes: body.vibes, availabilityLabel: body.availabilityLabel } },
        { returnDocument: "after" }
      );
      const response: OnboardingResponse = toStudent(updated!);
      res.json(response);
    } catch (err) {
      next(err);
    }
  });

  return router;
}
