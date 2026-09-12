import type { CacheService, EventRepository, NormalizedIntent, RecommendationService, ScoredCandidate } from "shared-types";
import { thresholds } from "../config/index.js";
import type { InMemoryMetricsService } from "./observability/metricsService.js";
import { scoreCandidate, type ScoringCollaborators } from "./scoring/scoreCandidate.js";

const TOP_N = 10;

/** Coarse, bucketed cache key so near-simultaneous identical requests share
 * a cache entry. Deliberately duplicated here (not imported) from the cache
 * module's own key builder — see apps/api/src/matching/CLAUDE.md and the
 * repo's parallel-safety rule against cross-agent-area imports. Bucketing on
 * time keeps the key small and stable within a short window. */
function buildCacheKey(intent: NormalizedIntent, now: Date): string {
  const bucket = Math.floor(now.getTime() / thresholds.recommendationCacheBucketMs);
  const activity = [...intent.activityIds].sort().join(",");
  const location = [...intent.locationIds].sort().join(",");
  const tags = [...intent.tags].sort().join(",");
  return `rec:${activity}|${location}|${tags}|${bucket}`;
}

/**
 * Real-time recommendation path (spec: "Real-time path boundary").
 *
 * This class is structurally LLM-free and read-only: it has no
 * SemanticParser or AvailabilityService dependency in scope at all (there is
 * no such constructor parameter — that absence *is* the guarantee, not just
 * a runtime check), and it touches EventRepository only through
 * retrieveCandidates, never a write method.
 */
export class DefaultRecommendationService implements RecommendationService {
  constructor(
    private readonly eventRepository: EventRepository,
    private readonly cache: CacheService,
    private readonly scoringCollaborators: ScoringCollaborators,
    private readonly metrics: Pick<
      InMemoryMetricsService,
      "recordRecommendationCacheHit" | "recordCandidateCount" | "recordRecommendationLatency"
    >,
    private readonly maxCandidates: number = thresholds.maxCandidates
  ) {}

  async recommend(intent: NormalizedIntent, now: Date = new Date()): Promise<ScoredCandidate[]> {
    if (intent.activityIds.length === 0) {
      return [];
    }

    const start = Date.now();
    const cacheKey = buildCacheKey(intent, now);

    const cached = await this.cache.get<ScoredCandidate[]>(cacheKey);
    if (cached) {
      this.metrics.recordRecommendationCacheHit(true);
      return cached;
    }
    this.metrics.recordRecommendationCacheHit(false);

    const candidates = await this.eventRepository.retrieveCandidates(intent, now, this.maxCandidates);
    this.metrics.recordCandidateCount(candidates.length);

    const scored: ScoredCandidate[] = candidates
      .map((event) => ({ event, breakdown: scoreCandidate(intent, event, this.scoringCollaborators) }))
      .sort((a, b) => b.breakdown.total - a.breakdown.total)
      .slice(0, TOP_N);

    await this.cache.set(cacheKey, scored, thresholds.recommendationCacheTtlMs);
    this.metrics.recordRecommendationLatency(Date.now() - start);

    return scored;
  }

  async suggestActivities(_userId: string, _now: Date = new Date()): Promise<string[]> {
    // Deterministic placeholder: one canonical activity per taxonomy
    // category (fitness/coding/art/study/social), so the diversity cap is
    // satisfied by construction. A real profile-driven ranking can replace
    // this body later without touching the RecommendationService interface.
    return ["workout", "coding", "drawing", "studying", "coffee"];
  }
}
