import { describe, expect, it } from "vitest";
import { formatTimeLabel } from "./formatTimeLabel.js";

describe("formatTimeLabel", () => {
  it("renders a start–end range", () => {
    expect(formatTimeLabel("2026-09-12T19:30:00.000Z", "2026-09-12T20:30:00.000Z")).toMatch(/ – /);
  });

  it("renders a single clock when start and end match", () => {
    const label = formatTimeLabel("2026-09-12T19:30:00.000Z", "2026-09-12T19:30:00.000Z");
    expect(label).not.toMatch(/ – /);
  });
});
