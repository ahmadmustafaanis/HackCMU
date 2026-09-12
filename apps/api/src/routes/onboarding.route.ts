import { Router } from "express";
import type { OnboardingRequest, OnboardingResponse, Student } from "shared-types";
import { getDb } from "../db/connection.js";

/** See auth.route.ts for why this shape is duplicated rather than shared. */
type UserDocument = Omit<Student, "id"> & { _id: string };

function toStudent(doc: UserDocument): Student {
  const { _id, ...rest } = doc;
  return { id: _id, ...rest };
}

export function createOnboardingRouter(): Router {
  const router = Router();

  // POST /api/onboarding — merges the given fields into the caller's
  // profile, creating a minimal profile if one doesn't exist yet (e.g. the
  // frontend skipped demo-login in dev).
  router.post("/", async (req, res, next) => {
    try {
      const body = req.body as OnboardingRequest;
      const users = (await getDb()).collection<UserDocument>("users");

      const existing = await users.findOne({ _id: body.userId });
      if (!existing) {
        const created: UserDocument = {
          _id: body.userId,
          name: "Guest",
          initials: "ST",
          program: "Undeclared",
          year: "Sophomore",
          bio: "",
          interests: body.interests,
          vibes: body.vibes,
          preferredActivities: [],
          approximateLocation: "Cohon University Center",
          walkingMinutes: 5,
          availabilityLabel: body.availabilityLabel,
        };
        await users.insertOne(created);
        const response: OnboardingResponse = toStudent(created);
        res.json(response);
        return;
      }

      const updated = await users.findOneAndUpdate(
        { _id: body.userId },
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
