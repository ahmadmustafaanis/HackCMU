import { Router } from "express";
import type { RecommendRequest, RecommendResponse, RecommendedCandidate, RecommendationService } from "shared-types";
import { locations } from "../config/index.js";
import { buildNormalizedIntent } from "../matching/intent/buildNormalizedIntent.js";
import { resolveExplicitOrRelativeTime } from "../matching/time/resolveTime.js";

/** Only accepts an already-absolute time (e.g. an ISO string a date picker
 * produced). Relative-phrase parsing ("in 30 minutes") is deterministic
 * time-resolution work that belongs to the matching/time/ module — this
 * read-only route never reaches it, so an unparseable phrase is simply
 * dropped rather than guessed at here. */
function parseAbsoluteTime(time?: string): string | undefined {
  if (!time) return undefined;
  const parsed = new Date(time);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed.toISOString();
}

function locationName(locationId: string): string {
  return locations.find((l) => l.id === locationId)?.name ?? locationId;
}

function formatTimeLabel(startIso: string, endIso: string): string {
  const format = (iso: string) => {
    const d = new Date(iso);
    const hours24 = d.getHours();
    const hours12 = hours24 % 12 === 0 ? 12 : hours24 % 12;
    const minutes = d.getMinutes().toString().padStart(2, "0");
    const period = hours24 < 12 ? "AM" : "PM";
    return `${hours12}:${minutes} ${period}`;
  };
  void endIso;
  return format(startIso);
}

export function createRecommendRouter(deps: { recommendationService: RecommendationService }): Router {
  const router = Router();

  // POST /api/recommend — real-time path, structured-only, no free text/LLM.
  router.post("/", async (req, res, next) => {
    try {
      const body = req.body as RecommendRequest;
      const resolvedTime = resolveExplicitOrRelativeTime(body.time, new Date());
      const intent = buildNormalizedIntent({
        activityIds: body.activityIds,
        locationIds: body.locationIds,
        startTime: resolvedTime?.startTime ?? parseAbsoluteTime(body.time),
        endTime: resolvedTime?.endTime,
      });

      const scored = await deps.recommendationService.recommend(intent);

      const candidates: RecommendedCandidate[] = scored.map(({ event, breakdown }) => ({
        eventId: event.id,
        title: event.title,
        canonicalActivity: event.canonicalActivity,
        hostId: event.hostId,
        attendeeCount: event.participantCount,
        capacity: event.capacity,
        approximateLocation: locationName(event.locationId),
        timeLabel: formatTimeLabel(event.startTime, event.endTime),
        score: breakdown.total,
      }));

      const response: RecommendResponse = { candidates };
      res.json(response);
    } catch (err) {
      next(err);
    }
  });

  return router;
}
