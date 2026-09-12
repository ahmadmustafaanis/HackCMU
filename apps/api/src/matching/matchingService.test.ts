import { beforeEach, describe, expect, it } from "vitest";
import type {
  AvailabilityService,
  EventRecord,
  EventRepository,
  JoinResult,
  NormalizedIntent,
  SemanticParseResult,
  SemanticParser,
  Student,
  UserProfileService,
} from "shared-types";
import { InMemoryMetricsService } from "./observability/metricsService.js";
import { DefaultMatchingService, type IdempotencyRunner } from "./matchingService.js";
import type { ScoringCollaborators } from "./scoring/scoreCandidate.js";

function makeEvent(overrides: Partial<EventRecord>): EventRecord {
  return {
    id: overrides.id ?? "event-1",
    title: "Coffee run",
    canonicalActivity: "coffee",
    category: "social",
    tags: ["chill"],
    startTime: new Date().toISOString(),
    endTime: new Date(Date.now() + 30 * 60_000).toISOString(),
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
    expiresAt: new Date(Date.now() + 60 * 60_000).toISOString(),
    ...overrides,
  };
}

function makeIntent(overrides: Partial<NormalizedIntent> = {}): NormalizedIntent {
  return {
    activityIds: ["coffee"],
    categoryIds: ["social"],
    tags: ["chill"],
    locationIds: ["cohon-university-center"],
    ...overrides,
  };
}

class FakeEventRepository implements EventRepository {
  createCallCount = 0;
  lastRetrievedIntent: NormalizedIntent | undefined;
  /** eventId -> queue of JoinResults to return in order (simulates a race
   * by returning a failure once, then success on a later attempt). */
  joinResultQueue = new Map<string, JoinResult[]>();

  constructor(private events: EventRecord[]) {}

  async retrieveCandidates(intent: NormalizedIntent, _now: Date, limit: number): Promise<EventRecord[]> {
    this.lastRetrievedIntent = intent;
    return this.events.slice(0, limit);
  }

  async joinIfValid(eventId: string, userId: string, _now: Date): Promise<JoinResult> {
    const queued = this.joinResultQueue.get(eventId);
    if (queued && queued.length > 0) {
      return queued.shift()!;
    }
    const event = this.events.find((e) => e.id === eventId);
    if (!event) return { ok: false, reason: "NOT_FOUND" };
    const joined: EventRecord = {
      ...event,
      participantIds: [...event.participantIds, userId],
      participantCount: event.participantCount + 1,
    };
    return { ok: true, event: joined };
  }

  async create(event: Omit<EventRecord, "id">): Promise<EventRecord> {
    this.createCallCount += 1;
    const created: EventRecord = { ...event, id: `created-${this.createCallCount}` };
    this.events.push(created);
    return created;
  }

  async getById(eventId: string): Promise<EventRecord | null> {
    return this.events.find((e) => e.id === eventId) ?? null;
  }

  async listOpen(_now: Date, limit: number): Promise<EventRecord[]> {
    return this.events.filter((e) => e.status === "OPEN").slice(0, limit);
  }

  async listForUser(): Promise<EventRecord[]> {
    return [];
  }
}

class FakeSemanticParser implements SemanticParser {
  constructor(private result: SemanticParseResult | null = null) {}

  async parse(_sourceText?: string): Promise<SemanticParseResult | null> {
    return this.result;
  }
}

class FakeAvailabilityService implements AvailabilityService {
  constructor(
    private slot: { startTime: string; endTime: string } = {
      startTime: new Date().toISOString(),
      endTime: new Date(Date.now() + 30 * 60_000).toISOString(),
    }
  ) {}

  async getNextAvailableSlot(_userId: string, _durationMinutes: number): Promise<{ startTime: string; endTime: string }> {
    return this.slot;
  }
}

function makeStudent(overrides: Partial<Student> = {}): Student {
  return {
    id: "user-1",
    name: "Test Student",
    initials: "TS",
    program: "CS",
    year: "Junior",
    bio: "",
    interests: [],
    vibes: ["Chill"],
    preferredActivities: [],
    approximateLocation: "Cohon University Center",
    walkingMinutes: 5,
    availabilityLabel: "Flexible",
    ...overrides,
  };
}

class FakeUserProfileService implements UserProfileService {
  constructor(private student: Student = makeStudent()) {}

  async getProfile(_userId: string): Promise<Student> {
    return this.student;
  }
}

/** `{ runOnce: (key, ttl, fn) => fn() }` — no dedup, for tests that don't
 * care about idempotency. */
const passthroughIdempotencyRunner: IdempotencyRunner = {
  runOnce: (_key, _ttlMs, fn) => fn(),
};

/** Dedups by key for the life of the test (ttl ignored) so we can assert
 * `fn` was invoked exactly once across repeated calls with the same key. */
class RecordingIdempotencyRunner implements IdempotencyRunner {
  fnInvocationCount = 0;
  private results = new Map<string, Promise<unknown>>();

  async runOnce<T>(key: string, _ttlMs: number, fn: () => Promise<T>): Promise<T> {
    const existing = this.results.get(key);
    if (existing) return existing as Promise<T>;
    this.fnInvocationCount += 1;
    const promise = fn();
    this.results.set(key, promise);
    return promise;
  }
}

const passthroughCollaborators: ScoringCollaborators = {
  activityScore: (intentIds, candidateId) => (intentIds.includes(candidateId) ? 1 : 0),
  timeScore: () => 1,
  locationScore: (intentIds, eventLocationId) => (intentIds.includes(eventLocationId) ? 1 : 0),
};

describe("DefaultMatchingService", () => {
  let metrics: InMemoryMetricsService;

  beforeEach(() => {
    metrics = new InMemoryMetricsService();
  });

  function buildService(repository: EventRepository, opts: Partial<{ idempotencyRunner: IdempotencyRunner; semanticParser: SemanticParser; availabilityService: AvailabilityService; userProfileService: UserProfileService }> = {}) {
    return new DefaultMatchingService(
      repository,
      opts.semanticParser ?? new FakeSemanticParser(null),
      opts.availabilityService ?? new FakeAvailabilityService(),
      opts.userProfileService ?? new FakeUserProfileService(),
      opts.idempotencyRunner ?? passthroughIdempotencyRunner,
      passthroughCollaborators,
      metrics
    );
  }

  it("joins a high-scoring existing event (MATCHED)", async () => {
    const event = makeEvent({ id: "great-event" });
    const repository = new FakeEventRepository([event]);
    const service = buildService(repository);

    const result = await service.match("user-1", makeIntent());

    expect(result.outcome).toBe("MATCHED");
    expect(result.event.id).toBe("great-event");
    expect(result.event.participantIds).toContain("user-1");
    expect(repository.createCallCount).toBe(0);
  });

  it("creates a new event with the creator auto-participating when nothing compatible exists", async () => {
    const repository = new FakeEventRepository([]); // no candidates at all
    const service = buildService(repository);

    const result = await service.match("user-1", makeIntent());

    expect(result.outcome).toBe("PENDING");
    expect(repository.createCallCount).toBe(1);
    expect(result.event.hostId).toBe("user-1");
    expect(result.event.participantIds).toEqual(["user-1"]);
    expect(result.event.participantCount).toBe(1);
    expect(result.event.status).toBe("OPEN");
  });

  it("does not double-create for identical repeated calls sharing an idempotency key", async () => {
    const repository = new FakeEventRepository([]);
    const runner = new RecordingIdempotencyRunner();
    const service = buildService(repository, { idempotencyRunner: runner });
    const intent = makeIntent();

    const first = await service.match("user-1", intent, "same-key");
    const second = await service.match("user-1", intent, "same-key");

    expect(runner.fnInvocationCount).toBe(1);
    expect(repository.createCallCount).toBe(1);
    expect(second).toEqual(first);
  });

  it("falls through to the next-best candidate when the top join is raced away", async () => {
    const best = makeEvent({ id: "best", tags: ["chill"] });
    const secondBest = makeEvent({ id: "second-best", tags: ["chill"], participantCount: 3, capacity: 5 });
    const repository = new FakeEventRepository([best, secondBest]);
    // Simulate another user filling `best` between scoring and our join.
    repository.joinResultQueue.set("best", [{ ok: false, reason: "FULL" }]);

    const service = buildService(repository);
    const result = await service.match("user-1", makeIntent());

    expect(result.outcome).toBe("MATCHED");
    expect(result.event.id).toBe("second-best");
    expect(repository.createCallCount).toBe(0);
  });

  it("falls through to create when every above-threshold candidate is raced away", async () => {
    const only = makeEvent({ id: "only" });
    const repository = new FakeEventRepository([only]);
    repository.joinResultQueue.set("only", [{ ok: false, reason: "FULL" }]);

    const service = buildService(repository);
    const result = await service.match("user-1", makeIntent());

    expect(result.outcome).toBe("PENDING");
    expect(repository.createCallCount).toBe(1);
  });

  it("merges a semantic parse into the intent when free text is given and structured fields are absent", async () => {
    const repository = new FakeEventRepository([]);
    const parser = new FakeSemanticParser({ canonicalActivity: "coding", category: "coding", tags: ["robotics"], confidence: 0.9 });
    const service = buildService(repository, { semanticParser: parser });

    await service.match("user-1", makeIntent({ activityIds: [], categoryIds: [], tags: [], sourceText: "work on my robotics project" }));

    expect(repository.lastRetrievedIntent?.activityIds).toContain("coding");
    expect(repository.lastRetrievedIntent?.tags).toContain("robotics");
  });

  it("proceeds with structured data when the semantic parser returns null", async () => {
    const event = makeEvent({ id: "great-event" });
    const repository = new FakeEventRepository([event]);
    const parser = new FakeSemanticParser(null);
    const service = buildService(repository, { semanticParser: parser });

    const result = await service.match("user-1", makeIntent({ sourceText: "something novel" }));

    expect(result.outcome).toBe("MATCHED");
  });
});
