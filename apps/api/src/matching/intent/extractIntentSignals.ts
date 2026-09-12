import { locations } from "../../config/index.js";

export interface ExtractedIntentSignals {
  startTime?: string;
  locationIds: string[];
}

const RELATIVE_TIME = /\bin\s+(\d+)\s*(minutes?|mins?|m|hours?|hrs?|h)\b/i;

function locationAliases(): Array<{ id: string; aliases: string[] }> {
  return locations.map((location) => ({
    id: location.id,
    aliases: [location.id, location.name, ...(location.aliases ?? [])]
      .map((value) => value.toLowerCase())
      .sort((a, b) => b.length - a.length),
  }));
}

/** Extracts deterministic scheduling/location signals before semantic parsing.
 * This keeps time arithmetic and canonical campus resolution out of the LLM. */
export function extractIntentSignals(sourceText: string | undefined, now = new Date()): ExtractedIntentSignals {
  if (!sourceText?.trim()) return { locationIds: [] };

  const timeMatch = sourceText.match(RELATIVE_TIME);
  let startTime: string | undefined;
  if (timeMatch) {
    const amount = Number.parseInt(timeMatch[1]!, 10);
    const unit = timeMatch[2]!.toLowerCase();
    const minutes = unit.startsWith("h") ? amount * 60 : amount;
    startTime = new Date(now.getTime() + minutes * 60_000).toISOString();
  }

  const normalized = sourceText.toLowerCase();
  const locationIds = locationAliases()
    .filter(({ aliases }) => aliases.some((alias) => normalized.includes(alias)))
    .map(({ id }) => id);

  return { startTime, locationIds: Array.from(new Set(locationIds)) };
}