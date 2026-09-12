import type { Student, UserProfileService } from "shared-types";
import { getDb } from "../../db/connection.js";
import { resolveNearestLocation } from "../location/locationService.js";

interface RawUserDocument {
  _id: string;
  name?: string;
  program?: string;
  year?: string;
  bio?: string;
  interests?: string[];
  vibes?: string[];
  preferredActivities?: string[];
  location?: { type: "Point"; coordinates: [number, number] };
  availability?: string;
  ratingAverage?: number;
  ratingCount?: number;
}

function computeInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/** The ONLY source of truth for profile data used in matching (see
 * ../CLAUDE.md) — reads the `users` collection directly, never trusts
 * client-supplied profile fields. */
export class MongoUserProfileService implements UserProfileService {
  async getProfile(userId: string): Promise<Student> {
    const db = await getDb();
    const doc = await db.collection<RawUserDocument>("users").findOne({ _id: userId });
    if (!doc) {
      throw new Error(`[UserProfileService] no user found with id "${userId}"`);
    }

    const name = doc.name ?? "Unknown";
    const approximateLocation =
      doc.location && Array.isArray(doc.location.coordinates)
        ? resolveNearestLocation(doc.location.coordinates[1], doc.location.coordinates[0])
        : "Unknown";

    return {
      id: userId,
      name,
      initials: computeInitials(name),
      program: doc.program ?? "",
      year: doc.year ?? "",
      bio: doc.bio ?? "",
      interests: (doc.interests ?? []) as Student["interests"],
      vibes: (doc.vibes ?? []) as Student["vibes"],
      preferredActivities: doc.preferredActivities ?? [],
      approximateLocation,
      walkingMinutes: 0,
      availabilityLabel: doc.availability ?? "Anytime",
      ...(typeof doc.ratingAverage === "number" ? { ratingAverage: doc.ratingAverage } : {}),
      ...(typeof doc.ratingCount === "number" ? { ratingCount: doc.ratingCount } : {}),
    };
  }
}
