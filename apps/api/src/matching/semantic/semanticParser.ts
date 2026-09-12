import type {
  CacheService,
  LlmClient,
  SemanticParseResult,
  SemanticParser as SemanticParserInterface,
} from "shared-types";
import { normalizeText } from "./normalizeText.js";
import { synonymLookup } from "./synonymLookup.js";

const DEFAULT_SEMANTIC_CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

export interface SemanticParserOptions {
  /** Reserved for a future external timeout wrapper around the LLM call;
   * llmClient itself is expected to be quick, so a plain try/catch already
   * bounds failure — this is here so a stricter caller can tighten it
   * without changing the constructor signature. */
  llmTimeoutMs?: number;
  semanticCacheTtlMs?: number;
}

/** Turns free text into a structured `{canonicalActivity, category, tags,
 * confidence}` guess, spending an LLM call only when it truly has to.
 *
 * Resolution order (first hit wins, each earlier step costs zero LLM calls):
 *   1. empty/whitespace-only text -> null
 *   2. deterministic synonym lookup on the normalized text -> confidence 1.0
 *   3. semantic cache hit (keyed on the normalized text)
 *   4. a single LLM call, cached on success
 *
 * Never throws: any LLM failure (including a thrown timeout) is caught and
 * degrades to null so callers fall back to structured activity ids. */
export class SemanticParser implements SemanticParserInterface {
  private readonly llm: LlmClient;
  private readonly cache: CacheService;
  private readonly semanticCacheTtlMs: number;

  constructor(llm: LlmClient, cache: CacheService, opts?: SemanticParserOptions) {
    this.llm = llm;
    this.cache = cache;
    this.semanticCacheTtlMs = opts?.semanticCacheTtlMs ?? DEFAULT_SEMANTIC_CACHE_TTL_MS;
  }

  async parse(sourceText?: string): Promise<SemanticParseResult | null> {
    if (!sourceText || sourceText.trim().length === 0) return null;

    const normalized = normalizeText(sourceText);
    if (normalized.length === 0) return null;

    const synonymHit = synonymLookup(normalized);
    if (synonymHit) {
      return { ...synonymHit, confidence: 1.0 };
    }

    const cacheKey = `semantic:${normalized}`;
    const cached = await this.cache.get<SemanticParseResult>(cacheKey);
    if (cached) return cached;

    try {
      const parsed = await this.llm.parseActivityText(normalized);
      await this.cache.set(cacheKey, parsed, this.semanticCacheTtlMs);
      return parsed;
    } catch {
      return null;
    }
  }
}
