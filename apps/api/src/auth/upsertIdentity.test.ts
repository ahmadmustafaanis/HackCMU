import { afterAll, describe, expect, it } from "vitest";
import { closeDb, getDb } from "../db/connection.js";
import { toPublicStudent, upsertGoogleUser, type IdentityUserDocument } from "./upsertIdentity.js";

afterAll(async () => {
  await closeDb();
});

const googleProfile = {
  googleId: "google-sub-123",
  email: "alex@andrew.cmu.edu",
  emailVerified: true,
  name: "Alex Chen",
  pictureUrl: "https://example.com/alex.jpg",
};

describe("upsertGoogleUser", () => {
  it("creates a user once and returns the same document (with onboarding) on later sign-ins", async () => {
    const users = (await getDb()).collection<IdentityUserDocument>("users");

    const first = await upsertGoogleUser(users, googleProfile);
    await users.updateOne(
      { _id: first._id },
      { $set: { interests: ["Coffee"], vibes: ["Chill"], onboardingCompletedAt: "2026-09-12T00:00:00.000Z" } },
    );

    const second = await upsertGoogleUser(users, { ...googleProfile, name: "Alex C." });
    expect(second._id).toBe(first._id);
    expect(second.googleId).toBe(googleProfile.googleId);
    expect(second.interests).toEqual(["Coffee"]);
    expect(second.onboardingCompletedAt).toBe("2026-09-12T00:00:00.000Z");
    expect(toPublicStudent(second).onboardingCompleted).toBe(true);
    expect(second.name).toBe("Alex C.");
  });

  it("finds an existing account by email if googleId was missing", async () => {
    const users = (await getDb()).collection<IdentityUserDocument>("users");
    await users.insertOne({
      _id: "legacy-google-user",
      name: "Legacy",
      initials: "LG",
      program: "CS",
      year: "Junior",
      bio: "",
      interests: ["Music"],
      vibes: ["Social"],
      preferredActivities: [],
      approximateLocation: "CUC",
      walkingMinutes: 5,
      availabilityLabel: "Flexible",
      email: "legacy@andrew.cmu.edu",
      authProvider: "google",
    });

    const found = await upsertGoogleUser(users, {
      googleId: "google-sub-legacy",
      email: "legacy@andrew.cmu.edu",
      emailVerified: true,
      name: "Legacy",
    });

    expect(found._id).toBe("legacy-google-user");
    expect(found.googleId).toBe("google-sub-legacy");
    expect(found.interests).toEqual(["Music"]);
  });
});
