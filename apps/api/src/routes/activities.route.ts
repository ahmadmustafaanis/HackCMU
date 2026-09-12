import { Router } from "express";
import type {
  Activity,
  ActivitiesResponse,
  ActivityStatus,
  EventRecord,
  EventRepository,
  EventStatus,
  InviteRequest,
  InviteResponse,
  RecommendationService,
  SuggestionsResponse,
} from "shared-types";
import { locations } from "../config/index.js";
import { getMatchById, updateMatchStatus } from "../matches/matchesService.js";

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
  return `${format(startIso)} – ${format(endIso)}`;
}

function capitalize(text: string): string {
  return text.length === 0 ? text : text[0]!.toUpperCase() + text.slice(1);
}

// EventStatus is a richer state machine than the UI's ActivityStatus; this
// is a pragmatic, documented collapse rather than a 1:1 mapping — there is
// no per-viewer "have I joined this" concept in a userId-less GET /activities.
function toActivityStatus(status: EventStatus): ActivityStatus {
  switch (status) {
    case "OPEN":
      return "open";
    case "FULL":
      return "joined";
    case "COMPLETED":
    case "EXPIRED":
    case "CANCELLED":
    default:
      return "completed";
  }
}

const PLACEHOLDER_WALKING_MINUTES = 5;

function toActivity(event: EventRecord): Activity {
  return {
    id: event.id,
    title: event.title,
    type: event.canonicalActivity,
    description: event.description ?? `${capitalize(event.canonicalActivity)} at ${locationName(event.locationId)}`,
    approximateLocation: locationName(event.locationId),
    timeLabel: formatTimeLabel(event.startTime, event.endTime),
    walkingMinutes: PLACEHOLDER_WALKING_MINUTES,
    attendees: event.participantIds,
    attendeeCount: event.participantCount,
    capacity: event.capacity,
    hostId: event.hostId,
    vibe: event.vibe,
    status: toActivityStatus(event.status),
  };
}

// JoinFailureReason has more cases than InviteResponse's status union.
// ALREADY_JOINED is NOT a failure from the caller's point of view — it means
// this user is already a participant in the event (e.g. they were
// auto-joined by the original MATCHED outcome, and this "Invite" click is on
// someone already in that same group) — that's a success state, "accepted",
// not "expired". NOT_FOUND/NOT_OPEN collapse to "expired" as the closest
// "this invite is no longer actionable" fallback.
function toInviteStatus(ok: boolean, reason?: string): InviteResponse["status"] {
  if (ok || reason === "ALREADY_JOINED") return "accepted";
  if (reason === "FULL") return "full";
  return "expired";
}

export function createActivitiesRouter(deps: {
  eventRepository: EventRepository;
  recommendationService: RecommendationService;
}): Router {
  const router = Router();

  // GET /api/activities — Discover / trending feed.
  router.get("/", async (_req, res, next) => {
    try {
      const events = await deps.eventRepository.listOpen(new Date(), 50);
      const response: ActivitiesResponse = { activities: events.map(toActivity) };
      res.json(response);
    } catch (err) {
      next(err);
    }
  });

  // GET /api/activities/suggestions?userId=...
  router.get("/suggestions", async (req, res, next) => {
    try {
      const userId = typeof req.query.userId === "string" ? req.query.userId : "";
      const activityIds = await deps.recommendationService.suggestActivities(userId);
      const response: SuggestionsResponse = { activityIds };
      res.json(response);
    } catch (err) {
      next(err);
    }
  });

  // POST /api/activities/:eventId/invite — join this specific event through
  // the same atomic join path match() uses, then reflect the outcome onto
  // the Match record the UI is tracking.
  router.post("/:eventId/invite", async (req, res, next) => {
    try {
      const body = req.body as InviteRequest;
      const joinResult = await deps.eventRepository.joinIfValid(req.params.eventId, body.userId, new Date());
      const alreadyInGroup = !joinResult.ok && joinResult.reason === "ALREADY_JOINED";

      const newStatus = joinResult.ok || alreadyInGroup ? "accepted" : "invited";
      const updated = await updateMatchStatus(body.matchId, newStatus);
      const match = updated ?? (await getMatchById(body.matchId));
      if (!match) {
        res.status(404).json({ error: "match not found" });
        return;
      }

      const response: InviteResponse = {
        status: toInviteStatus(joinResult.ok, joinResult.ok ? undefined : joinResult.reason),
        match,
      };
      res.json(response);
    } catch (err) {
      next(err);
    }
  });

  return router;
}
