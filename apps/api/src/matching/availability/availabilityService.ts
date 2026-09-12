import type { AvailabilityService } from "shared-types";

/** Deterministic fallback only — no real Calendar/SIO integration (see
 * ../CLAUDE.md and shared-types AvailabilityService doc comment: this must
 * never be called from the real-time recommendation path). Returns a default
 * slot starting 30 minutes from now, of exactly `durationMinutes` length. */
export class DefaultAvailabilityService implements AvailabilityService {
  async getNextAvailableSlot(
    _userId: string,
    durationMinutes: number
  ): Promise<{ startTime: string; endTime: string }> {
    const start = new Date(Date.now() + 30 * 60_000);
    const end = new Date(start.getTime() + durationMinutes * 60_000);
    return { startTime: start.toISOString(), endTime: end.toISOString() };
  }
}
