/** Jaccard index between an intent's free-form tags and an event's tags:
 * |intersection| / |union|. Both empty, or either empty, yields 0 — there is
 * no meaningful overlap to reward when one side has nothing to compare. */
export function tagScore(intentTags: string[], eventTags: string[]): number {
  if (intentTags.length === 0 || eventTags.length === 0) return 0;

  const a = new Set(intentTags);
  const b = new Set(eventTags);

  let intersectionSize = 0;
  for (const tag of a) {
    if (b.has(tag)) intersectionSize += 1;
  }

  const unionSize = new Set([...a, ...b]).size;
  if (unionSize === 0) return 0;

  return intersectionSize / unionSize;
}
