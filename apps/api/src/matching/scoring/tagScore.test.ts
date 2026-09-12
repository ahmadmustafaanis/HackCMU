import { describe, expect, it } from "vitest";
import { tagScore } from "./tagScore.js";

describe("tagScore", () => {
  it("returns 0 when both tag lists are empty", () => {
    expect(tagScore([], [])).toBe(0);
  });

  it("returns 0 when only the intent has tags", () => {
    expect(tagScore(["coffee"], [])).toBe(0);
  });

  it("returns 0 when only the event has tags", () => {
    expect(tagScore([], ["coffee"])).toBe(0);
  });

  it("returns 1 when the tag sets are identical", () => {
    expect(tagScore(["coffee", "study"], ["study", "coffee"])).toBe(1);
  });

  it("returns 0 when the tag sets are disjoint", () => {
    expect(tagScore(["coffee"], ["basketball"])).toBe(0);
  });

  it("computes the Jaccard index for a partial overlap", () => {
    // intersection = {coffee} (1), union = {coffee, study, chill} (3)
    expect(tagScore(["coffee", "study"], ["coffee", "chill"])).toBeCloseTo(1 / 3);
  });

  it("ignores duplicate tags within a single list", () => {
    expect(tagScore(["coffee", "coffee"], ["coffee"])).toBe(1);
  });
});
