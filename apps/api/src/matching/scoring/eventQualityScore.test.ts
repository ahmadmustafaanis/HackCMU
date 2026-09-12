import { describe, expect, it } from "vitest";
import type { EventRecord } from "shared-types";
import { eventQualityScore } from "./eventQualityScore.js";

function makeEvent(overrides: Partial<EventRecord>): EventRecord {
  return {
    id: "event-1",
    title: "Test Event",
    canonicalActivity: "coffee",
    category: "social",
    tags: [],
    startTime: new Date().toISOString(),
    endTime: new Date().toISOString(),
    durationMinutes: 30,
    locationId: "cohon-university-center",
    capacity: 4,
    participantIds: [],
    participantCount: 0,
    isFull: false,
    hostId: "host-1",
    vibe: "Social",
    status: "OPEN",
    createdAt: new Date().toISOString(),
    expiresAt: new Date().toISOString(),
    ...overrides,
  };
}

describe("eventQualityScore", () => {
  it("scores 0 for a completely empty event", () => {
    const event = makeEvent({ participantCount: 0, capacity: 5 });
    expect(eventQualityScore(event)).toBe(0);
  });

  it("scores 1 at the ideal 60% fill ratio", () => {
    const event = makeEvent({ participantCount: 3, capacity: 5 });
    expect(eventQualityScore(event)).toBeCloseTo(1);
  });

  it("scores lower as fill ratio moves away from 60%", () => {
    const nearIdeal = makeEvent({ participantCount: 3, capacity: 5 }); // 0.6
    const full = makeEvent({ participantCount: 5, capacity: 5 }); // 1.0
    expect(eventQualityScore(full)).toBeLessThan(eventQualityScore(nearIdeal));
  });

  it("clamps to 0 rather than going negative for a full event", () => {
    const event = makeEvent({ participantCount: 5, capacity: 5 }); // fillRatio 1 -> 1 - 0.4/0.6 = 0.333
    const score = eventQualityScore(event);
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeCloseTo(1 - Math.abs(1 - 0.6) / 0.6);
  });

  it("treats a non-positive capacity as unratable", () => {
    const event = makeEvent({ participantCount: 0, capacity: 0 });
    expect(eventQualityScore(event)).toBe(0);
  });
});
