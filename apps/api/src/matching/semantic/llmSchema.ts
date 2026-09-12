import { z } from "zod";
import type { SemanticParseResult } from "shared-types";

/** JSON Schema handed to Gemini as `responseSchema` (with
 * `responseMimeType: "application/json"`) so the model is constrained to
 * emit exactly this shape — no free-form prose, no extra fields. */
export const SEMANTIC_PARSE_JSON_SCHEMA = {
  type: "object",
  properties: {
    canonicalActivity: {
      type: "string",
      description: "The single best-matching canonical activity id from the controlled taxonomy.",
    },
    category: {
      type: "string",
      description: "The taxonomy category that canonicalActivity belongs to.",
    },
    tags: {
      type: "array",
      items: { type: "string" },
      description: "A short list of free-form descriptive tags for the activity.",
    },
    confidence: {
      type: "number",
      description: "The model's confidence in this parse, from 0 (unsure) to 1 (certain).",
    },
  },
  required: ["canonicalActivity", "category", "tags", "confidence"],
} as const;

/** Re-validates the parsed JSON coming back from the LLM before it is
 * trusted anywhere else in the pipeline — the model is asked to conform to
 * `SEMANTIC_PARSE_JSON_SCHEMA` above, but only this zod pass actually
 * guarantees it at the type level. */
export const SemanticParseSchema = z.object({
  canonicalActivity: z.string(),
  category: z.string(),
  tags: z.array(z.string()),
  confidence: z.number().min(0).max(1),
});

// Compile-time guard: keep this schema's inferred shape in lockstep with
// shared-types' SemanticParseResult. If either shape drifts, this line stops
// compiling.
type _SchemaMatchesSharedType = z.infer<typeof SemanticParseSchema> extends SemanticParseResult
  ? SemanticParseResult extends z.infer<typeof SemanticParseSchema>
    ? true
    : never
  : never;
const _schemaMatchesSharedType: _SchemaMatchesSharedType = true;
void _schemaMatchesSharedType;
