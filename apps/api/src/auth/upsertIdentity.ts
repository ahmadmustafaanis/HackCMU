import { MongoServerError, type Collection } from "mongodb";
import type { Student } from "shared-types";
import type { GoogleProfile } from "./googleAuth.js";
import type { Auth0Profile } from "./auth0Auth.js";

export interface IdentityUserDocument {
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
  onboardingCompletedAt?: string;
  ratingAverage?: number;
  ratingCount?: number;
}

export function toPublicStudent(doc: IdentityUserDocument): Student {
  const interests = (doc.interests ?? []) as Student["interests"];
  return {
    id: doc._id,
    name: doc.name,
    initials: doc.initials,
    program: doc.program,
    year: doc.year,
    bio: doc.bio,
    interests,
    vibes: (doc.vibes ?? []) as Student["vibes"],
    preferredActivities: doc.preferredActivities ?? [],
    approximateLocation: doc.approximateLocation,
    walkingMinutes: doc.walkingMinutes,
    availabilityLabel: doc.availabilityLabel,
    avatarUrl: doc.avatarUrl,
    ratingAverage: doc.ratingAverage,
    ratingCount: doc.ratingCount,
    onboardingCompleted: Boolean(doc.onboardingCompletedAt) || interests.length > 0,
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

function blankProfile(id: string, name: string): Omit<IdentityUserDocument, "authProvider" | "createdAt"> {
  return {
    _id: id,
    name,
    initials: initialsFor(name),
    program: "Undeclared",
    year: "Sophomore",
    bio: "",
    interests: [],
    vibes: [],
    preferredActivities: [],
    approximateLocation: "Cohon University Center",
    walkingMinutes: 5,
    availabilityLabel: "Flexible",
  };
}

async function findExisting(
  users: Collection<IdentityUserDocument>,
  filter: { googleId?: string; auth0Id?: string; email?: string },
): Promise<IdentityUserDocument | null> {
  const clauses = [
    filter.googleId ? { googleId: filter.googleId } : null,
    filter.auth0Id ? { auth0Id: filter.auth0Id } : null,
    filter.email ? { email: filter.email } : null,
  ].filter((clause): clause is { googleId: string } | { auth0Id: string } | { email: string } => clause != null);
  if (clauses.length === 0) return null;
  return users.findOne({ $or: clauses });
}

async function refreshProfile(
  users: Collection<IdentityUserDocument>,
  existing: IdentityUserDocument,
  set: Partial<IdentityUserDocument>,
): Promise<IdentityUserDocument> {
  const updated = await users.findOneAndUpdate({ _id: existing._id }, { $set: set }, { returnDocument: "after" });
  return updated ?? existing;
}

export async function upsertGoogleUser(
  users: Collection<IdentityUserDocument>,
  profile: GoogleProfile,
): Promise<IdentityUserDocument> {
  const existing = await findExisting(users, { googleId: profile.googleId, email: profile.email });
  if (existing) {
    return refreshProfile(users, existing, {
      googleId: profile.googleId,
      name: profile.name,
      avatarUrl: profile.pictureUrl,
      email: profile.email,
      emailVerified: profile.emailVerified,
      authProvider: existing.authProvider ?? "google",
    });
  }

  const doc: IdentityUserDocument = {
    ...blankProfile(`google:${profile.googleId}`, profile.name),
    avatarUrl: profile.pictureUrl,
    googleId: profile.googleId,
    email: profile.email,
    emailVerified: profile.emailVerified,
    authProvider: "google",
    createdAt: new Date().toISOString(),
  };

  try {
    await users.insertOne(doc);
    return doc;
  } catch (err) {
    if (err instanceof MongoServerError && err.code === 11000) {
      const raced = await findExisting(users, { googleId: profile.googleId, email: profile.email });
      if (raced) return raced;
    }
    throw err;
  }
}

export async function upsertAuth0User(
  users: Collection<IdentityUserDocument>,
  profile: Auth0Profile,
): Promise<IdentityUserDocument> {
  const existing = await findExisting(users, { auth0Id: profile.auth0Id, email: profile.email });
  if (existing) {
    return refreshProfile(users, existing, {
      auth0Id: profile.auth0Id,
      name: profile.name,
      avatarUrl: profile.pictureUrl,
      email: profile.email,
      emailVerified: profile.emailVerified,
      authProvider: existing.authProvider ?? "auth0",
    });
  }

  const doc: IdentityUserDocument = {
    ...blankProfile(`auth0:${profile.auth0Id}`, profile.name),
    avatarUrl: profile.pictureUrl,
    auth0Id: profile.auth0Id,
    email: profile.email,
    emailVerified: profile.emailVerified,
    authProvider: "auth0",
    createdAt: new Date().toISOString(),
  };

  try {
    await users.insertOne(doc);
    return doc;
  } catch (err) {
    if (err instanceof MongoServerError && err.code === 11000) {
      const raced = await findExisting(users, { auth0Id: profile.auth0Id, email: profile.email });
      if (raced) return raced;
    }
    throw err;
  }
}
