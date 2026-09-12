import { taxonomy, weights } from "../../config/index.js";

/** Pairwise similarity between two canonical activity ids, in [0,1].
 *
 * Resolution order (first match wins):
 *   1. identical id                              -> exact
 *   2. one is the declared taxonomy `parent` of the other -> parentChild
 *   3. same declared `parent` (siblings), OR one lists the other in
 *      its `related` list                        -> sibling
 *   4. same `category` (fallback)                 -> sameCategory
 *   5. anything else, including an unknown id on either side -> unrelated
 *
 * Never throws — an unrecognized activity id degrades to `unrelated`
 * rather than blowing up the ranking pipeline. */
export function activitySimilarity(a: string, b: string): number {
  const { exact, parentChild, sibling, sameCategory, unrelated } = weights.taxonomySimilarity;

  if (a === b) return exact;

  const nodeA = taxonomy[a];
  const nodeB = taxonomy[b];
  if (!nodeA || !nodeB) return unrelated;

  if (nodeA.parent === b || nodeB.parent === a) return parentChild;

  const sameDeclaredParent = Boolean(nodeA.parent) && nodeA.parent === nodeB.parent;
  const listedAsRelated = Boolean(nodeA.related?.includes(b)) || Boolean(nodeB.related?.includes(a));
  if (sameDeclaredParent || listedAsRelated) return sibling;

  if (nodeA.category === nodeB.category) return sameCategory;

  return unrelated;
}

/** Best (max) similarity between any of the intent's chosen activity ids
 * and a single candidate activity id. 0 when the intent has no activity
 * ids at all (nothing to compare against). */
export function bestActivityScore(intentActivityIds: string[], candidateActivityId: string): number {
  if (intentActivityIds.length === 0) return 0;
  return Math.max(...intentActivityIds.map((id) => activitySimilarity(id, candidateActivityId)));
}
