import { thresholds } from "../../config/index.js";

function toMinutesSinceEpoch(iso: string): number {
  return new Date(iso).getTime() / 60_000;
}

/** Compatibility score in [0,1] between a candidate intent time window and
 * a specific event's time window. A bare `startTime` with no `endTime` is
 * treated as a zero-duration instant. Never throws — callers should
 * normally have resolved a time before scoring, but a missing startTime
 * yields a neutral 0.5 rather than an error. */
export function timeScore(
  intent: { startTime?: string; endTime?: string },
  event: { startTime: string; endTime: string },
  toleranceMinutes = thresholds.timeToleranceMinutes
): number {
  if (!intent.startTime) return 0.5;

  const intentStart = toMinutesSinceEpoch(intent.startTime);
  const intentEnd = intent.endTime ? toMinutesSinceEpoch(intent.endTime) : intentStart;
  const eventStart = toMinutesSinceEpoch(event.startTime);
  const eventEnd = toMinutesSinceEpoch(event.endTime);

  const overlapStart = Math.max(intentStart, eventStart);
  const overlapEnd = Math.min(intentEnd, eventEnd);
  const overlapMinutes = Math.max(0, overlapEnd - overlapStart);

  if (overlapMinutes > 0) {
    const unionStart = Math.min(intentStart, eventStart);
    const unionEnd = Math.max(intentEnd, eventEnd);
    const unionMinutes = unionEnd - unionStart;
    return unionMinutes > 0 ? overlapMinutes / unionMinutes : 1;
  }

  if (intentEnd <= eventStart) {
    const gapMinutes = eventStart - intentEnd;
    return Math.max(0, 1 - gapMinutes / toleranceMinutes);
  }
  if (eventEnd <= intentStart) {
    const gapMinutes = intentStart - eventEnd;
    return Math.max(0, 1 - gapMinutes / toleranceMinutes);
  }

  // A zero-width window lies exactly inside the other window's bounds
  // (measure-zero overlap) — treat as a perfect match.
  return 1;
}
