import { describe, expect, it } from "vitest";
import { locationScore, resolveNearestLocation } from "./locationService.js";

describe("resolveNearestLocation", () => {
  it("resolves coordinates to the nearest canonical location", () => {
    // Exactly Gates Hillman Complex's coordinates from locations.json.
    expect(resolveNearestLocation(40.4432, -79.9459)).toBe("gates-hillman");
  });

  it("resolves nearby-but-not-exact coordinates to the closest location", () => {
    // A few meters off Wean Hall's coordinates — still closest to Wean Hall.
    expect(resolveNearestLocation(40.44251, -79.94551)).toBe("wean-hall");
  });
});

describe("locationScore", () => {
  it("returns 0.5 neutral when there are no candidate intent locations", () => {
    expect(locationScore([], "gates-hillman")).toBe(0.5);
  });

  it("returns 1.0 for an exact location id match", () => {
    expect(locationScore(["gates-hillman"], "gates-hillman")).toBe(1.0);
  });

  it("returns 0.7 for a pair in the 'nearby' distance bucket (~162m apart)", () => {
    // hunt-library <-> cohon-university-center is ~162.5m apart: > veryNearby
    // (150m) and <= nearby (500m).
    expect(locationScore(["hunt-library"], "cohon-university-center")).toBe(0.7);
  });

  it("returns 0.9 for a pair in the 'veryNearby' distance bucket (~135m apart)", () => {
    // cohon-university-center <-> skibo-gym is ~134.8m apart.
    expect(locationScore(["cohon-university-center"], "skibo-gym")).toBe(0.9);
  });

  it("takes the best score across multiple intent location ids", () => {
    const score = locationScore(["skibo-gym", "gates-hillman"], "gates-hillman");
    expect(score).toBe(1.0);
  });

  it("returns 0.0 for an unknown intent location id rather than throwing", () => {
    expect(() => locationScore(["not-a-real-place"], "gates-hillman")).not.toThrow();
    expect(locationScore(["not-a-real-place"], "gates-hillman")).toBe(0.0);
  });

  it("returns 0.0 for an unknown event location id rather than throwing", () => {
    expect(() => locationScore(["gates-hillman"], "not-a-real-place")).not.toThrow();
    expect(locationScore(["gates-hillman"], "not-a-real-place")).toBe(0.0);
  });
});
