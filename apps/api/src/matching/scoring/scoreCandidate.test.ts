import { describe, expect, it } from "vitest";
import type { EventRecord, NormalizedIntent } from "shared-types";
import { weights } from "../../config/index.js";
import { scoreCandidate, type ScoringCollaborators } from "./scoreCandidate.js";

function makeIntent(overrides: Partial<NormalizedIntent> = {}): NormalizedIntent {
  return {
    activityIds: ["coffee"],
    categoryIds: ["social"],
    tags: ["chill"],
    locationIds: ["cohon-university-center"],
    ...overrides,
  };
}

function makeEvent(overrides: Partial<EventRecord> = {}): EventRecord {
  return {
    id: "event-1",
    title: "Coffee run",
    canonicalActivity: "coffee",
    category: "social",
    tags: ["chill"],
    startTime: new Date().toISOString(),
    endTime: new Date().toISOString(),
    durationMinutes: 30,
    locationId: "cohon-university-center",
    capacity: 5,
    participantIds: ["host-1", "host-2", "host-3"],
    participantCount: 3, // fillRatio 0.6 -> eventQualityScore 1
    isFull: false,
    hostId: "host-1",
    vibe: "Social",
    status: "OPEN",
    createdAt: new Date().toISOString(),
    expiresAt: new Date().toISOString(),
    ...overrides,
  };
}

const allOnesCollaborators: ScoringCollaborators = {
  activityScore: () => 1,
  timeScore: () => 1,
  locationScore: () => 1,
};

const allZerosCollaborators: ScoringCollaborators = {
  activityScore: () => 0,
  timeScore: () => 0,
  locationScore: () => 0,
};

describe("scoreCandidate", () => {
  it("weights and sums all five sub-scores into total", () => {
    const intent = makeIntent();
    const event = makeEvent();

    const breakdown = scoreCandidate(intent, event, allOnesCollaborators);

    expect(breakdown.activityScore).toBe(1);
    expect(breakdown.timeScore).toBe(1);
    expect(breakdown.locationScore).toBe(1);
    expect(breakdown.tagScore).toBe(1); // identical single-tag sets
    expect(breakdown.eventQualityScore).toBeCloseTo(1); // fillRatio 0.6

    const expectedTotal =
      weights.activity * 1 + weights.time * 1 + weights.location * 1 + weights.tag * 1 + weights.eventQuality * 1;
    expect(breakdown.total).toBeCloseTo(expectedTotal);
  });

  it("produces total 0 when every collaborator and tag/quality signal is 0", () => {
    const intent = makeIntent({ tags: [] });
    const event = makeEvent({ tags: [], participantCount: 0, capacity: 5 });

    const breakdown = scoreCandidate(intent, event, allZerosCollaborators);

    expect(breakdown.total).toBe(0);
  });

  it("delegates activity/time/location scoring to the injected collaborators", () => {
    const intent = makeIntent();
    const event = makeEvent();

    const collaborators: ScoringCollaborators = {
      activityScore: (intentIds, candidateId) => (intentIds.includes(candidateId) ? 1 : 0),
      timeScore: () => 0.5,
      locationScore: (intentIds, eventLocationId) => (intentIds.includes(eventLocationId) ? 1 : 0),
    };

    const breakdown = scoreCandidate(intent, event, collaborators);

    expect(breakdown.activityScore).toBe(1); // "coffee" is in intent.activityIds
    expect(breakdown.timeScore).toBe(0.5);
    expect(breakdown.locationScore).toBe(1); // event location matches intent location
  });

  it("computes tagScore and eventQualityScore itself rather than delegating them", () => {
    const intent = makeIntent({ tags: ["chill", "casual"] });
    const event = makeEvent({ tags: ["casual"], participantCount: 5, capacity: 5 }); // fillRatio 1

    const breakdown = scoreCandidate(intent, event, allOnesCollaborators);

    expect(breakdown.tagScore).toBeCloseTo(1 / 2); // intersection {casual}, union {chill, casual}
    expect(breakdown.eventQualityScore).toBeCloseTo(1 - Math.abs(1 - 0.6) / 0.6);
  });
});
