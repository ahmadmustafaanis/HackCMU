// Deterministic time resolution ONLY. Must never import LLM/semantic code —
// this sits before any semantic parsing in the pipeline and is the
// structured-input fast path (see ../CLAUDE.md).

const RELATIVE_PHRASE = /in\s+(\d+)\s*(minute|min|hour|hr)s?/i;

function isIsoTimestamp(value: string): boolean {
  if (Number.isNaN(Date.parse(value))) return false;
  // Require an explicit date component so bare times/garbage don't slip
  // through Date.parse's lenient behavior.
  return /^\d{4}-\d{2}-\d{2}/.test(value.trim());
}

/** Resolves an explicit ISO timestamp or a simple relative phrase ("in 30
 * minutes", "in 2 hours") to a startTime/endTime window. Returns null for
 * undefined or unparseable input — callers fall back to
 * AvailabilityService.getNextAvailableSlot in that case. */
export function resolveExplicitOrRelativeTime(
  input: string | undefined,
  now: Date,
  durationMinutes = 60
): { startTime: string; endTime: string } | null {
  if (!input) return null;
  const trimmed = input.trim();
  if (trimmed.length === 0) return null;

  if (isIsoTimestamp(trimmed)) {
    const start = new Date(trimmed);
    const end = new Date(start.getTime() + durationMinutes * 60_000);
    return { startTime: start.toISOString(), endTime: end.toISOString() };
  }

  const match = trimmed.match(RELATIVE_PHRASE);
  if (match) {
    const amount = Number.parseInt(match[1], 10);
    const unit = match[2].toLowerCase();
    const offsetMinutes = unit.startsWith("hour") || unit.startsWith("hr") ? amount * 60 : amount;
    const start = new Date(now.getTime() + offsetMinutes * 60_000);
    const end = new Date(start.getTime() + durationMinutes * 60_000);
    return { startTime: start.toISOString(), endTime: end.toISOString() };
  }

  return null;
}
