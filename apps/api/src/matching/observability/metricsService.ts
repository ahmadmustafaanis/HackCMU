import type { MetricsService } from "shared-types";

function rate(numerator: number, denominator: number): number {
  return denominator === 0 ? 0 : numerator / denominator;
}

/** Plain in-memory counters — no external calls, no persistence, no
 * unbounded growth of anything but a few numeric arrays. Never logs the
 * actual content of an error (which may carry user-supplied free text);
 * failures only ever increment a counter. */
export class InMemoryMetricsService implements MetricsService {
  private llmCallCount = 0;
  private llmCallLatenciesMs: number[] = [];
  private llmCacheHitCount = 0;
  private llmFailureCount = 0;

  private recommendationLatenciesMs: number[] = [];
  private candidateCounts: number[] = [];
  private matchScores: number[] = [];

  private matchedOutcomeCount = 0;
  private pendingOutcomeCount = 0;

  private recommendationCacheHitCount = 0;
  private recommendationCacheMissCount = 0;

  recordLlmCall(latencyMs: number): void {
    this.llmCallCount += 1;
    this.llmCallLatenciesMs.push(latencyMs);
  }

  recordLlmCacheHit(): void {
    this.llmCacheHitCount += 1;
  }

  recordLlmFailure(_err: unknown): void {
    this.llmFailureCount += 1;
  }

  recordRecommendationLatency(latencyMs: number): void {
    this.recommendationLatenciesMs.push(latencyMs);
  }

  recordCandidateCount(n: number): void {
    this.candidateCounts.push(n);
  }

  recordMatchScore(score: number): void {
    this.matchScores.push(score);
  }

  recordMatchOutcome(outcome: "MATCHED" | "PENDING"): void {
    if (outcome === "MATCHED") {
      this.matchedOutcomeCount += 1;
    } else {
      this.pendingOutcomeCount += 1;
    }
  }

  recordRecommendationCacheHit(hit: boolean): void {
    if (hit) {
      this.recommendationCacheHitCount += 1;
    } else {
      this.recommendationCacheMissCount += 1;
    }
  }

  snapshot(): {
    llmCallCount: number;
    llmCacheHitRate: number;
    recommendationCacheHitRate: number;
    matchSuccessRate: number;
    llmCallsPerMatchingRequest: number;
  } {
    const totalMatchingRequests = this.matchedOutcomeCount + this.pendingOutcomeCount;
    const totalLlmLookups = this.llmCacheHitCount + this.llmCallCount + this.llmFailureCount;
    const totalRecommendationLookups = this.recommendationCacheHitCount + this.recommendationCacheMissCount;

    return {
      llmCallCount: this.llmCallCount,
      llmCacheHitRate: rate(this.llmCacheHitCount, totalLlmLookups),
      recommendationCacheHitRate: rate(this.recommendationCacheHitCount, totalRecommendationLookups),
      matchSuccessRate: rate(this.matchedOutcomeCount, totalMatchingRequests),
      llmCallsPerMatchingRequest: rate(this.llmCallCount, totalMatchingRequests),
    };
  }
}
