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
  const isMentioned = (term: string) =>
    normalizedText === term || normalizedText.includes(` ${term} `) || normalizedText.startsWith(`${term} `) || normalizedText.endsWith(` ${term}`);
  const direct = synonyms[normalizedText] ?? (normalizedText in taxonomy ? normalizedText : undefined);
  const synonymTerm = Object.keys(synonyms).sort((a, b) => b.length - a.length).find(isMentioned);
  const taxonomyTerm = Object.keys(taxonomy).sort((a, b) => b.length - a.length).find(isMentioned);
  const resolvedActivity = direct ?? (synonymTerm ? synonyms[synonymTerm] : undefined) ?? taxonomyTerm;
  if (!resolvedActivity) return null;

  const node = taxonomy[resolvedActivity];
  if (!node) return null;

  const tags = [resolvedActivity];
  if (node.parent) tags.push(node.parent);

  return { canonicalActivity: resolvedActivity, category: node.category, tags };
}
