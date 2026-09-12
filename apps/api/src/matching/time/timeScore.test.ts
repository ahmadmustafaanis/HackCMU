import { describe, expect, it } from "vitest";
import { timeScore } from "./timeScore.js";

describe("timeScore", () => {
  it("returns 0.5 neutral when intent has no startTime", () => {
    expect(timeScore({}, { startTime: "2026-09-12T18:00:00Z", endTime: "2026-09-12T19:00:00Z" })).toBe(0.5);
  });

  it("returns 1.0 for identical windows", () => {
    const window = { startTime: "2026-09-12T18:00:00Z", endTime: "2026-09-12T19:00:00Z" };
    expect(timeScore(window, window)).toBe(1.0);
  });

  it("scores a bare-instant intent 15 minutes before a 60-minute event highly", () => {
    const score = timeScore(
      { startTime: "2026-09-12T17:45:00Z" },
      { startTime: "2026-09-12T18:00:00Z", endTime: "2026-09-12T19:00:00Z" },
      120
    );
    expect(score).toBeCloseTo(0.875, 5);
    expect(score).toBeGreaterThan(0.8);
  });

  it("scores an instant 3 hours away as low/zero given a 120-minute tolerance", () => {
    const score = timeScore(
      { startTime: "2026-09-12T15:00:00Z" },
      { startTime: "2026-09-12T18:00:00Z", endTime: "2026-09-12T19:00:00Z" },
      120
    );
    expect(score).toBe(0);
  });

  it("computes a sensible overlap ratio for a real overlapping interval", () => {
    const score = timeScore(
      { startTime: "2026-09-12T07:00:00Z", endTime: "2026-09-12T08:00:00Z" },
      { startTime: "2026-09-12T07:30:00Z", endTime: "2026-09-12T08:30:00Z" }
    );
    // overlap = 30min, union = 90min
    expect(score).toBeCloseTo(1 / 3, 5);
    expect(score).toBeGreaterThan(0);
    expect(score).toBeLessThan(1);
  });

  it("never throws and stays within [0,1] for a far-future instant", () => {
    const score = timeScore(
      { startTime: "2030-01-01T00:00:00Z" },
      { startTime: "2026-09-12T18:00:00Z", endTime: "2026-09-12T19:00:00Z" }
    );
    expect(score).toBeGreaterThanOrEqual(0);
    expect(score).toBeLessThanOrEqual(1);
  });
});
