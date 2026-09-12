import { randomUUID } from "node:crypto";
import { Router } from "express";
import type { DemoLoginRequest, DemoLoginResponse, Student } from "shared-types";
import { verifyAuth0IdToken } from "../auth/auth0Auth.js";
import { verifyGoogleIdToken } from "../auth/googleAuth.js";
import { requireAuth } from "../auth/requireAuth.js";
import { signSessionToken } from "../auth/session.js";
import { getDb } from "../db/connection.js";

/** "users" collection document shape. Duplicated in each route file that
 * touches this collection (auth/onboarding/profile) rather than shared,
 * per the repo's established parallel-safety convention.
 *
 * `googleId`/`email`/`emailVerified`/`authProvider` are intentionally NOT
 * part of the public `Student` type — never return them from a route.
 * `toStudent()` below is an explicit allowlist for exactly this reason: a
 * blind `{ ...rest }` spread would leak them the moment they're added here. */
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
  auth0Id?: string;
  email?: string;
  emailVerified?: boolean;
  authProvider?: "google" | "auth0" | "demo";
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
    authProvider: "demo",
    createdAt: new Date().toISOString(),
  };
}

export function createAuthRouter(): Router {
  const router = Router();

  // POST /api/auth/demo-login — mocked auth, kept for local dev/testing
  // without a Google account configured. No real identity check; see
  // apps/api/CLAUDE.md. Prefer POST /api/auth/google for anything real.
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
        sessionToken: signSessionToken(doc._id),
      };
      res.json(response);
    } catch (err) {
      next(err);
    }
  });

  // POST /api/auth/google — real Sign in with Google. Body: { idToken } —
  // the `credential` Google Identity Services hands the frontend after the
  // user picks an account. Verified server-side against Google's public
  // keys AND our own registered Client ID (see auth/googleAuth.ts) — the
  // frontend is never trusted to assert who signed in.
  router.post("/google", async (req, res, next) => {
    try {
      const idToken = (req.body as { idToken?: string }).idToken;
      if (!idToken) {
        res.status(400).json({ error: "missing idToken" });
        return;
      }

      const profile = await verifyGoogleIdToken(idToken);
      const users = (await getDb()).collection<UserDocument>("users");

      const existing = await users.findOne({ googleId: profile.googleId });
      let doc: UserDocument;

      if (existing) {
        // Refresh the few fields Google may have updated (name/photo) since
        // last sign-in; never touch onboarding-owned fields (interests,
        // vibes, etc.) here.
        const updated = await users.findOneAndUpdate(
          { _id: existing._id },
          { $set: { name: profile.name, avatarUrl: profile.pictureUrl, emailVerified: profile.emailVerified } },
          { returnDocument: "after" }
        );
        doc = updated ?? existing;
      } else {
        doc = {
          _id: `google:${profile.googleId}`,
          name: profile.name,
          initials: initialsFor(profile.name),
          program: "Undeclared",
          year: "Sophomore",
          bio: "",
          interests: [],
          vibes: [],
          preferredActivities: [],
          approximateLocation: "Cohon University Center",
          walkingMinutes: 5,
          availabilityLabel: "Flexible",
          avatarUrl: profile.pictureUrl,
          googleId: profile.googleId,
          email: profile.email,
          emailVerified: profile.emailVerified,
          authProvider: "google",
          createdAt: new Date().toISOString(),
        };
        await users.insertOne(doc);
      }

      const response: DemoLoginResponse = {
        student: toStudent(doc),
        sessionToken: signSessionToken(doc._id),
      };
      res.json(response);
    } catch (err) {
      next(err);
    }
  });

  // POST /api/auth/auth0 — Sign in with Auth0 (Universal Login). Body:
  // { idToken } — the raw ID token the frontend's Auth0 SDK hands back after
  // the user completes login. Verified server-side against our Auth0
  // tenant's JWKS AND our own registered Client ID (see auth/auth0Auth.ts) —
  // the frontend is never trusted to assert who signed in.
  router.post("/auth0", async (req, res, next) => {
    try {
      const idToken = (req.body as { idToken?: string }).idToken;
      if (!idToken) {
        res.status(400).json({ error: "missing idToken" });
        return;
      }

      const profile = await verifyAuth0IdToken(idToken);
      const users = (await getDb()).collection<UserDocument>("users");

      const existing = await users.findOne({ auth0Id: profile.auth0Id });
      let doc: UserDocument;

      if (existing) {
        // Refresh the few fields Auth0 may have updated (name/photo) since
        // last sign-in; never touch onboarding-owned fields (interests,
        // vibes, etc.) here.
        const updated = await users.findOneAndUpdate(
          { _id: existing._id },
          { $set: { name: profile.name, avatarUrl: profile.pictureUrl, emailVerified: profile.emailVerified } },
          { returnDocument: "after" }
        );
        doc = updated ?? existing;
      } else {
        doc = {
          _id: `auth0:${profile.auth0Id}`,
          name: profile.name,
          initials: initialsFor(profile.name),
          program: "Undeclared",
          year: "Sophomore",
          bio: "",
          interests: [],
          vibes: [],
          preferredActivities: [],
          approximateLocation: "Cohon University Center",
          walkingMinutes: 5,
          availabilityLabel: "Flexible",
          avatarUrl: profile.pictureUrl,
          auth0Id: profile.auth0Id,
          email: profile.email,
          emailVerified: profile.emailVerified,
          authProvider: "auth0",
          createdAt: new Date().toISOString(),
        };
        await users.insertOne(doc);
      }

      const response: DemoLoginResponse = {
        student: toStudent(doc),
        sessionToken: signSessionToken(doc._id),
      };
      res.json(response);
    } catch (err) {
      next(err);
    }
  });

  // GET /api/auth/me — validates the caller's session token for real
  // (rather than the frontend just trusting whatever's cached in
  // localStorage indefinitely) and returns the current profile.
  router.get("/me", requireAuth, async (req, res, next) => {
    try {
      const users = (await getDb()).collection<UserDocument>("users");
      const doc = await users.findOne({ _id: req.userId });
      if (!doc) {
        res.status(404).json({ error: "session user no longer exists" });
        return;
      }
      const response: DemoLoginResponse["student"] = toStudent(doc);
      res.json(response);
    } catch (err) {
      next(err);
    }
  });

  return router;
}
