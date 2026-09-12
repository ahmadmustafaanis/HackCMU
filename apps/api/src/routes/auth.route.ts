import { randomUUID } from "node:crypto";
import { Router } from "express";
import type { DemoLoginRequest, DemoLoginResponse, Student } from "shared-types";
import { getDb } from "../db/connection.js";

/** "users" collection document shape. Duplicated in each route file that
 * touches this collection (auth/onboarding/profile) rather than sharing a
 * module — keeps these three route files independently editable, per the
 * repo's parallel-safety rule. */
type UserDocument = Omit<Student, "id"> & { _id: string };

function toStudent(doc: UserDocument): Student {
  const { _id, ...rest } = doc;
  return { id: _id, ...rest };
}

function initialsFor(name: string): string {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0]!.toUpperCase())
    .slice(0, 2)
    .join("");
  return initials || "ST";
}

function buildDemoStudent(id: string, name: string): UserDocument {
  return {
    _id: id,
    name,
    initials: initialsFor(name),
    program: "Undeclared",
    year: "Sophomore",
    bio: "New to Scotty's Circle — excited to meet people!",
    interests: [],
    vibes: [],
    preferredActivities: [],
    approximateLocation: "Cohon University Center",
    walkingMinutes: 5,
    availabilityLabel: "Flexible",
  };
}

export function createAuthRouter(): Router {
  const router = Router();

  // POST /api/auth/demo-login — mocked auth: no real identity check. Upserts
  // by name when one is given, otherwise always creates a fresh demo user.
  // sessionToken is an opaque id the frontend echoes back; nothing verifies
  // it server-side yet (see apps/api/CLAUDE.md).
  router.post("/demo-login", async (req, res, next) => {
    try {
      const body = req.body as DemoLoginRequest;
      const name = body.name?.trim();
      const users = (await getDb()).collection<UserDocument>("users");

      let doc: UserDocument | null = name ? await users.findOne({ name }) : null;
      if (!doc) {
        const id = randomUUID();
        doc = buildDemoStudent(id, name && name.length > 0 ? name : `Guest ${id.slice(0, 6)}`);
        await users.insertOne(doc);
      }

      const response: DemoLoginResponse = {
        student: toStudent(doc),
        sessionToken: randomUUID(),
      };
      res.json(response);
    } catch (err) {
      next(err);
    }
  });

  return router;
}
