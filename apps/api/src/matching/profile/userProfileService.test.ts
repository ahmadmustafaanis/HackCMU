import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { closeDb, getDb } from "../../db/connection.js";
import { MongoUserProfileService } from "./userProfileService.js";

describe("MongoUserProfileService", () => {
  const service = new MongoUserProfileService();

  beforeAll(async () => {
    const db = await getDb();
    await db.collection("users").insertOne({
      _id: "user-fixture-1",
      name: "Jane Doe",
      program: "Computer Science",
      year: "Junior",
      bio: "Loves board games and bouldering.",
      interests: ["AI", "Gaming"],
      vibes: ["Curious", "Chill"],
      preferredActivities: ["board-games", "bouldering"],
      location: { type: "Point", coordinates: [-79.9459, 40.4432] }, // Gates Hillman
      availability: "Weekday evenings",
    } as never);

    await db.collection("users").insertOne({
      _id: "user-fixture-bare",
      name: "Solo Student",
    } as never);
  });

  afterAll(async () => {
    await closeDb();
  });

  it("maps a full Mongo user document to the Student shape", async () => {
    const profile = await service.getProfile("user-fixture-1");
    expect(profile).toEqual({
      id: "user-fixture-1",
      name: "Jane Doe",
      initials: "JD",
      program: "Computer Science",
      year: "Junior",
      bio: "Loves board games and bouldering.",
      interests: ["AI", "Gaming"],
      vibes: ["Curious", "Chill"],
      preferredActivities: ["board-games", "bouldering"],
      approximateLocation: "gates-hillman",
      walkingMinutes: 0,
      availabilityLabel: "Weekday evenings",
      onboardingCompleted: true,
    });
  });

  it("fills in sensible defaults for a sparse document", async () => {
    const profile = await service.getProfile("user-fixture-bare");
    expect(profile.id).toBe("user-fixture-bare");
    expect(profile.name).toBe("Solo Student");
    expect(profile.initials).toBe("SS");
    expect(profile.program).toBe("");
    expect(profile.year).toBe("");
    expect(profile.bio).toBe("");
    expect(profile.interests).toEqual([]);
    expect(profile.vibes).toEqual([]);
    expect(profile.preferredActivities).toEqual([]);
    expect(profile.approximateLocation).toBe("Unknown");
    expect(profile.walkingMinutes).toBe(0);
    expect(profile.availabilityLabel).toBe("Anytime");
  });

  it("throws a clear error when the user does not exist", async () => {
    await expect(service.getProfile("no-such-user")).rejects.toThrow(/no user found/i);
  });
});
