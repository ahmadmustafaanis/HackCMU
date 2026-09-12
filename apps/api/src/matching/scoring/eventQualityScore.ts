import type { EventRecord } from "shared-types";

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/** Rewards a fill ratio near 60% — empty events feel dead, near-full events
 * are about to close. capacity <= 0 is treated as an unratable event (0). */
export function eventQualityScore(event: EventRecord): number {
  if (event.capacity <= 0) return 0;

  const fillRatio = event.participantCount / event.capacity;
  return clamp(1 - Math.abs(fillRatio - 0.6) / 0.6, 0, 1);
}
