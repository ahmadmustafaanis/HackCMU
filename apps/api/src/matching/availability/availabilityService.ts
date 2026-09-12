import type { AvailabilityService } from "shared-types";

/** Deterministic fallback only — no real Calendar/SIO integration (see
 * ../CLAUDE.md and shared-types AvailabilityService doc comment: this must
 * never be called from the real-time recommendation path). Returns a slot
 * starting now, of exactly `durationMinutes` length. */
export class DefaultAvailabilityService implements AvailabilityService {
  async getNextAvailableSlot(
    _userId: string,
    durationMinutes: number
  ): Promise<{ startTime: string; endTime: string }> {
    const now = new Date();
    const end = new Date(now.getTime() + durationMinutes * 60_000);
    return { startTime: now.toISOString(), endTime: end.toISOString() };
  }
}
