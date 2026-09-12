import { describe, expect, it } from "vitest";
import { buildRecommendationCacheKey, semanticCacheKey } from "./cacheKeys.js";

describe("buildRecommendationCacheKey", () => {
  const now = new Date("2026-09-12T10:00:00.000Z");

  it("is order-independent for activityIds", () => {
    const a = buildRecommendationCacheKey({ activityIds: ["coffee", "study"], locationIds: [] }, now);
    const b = buildRecommendationCacheKey({ activityIds: ["study", "coffee"], locationIds: [] }, now);
    expect(a).toBe(b);
  });

  it("is order-independent for locationIds", () => {
    const a = buildRecommendationCacheKey({ activityIds: [], locationIds: ["cuc", "gates"] }, now);
    const b = buildRecommendationCacheKey({ activityIds: [], locationIds: ["gates", "cuc"] }, now);
    expect(a).toBe(b);
  });

  it("dedupes repeated ids", () => {
    const a = buildRecommendationCacheKey({ activityIds: ["coffee", "coffee", "study"], locationIds: [] }, now);
    const b = buildRecommendationCacheKey({ activityIds: ["study", "coffee"], locationIds: [] }, now);
    expect(a).toBe(b);
  });

  it("uses 'any' for empty id lists", () => {
    const key = buildRecommendationCacheKey({ activityIds: [], locationIds: [] }, now);
    expect(key).toContain(":any:any:");
  });

  it("produces the same key for two timestamps in the same 5-minute bucket", () => {
    const t1 = new Date("2026-09-12T10:00:00.000Z");
    const t2 = new Date("2026-09-12T10:04:59.000Z");
    const a = buildRecommendationCacheKey({ activityIds: ["coffee"], locationIds: ["cuc"], time: t1.toISOString() }, now);
    const b = buildRecommendationCacheKey({ activityIds: ["coffee"], locationIds: ["cuc"], time: t2.toISOString() }, now);
    expect(a).toBe(b);
  });

  it("produces a different key across a bucket boundary", () => {
    const t1 = new Date("2026-09-12T10:04:59.000Z");
    const t2 = new Date("2026-09-12T10:05:00.000Z");
    const a = buildRecommendationCacheKey({ activityIds: ["coffee"], locationIds: ["cuc"], time: t1.toISOString() }, now);
    const b = buildRecommendationCacheKey({ activityIds: ["coffee"], locationIds: ["cuc"], time: t2.toISOString() }, now);
    expect(a).not.toBe(b);
  });

  it("falls back to `now` when no time is given", () => {
    const key = buildRecommendationCacheKey({ activityIds: ["coffee"], locationIds: [] }, now);
    const expectedBucket = Math.floor(now.getTime() / (5 * 60 * 1000));
    expect(key).toBe(`recommendations:coffee:any:${expectedBucket}`);
  });
});

describe("semanticCacheKey", () => {
  it("prefixes the normalized text", () => {
    expect(semanticCacheKey("grab coffee")).toBe("semantic:grab coffee");
  });
});
