const RECOMMENDATION_BUCKET_WIDTH_MS = 5 * 60 * 1000; // 5 minutes

function normalizeIdList(ids: string[]): string {
  if (ids.length === 0) return "any";
  return Array.from(new Set(ids)).sort().join(",");
}

/** Deterministic cache key for a recommendation request. Two requests with
 * the same (unordered) activity/location id sets whose timestamps fall in
 * the same 5-minute bucket collapse to the same key — this is what makes
 * the recommendation cache actually hit under normal request traffic. */
export function buildRecommendationCacheKey(
  { activityIds, locationIds, time }: { activityIds: string[]; locationIds: string[]; time?: string },
  now: Date
): string {
  const activities = normalizeIdList(activityIds);
  const locations = normalizeIdList(locationIds);
  const effectiveTime = time ? new Date(time) : now;
  const bucket = Math.floor(effectiveTime.getTime() / RECOMMENDATION_BUCKET_WIDTH_MS);
  return `recommendations:${activities}:${locations}:${bucket}`;
}

/** Cache key for the semantic-parse cache — keyed on already-normalized
 * free text so equivalent phrasing (after normalization) shares a cache
 * entry and avoids a redundant LLM call. */
export function semanticCacheKey(normalizedText: string): string {
  return `semantic:${normalizedText}`;
}
