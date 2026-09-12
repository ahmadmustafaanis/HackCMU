import { beforeEach, describe, expect, it } from "vitest";
import type { CacheService, LlmClient, SemanticParseResult } from "shared-types";
import { SemanticParser } from "./semanticParser.js";

/** Local in-memory fake — deliberately not Agent C's real cache
 * implementation, per the parallel-safety rule (this area may not import
 * another agent's concrete files). */
class FakeCache implements CacheService {
  private readonly store = new Map<string, unknown>();

  async get<T>(key: string): Promise<T | null> {
    return (this.store.has(key) ? (this.store.get(key) as T) : null);
  }

  async set<T>(key: string, value: T, _ttlMs: number): Promise<void> {
    this.store.set(key, value);
  }
}

/** Local fake LLM client with a controllable canned response/failure and a
 * call counter, so tests can assert exactly how many times (if any) the
 * "real" LLM would have been touched. */
class FakeLlmClient implements LlmClient {
  callCount = 0;
  private readonly impl: (normalizedText: string) => Promise<SemanticParseResult>;

  constructor(impl: (normalizedText: string) => Promise<SemanticParseResult>) {
    this.impl = impl;
  }

  async parseActivityText(normalizedText: string): Promise<SemanticParseResult> {
    this.callCount += 1;
    return this.impl(normalizedText);
  }
}

const NOVEL_PARSE_RESULT: SemanticParseResult = {
  canonicalActivity: "board-games",
  category: "social",
  tags: ["board-games"],
  confidence: 0.62,
};

describe("SemanticParser", () => {
  let cache: FakeCache;

  beforeEach(() => {
    cache = new FakeCache();
  });

  it("resolves a known synonym without ever touching the LLM", async () => {
    const llm = new FakeLlmClient(async () => {
      throw new Error("LLM should not be called for a known synonym");
    });
    const parser = new SemanticParser(llm, cache);

    const result = await parser.parse("gym");

    expect(result).toEqual({ canonicalActivity: "workout", category: "fitness", tags: ["workout"], confidence: 1.0 });
    expect(llm.callCount).toBe(0);
  });

  it("resolves an activity mentioned inside a time/location phrase without an LLM", async () => {
    const llm = new FakeLlmClient(async () => {
      throw new Error("LLM should not be called for a phrase containing a known activity");
    });
    const parser = new SemanticParser(llm, new FakeCache());

    await expect(parser.parse("treadmill in 10 mins at CUC")).resolves.toMatchObject({
      canonicalActivity: "treadmill",
      category: "fitness",
    });
  });

  it("resolves a canonical activity id spelled with noisy casing/punctuation without touching the LLM", async () => {
    const llm = new FakeLlmClient(async () => {
      throw new Error("LLM should not be called for a known canonical id");
    });
    const parser = new SemanticParser(llm, cache);

    const result = await parser.parse("  TREADMILL!! ");

    expect(result).toEqual({
      canonicalActivity: "treadmill",
      category: "fitness",
      tags: ["treadmill", "workout"],
      confidence: 1.0,
    });
    expect(llm.callCount).toBe(0);
  });

  it("returns a pre-seeded semantic cache hit without touching the LLM", async () => {
    const llm = new FakeLlmClient(async () => {
      throw new Error("LLM should not be called on a cache hit");
    });
    const cachedValue: SemanticParseResult = {
      canonicalActivity: "frisbee",
      category: "fitness",
      tags: ["frisbee"],
      confidence: 0.9,
    };
    await cache.set("semantic:ultimate frisbee", cachedValue, 1000);
    const parser = new SemanticParser(llm, cache);

    const result = await parser.parse("Ultimate Frisbee");

    expect(result).toEqual(cachedValue);
    expect(llm.callCount).toBe(0);
  });

  it("calls the LLM exactly once for a genuinely novel string, then caches the result", async () => {
    const llm = new FakeLlmClient(async () => NOVEL_PARSE_RESULT);
    const parser = new SemanticParser(llm, cache);

    const first = await parser.parse("board games night");
    expect(first).toEqual(NOVEL_PARSE_RESULT);
    expect(llm.callCount).toBe(1);

    const second = await parser.parse("board games night");
    expect(second).toEqual(NOVEL_PARSE_RESULT);
    expect(llm.callCount).toBe(1); // still 1 — served from cache this time
  });

  it("returns null (never throws) when the LLM fails, and does not cache anything", async () => {
    const llm = new FakeLlmClient(async () => {
      throw new Error("simulated LLM failure");
    });
    const parser = new SemanticParser(llm, cache);

    const result = await parser.parse("board games night");

    expect(result).toBeNull();
    expect(llm.callCount).toBe(1);
    expect(await cache.get("semantic:board games night")).toBeNull();
  });

  it("returns null for empty or whitespace-only input without any lookups", async () => {
    const llm = new FakeLlmClient(async () => {
      throw new Error("LLM should not be called for empty input");
    });
    const parser = new SemanticParser(llm, cache);

    expect(await parser.parse(undefined)).toBeNull();
    expect(await parser.parse("")).toBeNull();
    expect(await parser.parse("   ")).toBeNull();
    expect(llm.callCount).toBe(0);
  });
});
