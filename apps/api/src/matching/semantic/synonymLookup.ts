import { synonyms, taxonomy } from "../../config/index.js";

export interface SynonymLookupResult {
  canonicalActivity: string;
  category: string;
  tags: string[];
}

/** Deterministic, zero-LLM lookup: resolves already-normalized text either
 * as a known synonym key (`synonyms.json`) or, failing that, as a canonical
 * activity id in its own right (e.g. normalized text "treadmill" naming the
 * taxonomy node directly). Returns null on no match — never throws. */
export function synonymLookup(normalizedText: string): SynonymLookupResult | null {
  const canonicalActivity = synonyms[normalizedText] ?? (normalizedText in taxonomy ? normalizedText : undefined);
  if (!canonicalActivity) return null;

  const node = taxonomy[canonicalActivity];
  if (!node) return null;

  const tags = [canonicalActivity];
  if (node.parent) tags.push(node.parent);

  return { canonicalActivity, category: node.category, tags };
}
