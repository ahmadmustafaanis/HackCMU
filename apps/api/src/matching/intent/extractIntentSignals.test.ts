import { describe, expect, it } from "vitest";
import { extractIntentSignals } from "./extractIntentSignals.js";

describe("extractIntentSignals", () => {
  it("extracts relative time and building aliases", () => {
    const now = new Date("2026-09-12T12:00:00.000Z");
    expect(extractIntentSignals("treadmill in 10 mins at CUC", now)).toEqual({
      startTime: "2026-09-12T12:10:00.000Z",
      locationIds: ["cohon-university-center"],
    });
  });
});