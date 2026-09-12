// Service interfaces (spec §33). Every parallel implementation agent builds
// against these exact signatures — do not change a signature without
// updating every caller. Implementations live in apps/api/src/matching/*.

import type { Student } from "./domain.js";
import type {
  EventRecord,
  JoinResult,
  NormalizedIntent,
  ScoredCandidate,
  SemanticParseResult,
} from "./matching.js";

export interface EventRepository {
  /** Stage-1 candidate retrieval: cheap, indexed, bounded. Must filter
   * status=OPEN and expiresAt>now at query time — never trust a
   * background sweep alone. */
  retrieveCandidates(intent: NormalizedIntent, now: Date, limit: number): Promise<EventRecord[]>;
  /** Atomic: revalidates OPEN/not-expired/has-capacity/not-already-joined
   * and mutates in a single operation. Must never be a separate
   * read-then-write. */
  joinIfValid(eventId: string, userId: string, now: Date): Promise<JoinResult>;
  create(event: Omit<EventRecord, "id">): Promise<EventRecord>;
  getById(eventId: string): Promise<EventRecord | null>;
  /** For the read-only demo/browse surface (Discover, GET /api/activities).
   * Must hide events whose startTime has already passed. */
  listOpen(now: Date, limit: number): Promise<EventRecord[]>;
  listForUser(userId: string, now: Date, limit: number): Promise<EventRecord[]>;
}

export interface CacheService {
  get<T>(key: string): Promise<T | null>;
  set<T>(key: string, value: T, ttlMs: number): Promise<void>;
}

export interface LlmClient {
  /** The SemanticParser's only real-API touchpoint. Must throw on
   * failure/timeout rather than returning a partial/invalid result —
   * SemanticParser is responsible for catching and falling back. */
  parseActivityText(normalizedText: string): Promise<SemanticParseResult>;
}

export interface SemanticParser {
  /** Deterministic-first: synonym hit or semantic-cache hit both return
   * with zero LLM calls. Returns null (never throws) if free text is
   * empty, or if the LLM call fails/times out/returns invalid data —
   * callers fall back to structured activity ids in that case. */
  parse(sourceText?: string): Promise<SemanticParseResult | null>;
}

export interface AvailabilityService {
  /** Used only when no explicit/relative time was given. Must never be
   * called from the real-time recommendation path. */
  getNextAvailableSlot(userId: string, durationMinutes: number): Promise<{ startTime: string; endTime: string }>;
}

export interface LocationService {
  resolveNearestLocation(latitude: number, longitude: number): string;
  /** Best-of compatibility score in [0,1] between selected intent
   * locations and a single event location. */
  locationScore(intentLocationIds: string[], eventLocationId: string): number;
}

export interface UserProfileService {
  /** The ONLY source of truth for profile data used in matching — never
   * trust profile fields supplied by the client. */
  getProfile(userId: string): Promise<Student>;
}

export interface MetricsService {
  recordLlmCall(latencyMs: number): void;
  recordLlmCacheHit(): void;
  recordLlmFailure(err: unknown): void;
  recordRecommendationLatency(latencyMs: number): void;
  recordCandidateCount(n: number): void;
  recordMatchScore(score: number): void;
  recordMatchOutcome(outcome: "MATCHED" | "PENDING"): void;
  recordRecommendationCacheHit(hit: boolean): void;
  /** llmCalls / totalMatchingRequests — the spec's headline ratio. */
  snapshot(): {
    llmCallCount: number;
    llmCacheHitRate: number;
    recommendationCacheHitRate: number;
    matchSuccessRate: number;
    llmCallsPerMatchingRequest: number;
  };
}

export interface RecommendationService {
  /** Real-time path. MUST be read-only and MUST NOT reach SemanticParser,
   * AvailabilityService resolution, or any EventRepository write method —
   * structurally, not just "isn't called in this test." */
  recommend(intent: NormalizedIntent, now?: Date): Promise<ScoredCandidate[]>;
  /** Deterministic personalized activity-button suggestions, with a
   * diversity cap (at most one per taxonomy category). */
  suggestActivities(userId: string, now?: Date): Promise<string[]>;
}

export interface MatchingService {
  /** Core authoritative path: semantic parse (if needed) → resolve time/
   * location → candidate retrieval → hard filter → rank → transactional
   * join-or-create. Idempotent per (userId, idempotencyKey). */
  match(userId: string, intent: NormalizedIntent, idempotencyKey?: string, forceCreate?: boolean): Promise<import("./matching.js").MatchResult>;
}
