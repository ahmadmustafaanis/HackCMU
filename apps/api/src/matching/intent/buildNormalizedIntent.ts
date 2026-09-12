import type { NormalizedIntent } from "shared-types";

export interface BuildNormalizedIntentInput {
  activityIds: string[];
  categoryIds?: string[];
  tags?: string[];
  startTime?: string;
  endTime?: string;
  locationIds: string[];
  sourceText?: string;
}

/** Pure pass-through/defaulting into the canonical NormalizedIntent shape.
 * Semantic merging (free-text -> canonicalActivity/category/tags) happens
 * later in matchingService, not here — this stays a dumb constructor so
 * every caller (routes, matchingService, tests) builds intents identically. */
export function buildNormalizedIntent(input: BuildNormalizedIntentInput): NormalizedIntent {
  return {
    activityIds: input.activityIds,
    categoryIds: input.categoryIds ?? [],
    tags: input.tags ?? [],
    startTime: input.startTime,
    endTime: input.endTime,
    locationIds: input.locationIds,
    sourceText: input.sourceText,
  };
}
