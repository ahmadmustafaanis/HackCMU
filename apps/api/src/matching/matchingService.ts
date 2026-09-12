import type {
  AvailabilityService,
  EventRecord,
  EventRepository,
  MatchResult,
  MatchingService,
  NormalizedIntent,
  SemanticParser,
  UserProfileService,
  Vibe,
} from "shared-types";
import { getDurationMinutes as defaultGetDurationMinutes, thresholds } from "../config/index.js";
import { withFallback } from "../shared/withFallback.js";
import type { InMemoryMetricsService } from "./observability/metricsService.js";
import { scoreCandidate, type ScoringCollaborators } from "./scoring/scoreCandidate.js";

/** Deliberately not importing Agent C's real idempotency-store class — this
 * is the shape any implementation (or test fake) must satisfy. `runOnce`
 * must invoke `fn` at most once per key within `ttlMs` and return the same
 * settled result to every caller that raced in with the same key. */
export interface IdempotencyRunner {
  runOnce<T>(key: string, ttlMs: number, fn: () => Promise<T>): Promise<T>;
}

export interface MatchingServiceConfig {
  matchThreshold: number;
  getDurationMinutes: (canonicalActivity: string) => number;
  idempotencyTtlMs: number;
}

const DEFAULT_EVENT_CAPACITY = 4;
const CREATED_EVENT_WINDOW_MS = 2 * 60 * 60_000; // 2 hours

function union(a: string[], b: string[]): string[] {
  return Array.from(new Set([...a, ...b]));
}

function capitalize(text: string): string {
  return text.length === 0 ? text : text[0]!.toUpperCase() + text.slice(1);
}

/** Small non-cryptographic string hash, only ever used to shorten an
 * idempotency-key fallback derived from intent contents — never a security
 * boundary. */
function hashString(input: string): string {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    hash = (hash * 31 + input.charCodeAt(i)) | 0;
  }
  return (hash >>> 0).toString(36);
}

/** Derives a stable key for callers that didn't supply an idempotencyKey:
 * same user + same intent contents + same coarse (1-minute) time bucket
 * collapse into one key, so accidental double-submits (e.g. a double-tapped
 * button) within that window are deduplicated too. */
function deriveFallbackIdempotencyKey(userId: string, intent: NormalizedIntent, now: Date): string {
  const bucket = Math.floor(now.getTime() / 60_000);
  const raw = JSON.stringify({
    activityIds: [...intent.activityIds].sort(),
    categoryIds: [...intent.categoryIds].sort(),
    tags: [...intent.tags].sort(),
    locationIds: [...intent.locationIds].sort(),
    startTime: intent.startTime ?? null,
    sourceText: intent.sourceText ?? null,
  });
  return `match:${userId}:${bucket}:${hashString(raw)}`;
}

/**
 * Core authoritative matching path: merge free-text semantics (if any) into
 * the structured intent, resolve a concrete time window, score open events,
 * and either join the best one or create a new one. See
 * apps/api/src/matching/CLAUDE.md for the full pipeline diagram and the
 * LLM-minimization invariant this class must respect.
 */
export class DefaultMatchingService implements MatchingService {
  constructor(
    private readonly eventRepository: EventRepository,
    private readonly semanticParser: SemanticParser,
    private readonly availabilityService: AvailabilityService,
    private readonly userProfileService: UserProfileService,
    private readonly idempotencyRunner: IdempotencyRunner,
    private readonly scoringCollaborators: ScoringCollaborators,
    private readonly metrics: Pick<InMemoryMetricsService, "recordCandidateCount" | "recordMatchScore" | "recordMatchOutcome">,
    private readonly config: MatchingServiceConfig = {
      matchThreshold: thresholds.matchThreshold,
      getDurationMinutes: defaultGetDurationMinutes,
      idempotencyTtlMs: thresholds.idempotencyTtlMs,
    }
  ) {}

  async match(userId: string, intent: NormalizedIntent, idempotencyKey?: string): Promise<MatchResult> {
    const now = new Date();
    const key = idempotencyKey ?? deriveFallbackIdempotencyKey(userId, intent, now);

    return this.idempotencyRunner.runOnce(key, this.config.idempotencyTtlMs, () => this.runMatch(userId, intent, now));
  }

  private async runMatch(userId: string, intent: NormalizedIntent, now: Date): Promise<MatchResult> {
    const mergedIntent = await this.mergeSemanticParse(intent);
    const time = await this.resolveTime(userId, mergedIntent, now);
    const resolvedIntent: NormalizedIntent = { ...mergedIntent, startTime: time.startTime, endTime: time.endTime };

    const candidates = await this.eventRepository.retrieveCandidates(resolvedIntent, now, thresholds.maxCandidates);
    this.metrics.recordCandidateCount(candidates.length);

    const scored = candidates
      .map((event) => ({ event, breakdown: scoreCandidate(resolvedIntent, event, this.scoringCollaborators) }))
      .sort((a, b) => b.breakdown.total - a.breakdown.total);

    for (const candidate of scored) {
      if (candidate.breakdown.total < this.config.matchThreshold) {
        // Sorted descending — every remaining candidate scores lower still.
        break;
      }

      const joinResult = await this.eventRepository.joinIfValid(candidate.event.id, userId, now);
      if (joinResult.ok) {
        this.metrics.recordMatchScore(candidate.breakdown.total);
        this.metrics.recordMatchOutcome("MATCHED");
        return { outcome: "MATCHED", event: joinResult.event, score: candidate.breakdown.total, breakdown: candidate.breakdown };
      }
      // joinIfValid says this candidate was raced away (filled/closed/expired
      // between scoring and the atomic join) — try the next-best candidate
      // above threshold instead of failing the whole request.
    }

    const created = await this.createEvent(userId, resolvedIntent, time, now);
    this.metrics.recordMatchOutcome("PENDING");
    return { outcome: "PENDING", event: created };
  }

  private async mergeSemanticParse(intent: NormalizedIntent): Promise<NormalizedIntent> {
    if (!intent.sourceText) return intent;

    const parsed = await withFallback(() => this.semanticParser.parse(intent.sourceText), null);
    if (!parsed) return intent;

    // Structured fields win where present — this only ever adds to them
    // (union), never overwrites what the caller already supplied.
    return {
      ...intent,
      activityIds: union(intent.activityIds, parsed.canonicalActivity ? [parsed.canonicalActivity] : []),
      categoryIds: union(intent.categoryIds, parsed.category ? [parsed.category] : []),
      tags: union(intent.tags, parsed.tags ?? []),
    };
  }

  private async resolveTime(userId: string, intent: NormalizedIntent, now: Date): Promise<{ startTime: string; endTime: string }> {
    const canonicalActivity = intent.activityIds[0] ?? "";
    const durationMinutes = this.config.getDurationMinutes(canonicalActivity);

    if (intent.startTime) {
      const endTime = intent.endTime ?? new Date(new Date(intent.startTime).getTime() + durationMinutes * 60_000).toISOString();
      return { startTime: intent.startTime, endTime };
    }

    const fallback = {
      startTime: now.toISOString(),
      endTime: new Date(now.getTime() + durationMinutes * 60_000).toISOString(),
    };
    return withFallback(() => this.availabilityService.getNextAvailableSlot(userId, durationMinutes), fallback);
  }

  private async resolveVibe(userId: string): Promise<Vibe> {
    const profile = await withFallback(() => this.userProfileService.getProfile(userId), null);
    return profile?.vibes[0] ?? "Casual";
  }

  private async createEvent(
    userId: string,
    intent: NormalizedIntent,
    time: { startTime: string; endTime: string },
    now: Date
  ): Promise<EventRecord> {
    const canonicalActivity = intent.activityIds[0] ?? "activity";
    const category = intent.categoryIds[0] ?? "general";
    const vibe = await this.resolveVibe(userId);
    const createdAt = now.toISOString();
    const expiresAt = new Date(now.getTime() + CREATED_EVENT_WINDOW_MS).toISOString();

    return this.eventRepository.create({
      title: capitalize(canonicalActivity),
      canonicalActivity,
      category,
      tags: intent.tags,
      sourceText: intent.sourceText,
      startTime: time.startTime,
      endTime: time.endTime,
      durationMinutes: this.config.getDurationMinutes(canonicalActivity),
      locationId: intent.locationIds[0] ?? "unknown",
      capacity: DEFAULT_EVENT_CAPACITY,
      participantIds: [userId],
      participantCount: 1,
      isFull: false,
      hostId: userId,
      vibe,
      status: "OPEN",
      createdAt,
      expiresAt,
    });
  }
}
