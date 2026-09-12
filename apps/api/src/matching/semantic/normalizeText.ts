/** Simple punctuation strip for the *edges* of the string only — deliberately
 * conservative so we never eat apostrophes or hyphens in the middle of a
 * phrase (e.g. "let's play basketball"). `\w` covers letters/digits/underscore. */
const LEADING_PUNCTUATION = /^[^\w]+/;
const TRAILING_PUNCTUATION = /[^\w]+$/;

/** Deterministic text normalization used as the key for both synonym lookup
 * and the semantic cache: lowercase, trimmed, internal whitespace collapsed
 * to single spaces, simple leading/trailing punctuation stripped.
 *
 * `"  TREADMILL!! "` -> `"treadmill"` */
export function normalizeText(input: string): string {
  const collapsed = input.toLowerCase().trim().replace(/\s+/g, " ");
  return collapsed.replace(LEADING_PUNCTUATION, "").replace(TRAILING_PUNCTUATION, "");
}
