import durationsJson from "./durations.json" with { type: "json" };
import locationsJson from "./locations.json" with { type: "json" };
import synonymsJson from "./synonyms.json" with { type: "json" };
import taxonomyJson from "./taxonomy.json" with { type: "json" };
import thresholdsJson from "./thresholds.json" with { type: "json" };
import weightsJson from "./weights.json" with { type: "json" };

export interface TaxonomyNode {
  category: string;
  parent?: string;
  related?: string[];
}

export interface CanonicalLocation {
  id: string;
  name: string;
  lat: number;
  lng: number;
}

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(`[config] invalid configuration: ${message}`);
}

function validateWeights(weights: typeof weightsJson): void {
  const sum = weights.activity + weights.time + weights.location + weights.tag + weights.eventQuality;
  assert(Math.abs(sum - 1.0) < 1e-6, `scoring weights must sum to 1.0, got ${sum}`);
  for (const [key, value] of Object.entries(weights.taxonomySimilarity)) {
    assert(value >= 0 && value <= 1, `taxonomySimilarity.${key} must be in [0,1], got ${value}`);
  }
}

function validateThresholds(thresholds: typeof thresholdsJson): void {
  assert(
    thresholds.matchThreshold >= 0 && thresholds.matchThreshold <= 1,
    `matchThreshold must be in [0,1], got ${thresholds.matchThreshold}`
  );
  assert(thresholds.timeToleranceMinutes > 0, "timeToleranceMinutes must be positive");
  assert(thresholds.maxCandidates > 0, "maxCandidates must be positive");
  for (const [key, value] of Object.entries(thresholds.locationBucketScores)) {
    assert(value >= 0 && value <= 1, `locationBucketScores.${key} must be in [0,1], got ${value}`);
  }
}

function validateTaxonomy(taxonomy: Record<string, TaxonomyNode>, durations: typeof durationsJson): void {
  const ids = new Set(Object.keys(taxonomy));
  for (const [id, node] of Object.entries(taxonomy)) {
    if (node.parent) assert(ids.has(node.parent), `taxonomy.${id}.parent "${node.parent}" is not a known activity id`);
    for (const rel of node.related ?? []) {
      assert(ids.has(rel), `taxonomy.${id}.related "${rel}" is not a known activity id`);
    }
  }
  for (const id of ids) {
    assert(id in durations || "default" in durations, `activity "${id}" has no duration configured`);
  }
}

const taxonomyActivities: Record<string, TaxonomyNode> = taxonomyJson.activities;

validateWeights(weightsJson);
validateThresholds(thresholdsJson);
validateTaxonomy(taxonomyActivities, durationsJson);

export const taxonomy: Record<string, TaxonomyNode> = taxonomyActivities;
export const synonyms: Record<string, string> = synonymsJson;
export const durations: Record<string, number> = durationsJson;
export const weights = weightsJson;
export const thresholds = thresholdsJson;
export const locations: CanonicalLocation[] = locationsJson.locations;

export function getDurationMinutes(canonicalActivity: string): number {
  return durations[canonicalActivity] ?? durations.default;
}
