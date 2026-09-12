import type { EventRecord, NormalizedIntent, ScoreBreakdown } from "shared-types";
import { weights } from "../../config/index.js";
import { eventQualityScore } from "./eventQualityScore.js";
import { tagScore } from "./tagScore.js";

/** The non-scoring collaborators scoreCandidate needs — activity/time/
 * location similarity are owned by other agents' modules (taxonomy/, time/,
 * location/). This file never imports them directly; callers inject
 * whatever concrete (or fake) implementation is available. */
export interface ScoringCollaborators {
  activityScore: (intentActivityIds: string[], candidateActivityId: string) => number;
  timeScore: (
    intent: { startTime?: string; endTime?: string },
    event: { startTime: string; endTime: string }
  ) => number;
  locationScore: (intentLocationIds: string[], eventLocationId: string) => number;
}

/** Combines the five sub-scores into the weighted total, per
 * ../../config/weights.json. Pure and deterministic given its collaborators. */
export function scoreCandidate(
  intent: NormalizedIntent,
  event: EventRecord,
  collaborators: ScoringCollaborators
): ScoreBreakdown {
  const activityScore = collaborators.activityScore(intent.activityIds, event.canonicalActivity);
  const timeScore = collaborators.timeScore(
    { startTime: intent.startTime, endTime: intent.endTime },
    { startTime: event.startTime, endTime: event.endTime }
  );
  const locationScore = collaborators.locationScore(intent.locationIds, event.locationId);
  const tagScoreValue = tagScore(intent.tags, event.tags);
  const eventQualityScoreValue = eventQualityScore(event);

  const total =
    weights.activity * activityScore +
    weights.time * timeScore +
    weights.location * locationScore +
    weights.tag * tagScoreValue +
    weights.eventQuality * eventQualityScoreValue;

  return {
    activityScore,
    timeScore,
    locationScore,
    tagScore: tagScoreValue,
    eventQualityScore: eventQualityScoreValue,
    total,
  };
}
