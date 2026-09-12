import { describe, expect, it } from "vitest";
import { resolveExplicitOrRelativeTime } from "./resolveTime.js";

describe("resolveExplicitOrRelativeTime", () => {
  const now = new Date("2026-09-12T12:00:00.000Z");

  it("uses an explicit ISO timestamp as startTime, adding the default duration", () => {
    const result = resolveExplicitOrRelativeTime("2026-09-12T18:00:00.000Z", now);
    expect(result).toEqual({
      startTime: "2026-09-12T18:00:00.000Z",
      endTime: "2026-09-12T19:00:00.000Z",
    });
  });

  it("honors a custom durationMinutes for explicit timestamps", () => {
    const result = resolveExplicitOrRelativeTime("2026-09-12T18:00:00.000Z", now, 30);
    expect(result).toEqual({
      startTime: "2026-09-12T18:00:00.000Z",
      endTime: "2026-09-12T18:30:00.000Z",
    });
  });

  it("resolves 'in 30 minutes' relative to now", () => {
    const result = resolveExplicitOrRelativeTime("in 30 minutes", now);
    expect(result).toEqual({
      startTime: "2026-09-12T12:30:00.000Z",
      endTime: "2026-09-12T13:30:00.000Z",
    });
  });

  it("resolves 'in 2 hours' relative to now", () => {
    const result = resolveExplicitOrRelativeTime("in 2 hours", now);
    expect(result).toEqual({
      startTime: "2026-09-12T14:00:00.000Z",
      endTime: "2026-09-12T15:00:00.000Z",
    });
  });

  it("resolves shorthand units like 'in 15 min' and 'in 1 hr'", () => {
    expect(resolveExplicitOrRelativeTime("in 15 min", now)?.startTime).toBe("2026-09-12T12:15:00.000Z");
    expect(resolveExplicitOrRelativeTime("in 1 hr", now)?.startTime).toBe("2026-09-12T13:00:00.000Z");
  });

  it("returns null for unparseable input", () => {
    expect(resolveExplicitOrRelativeTime("whenever works", now)).toBeNull();
  });

  it("returns null for undefined input", () => {
    expect(resolveExplicitOrRelativeTime(undefined, now)).toBeNull();
  });

  it("returns null for empty string input", () => {
    expect(resolveExplicitOrRelativeTime("   ", now)).toBeNull();
  });
});
