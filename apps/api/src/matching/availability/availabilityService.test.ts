import { describe, expect, it } from "vitest";
import { DefaultAvailabilityService } from "./availabilityService.js";

describe("DefaultAvailabilityService", () => {
  it("returns a window of exactly durationMinutes starting near now", async () => {
    const service = new DefaultAvailabilityService();
    const before = Date.now();
    const slot = await service.getNextAvailableSlot("user-1", 45);
    const after = Date.now();

    expect(() => new Date(slot.startTime)).not.toThrow();
    expect(Number.isNaN(new Date(slot.startTime).getTime())).toBe(false);
    expect(Number.isNaN(new Date(slot.endTime).getTime())).toBe(false);

    const startMs = new Date(slot.startTime).getTime();
    const endMs = new Date(slot.endTime).getTime();

    expect(startMs).toBeGreaterThanOrEqual(before);
    expect(startMs).toBeLessThanOrEqual(after);
    expect(endMs - startMs).toBe(45 * 60_000);
  });

  it("produces valid ISO 8601 strings", async () => {
    const service = new DefaultAvailabilityService();
    const slot = await service.getNextAvailableSlot("user-2", 30);
    expect(slot.startTime).toBe(new Date(slot.startTime).toISOString());
    expect(slot.endTime).toBe(new Date(slot.endTime).toISOString());
  });
});
