// The LLM-free / read-only guarantee for DefaultRecommendationService is
// structural, not just behavioral: its constructor below has no
// SemanticParser and no AvailabilityService parameter anywhere in scope —
// there is nothing to inject, let alone call. The tests below additionally
// prove the EventRepository side of the same guarantee at runtime: the fake
// repository throws on every method except retrieveCandidates, so any
// accidental write-path call would fail the test immediately.
import { beforeEach, describe, expect, it } from "vitest";
import type { CacheService, EventRecord, EventRepository, NormalizedIntent } from "shared-types";
import { InMemoryMetricsService } from "./observability/metricsService.js";
import { DefaultRecommendationService } from "./recommendationService.js";
import type { ScoringCollaborators } from "./scoring/scoreCandidate.js";

function makeEvent(overrides: Partial<EventRecord>): EventRecord {
  return {
    id: "event-1",
    title: "Coffee run",
    canonicalActivity: "coffee",
    category: "social",
    tags: [],
    startTime: new Date().toISOString(),
    endTime: new Date().toISOString(),
    durationMinutes: 30,
    locationId: "cohon-university-center",
    capacity: 5,
    participantIds: [],
    participantCount: 0,
    isFull: false,
    hostId: "host-1",
    vibe: "Social",
    status: "OPEN",
    createdAt: new Date().toISOString(),
    expiresAt: new Date(Date.now() + 60 * 60_000).toISOString(),
    ...overrides,
  };
}

class FakeEventRepository implements EventRepository {
  retrieveCandidatesCallCount = 0;

  constructor(private events: EventRecord[]) {}

  async retrieveCandidates(_intent: NormalizedIntent, _now: Date, limit: number): Promise<EventRecord[]> {
    this.retrieveCandidatesCallCount += 1;
    return this.events.slice(0, limit);
  }

  async joinIfValid(): Promise<never> {
    throw new Error("recommendationService must never call a write method on EventRepository");
  }

  async create(): Promise<never> {
    throw new Error("recommendationService must never call a write method on EventRepository");
  }

  async getById(): Promise<never> {
    throw new Error("recommendationService must never call getById");
  }

  async listOpen(): Promise<never> {
    throw new Error("recommendationService must never call listOpen");
  }
}

class FakeCacheService implements CacheService {
  private store = new Map<string, unknown>();

  async get<T>(key: string): Promise<T | null> {
    return (this.store.get(key) as T | undefined) ?? null;
  }

  async set<T>(key: string, value: T): Promise<void> {
    this.store.set(key, value);
  }
}

const passthroughCollaborators: ScoringCollaborators = {
  activityScore: (intentIds, candidateId) => (intentIds.includes(candidateId) ? 1 : 0),
  timeScore: () => 1,
  locationScore: (intentIds, eventLocationId) => (intentIds.includes(eventLocationId) ? 1 : 0),
};

function makeIntent(overrides: Partial<NormalizedIntent> = {}): NormalizedIntent {
  return {
    activityIds: ["coffee"],
    categoryIds: [],
    tags: [],
    locationIds: ["cohon-university-center"],
    ...overrides,
  };
}

describe("DefaultRecommendationService", () => {
  let metrics: InMemoryMetricsService;

  beforeEach(() => {
    metrics = new InMemoryMetricsService();
  });

  it("returns [] without touching the repository when activityIds is empty", async () => {
    const repository = new FakeEventRepository([makeEvent({ id: "e1" })]);
    const service = new DefaultRecommendationService(repository, new FakeCacheService(), passthroughCollaborators, metrics);

    const result = await service.recommend(makeIntent({ activityIds: [] }));

    expect(result).toEqual([]);
    expect(repository.retrieveCandidatesCallCount).toBe(0);
  });

  it("ranks candidates by descending score", async () => {
    const strongMatch = makeEvent({
      id: "strong",
      canonicalActivity: "coffee",
      locationId: "cohon-university-center",
      participantCount: 3,
      capacity: 5, // fillRatio 0.6 -> eventQualityScore 1
    });
    const weakMatch = makeEvent({
      id: "weak",
      canonicalActivity: "basketball", // won't match intent.activityIds
      locationId: "gates-hillman", // won't match intent.locationIds
      participantCount: 0,
      capacity: 5,
    });

    const repository = new FakeEventRepository([weakMatch, strongMatch]);
    const service = new DefaultRecommendationService(repository, new FakeCacheService(), passthroughCollaborators, metrics);

    const result = await service.recommend(makeIntent());

    expect(result.map((c) => c.event.id)).toEqual(["strong", "weak"]);
    expect(result[0].breakdown.total).toBeGreaterThan(result[1].breakdown.total);
  });

  it("short-circuits on a cache hit without calling the repository again", async () => {
    const repository = new FakeEventRepository([makeEvent({ id: "e1" })]);
    const cache = new FakeCacheService();
    const service = new DefaultRecommendationService(repository, cache, passthroughCollaborators, metrics);
    const intent = makeIntent();
    const now = new Date();

    const first = await service.recommend(intent, now);
    expect(repository.retrieveCandidatesCallCount).toBe(1);

    const second = await service.recommend(intent, now);
    expect(repository.retrieveCandidatesCallCount).toBe(1); // no second retrieval
    expect(second).toEqual(first);
  });

  it("returns a small, deterministic, diverse activity list for suggestActivities", async () => {
    const repository = new FakeEventRepository([]);
    const service = new DefaultRecommendationService(repository, new FakeCacheService(), passthroughCollaborators, metrics);

    const first = await service.suggestActivities("user-1");
    const second = await service.suggestActivities("user-1");

    expect(first).toEqual(second);
    expect(first.length).toBeGreaterThan(0);
    expect(new Set(first).size).toBe(first.length); // no duplicates
  });
});
