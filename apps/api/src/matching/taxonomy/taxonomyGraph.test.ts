import { describe, expect, it } from "vitest";
import { weights } from "../../config/index.js";
import { activitySimilarity, bestActivityScore } from "./taxonomyGraph.js";

describe("activitySimilarity", () => {
  const { exact, parentChild, sibling, sameCategory, unrelated } = weights.taxonomySimilarity;

  it("returns exact for identical ids", () => {
    expect(activitySimilarity("treadmill", "treadmill")).toBe(exact);
    expect(activitySimilarity("treadmill", "treadmill")).toBe(1.0);
  });

  it("returns parentChild for a declared parent/child pair, either direction", () => {
    expect(activitySimilarity("treadmill", "workout")).toBe(parentChild);
    expect(activitySimilarity("treadmill", "workout")).toBe(0.8);
    expect(activitySimilarity("workout", "treadmill")).toBe(parentChild);
  });

  it("returns sibling when one activity lists the other in `related`", () => {
    expect(activitySimilarity("running", "treadmill")).toBe(sibling);
    expect(activitySimilarity("running", "treadmill")).toBe(0.7);
    // symmetric even though only running.related declares treadmill
    expect(activitySimilarity("treadmill", "running")).toBe(sibling);
  });

  it("returns sibling for two activities sharing the same declared parent", () => {
    // programming and robotics both declare parent: "coding"
    expect(activitySimilarity("programming", "robotics")).toBe(sibling);
  });

  it("returns sameCategory as the fallback for same-category activities with no closer relation", () => {
    const score = activitySimilarity("basketball", "workout");
    expect(score).toBe(sameCategory);
    expect(score).toBeLessThan(parentChild);
    expect(score).toBe(0.5);
  });

  it("returns unrelated for activities in different categories", () => {
    expect(activitySimilarity("painting", "treadmill")).toBe(unrelated);
    expect(activitySimilarity("painting", "treadmill")).toBe(0.0);
  });

  it("returns unrelated (never throws) for an unknown id on either side", () => {
    expect(activitySimilarity("nonexistent-activity", "treadmill")).toBe(unrelated);
    expect(activitySimilarity("treadmill", "nonexistent-activity")).toBe(unrelated);
    expect(activitySimilarity("nonexistent-a", "nonexistent-b")).toBe(unrelated);
  });
});

describe("bestActivityScore", () => {
  it("returns 0 when the intent has no activity ids", () => {
    expect(bestActivityScore([], "treadmill")).toBe(0);
  });

  it("returns the max similarity across all intent activity ids", () => {
    // painting -> treadmill is unrelated(0.0), workout -> treadmill is parentChild(0.8)
    expect(bestActivityScore(["painting", "workout"], "treadmill")).toBe(0.8);
  });

  it("returns exact when the candidate matches one of the intent ids directly", () => {
    expect(bestActivityScore(["basketball", "treadmill"], "treadmill")).toBe(1.0);
  });
});
