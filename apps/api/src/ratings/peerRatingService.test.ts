import { afterAll, describe, expect, it } from "vitest";
import type { EventRecord } from "shared-types";
import { closeDb, getDb } from "../db/connection.js";
import { getEventRatings, PeerRatingError, submitPeerRatings } from "./peerRatingService.js";

afterAll(async () => {
  await closeDb();
});

function endedEvent(overrides: Partial<EventRecord> = {}): EventRecord {
  const now = Date.now();
  return {
    id: "event-rate-1",
    title: "Coffee",
    canonicalActivity: "coffee",
    category: "social",
    tags: [],
    startTime: new Date(now - 2 * 60 * 60_000).toISOString(),
    endTime: new Date(now - 60_000).toISOString(),
    durationMinutes: 60,
    locationId: "cuc",
    capacity: 4,
    participantIds: ["host-1", "guest-1", "guest-2"],
    participantCount: 3,
    isFull: false,
    hostId: "host-1",
    vibe: "Casual",
    status: "OPEN",
    createdAt: new Date(now - 3 * 60 * 60_000).toISOString(),
    expiresAt: new Date(now - 60_000).toISOString(),
    ...overrides,
  };
}

describe("peerRatingService", () => {
  it("lets each participant rate the others after the event ends and updates averages", async () => {
    const db = await getDb();
    await db.collection("users").insertMany([
      { _id: "host-1", name: "Host", initials: "HO", program: "CS", year: "Junior", bio: "", interests: [], vibes: [], preferredActivities: [], approximateLocation: "CUC", walkingMinutes: 5, availabilityLabel: "Anytime" },
      { _id: "guest-1", name: "Good Guest", initials: "GG", program: "CS", year: "Junior", bio: "", interests: [], vibes: [], preferredActivities: [], approximateLocation: "CUC", walkingMinutes: 5, availabilityLabel: "Anytime" },
      { _id: "guest-2", name: "No Show", initials: "NS", program: "CS", year: "Junior", bio: "", interests: [], vibes: [], preferredActivities: [], approximateLocation: "CUC", walkingMinutes: 5, availabilityLabel: "Anytime" },
    ] as never[]);

    const event = endedEvent();
    const now = new Date();

    await submitPeerRatings(event, "host-1", { ratings: [{ userId: "guest-1", score: 5 }, { userId: "guest-2", score: 1 }] }, now);
    await submitPeerRatings(event, "guest-1", { ratings: [{ userId: "host-1", score: 4 }, { userId: "guest-2", score: 1 }] }, now);

    const guest1 = await db.collection("users").findOne({ _id: "guest-1" });
    const guest2 = await db.collection("users").findOne({ _id: "guest-2" });
    expect(guest1?.ratingAverage).toBe(5);
    expect(guest1?.ratingCount).toBe(1);
    expect(guest2?.ratingAverage).toBe(1);
    expect(guest2?.ratingCount).toBe(2);

    const view = await getEventRatings(event, "host-1", now);
    expect(view.ended).toBe(true);
    expect(view.submitted).toBe(true);
    expect(view.people).toHaveLength(2);
    expect(view.people.find((p) => p.student.id === "guest-2")?.existingScore).toBe(1);
  });

  it("rejects ratings before the event ends", async () => {
    const event = endedEvent({
      startTime: new Date(Date.now() + 10 * 60_000).toISOString(),
      endTime: new Date(Date.now() + 70 * 60_000).toISOString(),
    });
    await expect(
      submitPeerRatings(event, "host-1", { ratings: [{ userId: "guest-1", score: 5 }] }, new Date()),
    ).rejects.toBeInstanceOf(PeerRatingError);
  });

  it("rejects rating yourself or a non-participant", async () => {
    const event = endedEvent();
    await expect(
      submitPeerRatings(event, "host-1", { ratings: [{ userId: "host-1", score: 5 }] }, new Date()),
    ).rejects.toBeInstanceOf(PeerRatingError);
    await expect(
      submitPeerRatings(event, "host-1", { ratings: [{ userId: "stranger", score: 5 }] }, new Date()),
    ).rejects.toBeInstanceOf(PeerRatingError);
  });
});
