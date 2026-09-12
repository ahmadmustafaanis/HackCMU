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
  JoinEventRequest,
  JoinEventResponse,
  RecommendationService,
  SuggestionsResponse,
} from "shared-types";
import { requireAuth } from "../auth/requireAuth.js";
import { locations } from "../config/index.js";
import { getMatchById, updateMatchStatus } from "../matches/matchesService.js";
import { notifyEventHost } from "../notifications/notificationService.js";

function locationById(locationId: string) {
  return locations.find((l) => l.id === locationId);
}

function locationName(locationId: string): string {
  return locationById(locationId)?.name ?? locationId;
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
  const loc = locationById(event.locationId);
  return {
    id: event.id,
    title: event.title,
    type: event.canonicalActivity,
    description: event.description ?? `${capitalize(event.canonicalActivity)} at ${locationName(event.locationId)}`,
    approximateLocation: locationName(event.locationId),
    locationId: event.locationId,
    lat: loc?.lat,
    lng: loc?.lng,
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

  router.get("/mine", requireAuth, async (req, res, next) => {
    try {
      const events = await deps.eventRepository.listForUser(req.userId!, new Date(), 100);
      const response: ActivitiesResponse = { activities: events.map(toActivity) };
      res.json(response);
    } catch (err) {
      next(err);
    }
  });

  router.post("/:eventId/join", requireAuth, async (req, res, next) => {
    try {
      const body = req.body as JoinEventRequest;
      const eventId = req.params.eventId || body.eventId;
      const result = await deps.eventRepository.joinIfValid(eventId, req.userId!, new Date());
      if (!result.ok) {
        const status: JoinEventResponse["status"] = result.reason === "FULL" ? "full" : result.reason === "EXPIRED" ? "expired" : result.reason === "NOT_FOUND" ? "not_found" : "expired";
        res.json({ status } satisfies JoinEventResponse);
        return;
      }
      if (result.event.hostId !== req.userId!) {
        await notifyEventHost({ hostId: result.event.hostId, eventId: result.event.id, actorId: req.userId! });
      }
      res.json({ status: "accepted", activity: toActivity(result.event) } satisfies JoinEventResponse);
    } catch (err) {
      next(err);
    }
  });

  // GET /api/activities/suggestions?userId=... — requireAuth; the `userId`
  // query param is accepted for backward compatibility but ignored in favor
  // of the verified session, so you can't fetch personalization data keyed
  // to someone else's id.
  router.get("/suggestions", requireAuth, async (req, res, next) => {
    try {
      const activityIds = await deps.recommendationService.suggestActivities(req.userId!);
      const response: SuggestionsResponse = { activityIds };
      res.json(response);
    } catch (err) {
      next(err);
    }
  });

  router.get("/:eventId", async (req, res, next) => {
    try {
      const event = await deps.eventRepository.getById(req.params.eventId);
      if (!event) {
        res.status(404).json({ error: "activity not found" });
        return;
      }
      const response: { activity: Activity } = { activity: toActivity(event) };
      res.json(response);
    } catch (err) {
      next(err);
    }
  });

  // POST /api/activities/:eventId/invite — join this specific event through
  // the same atomic join path match() uses, then reflect the outcome onto
  // the Match record the UI is tracking. requireAuth: always the verified
  // session's userId, never the request body's.
  router.post("/:eventId/invite", requireAuth, async (req, res, next) => {
    try {
      const body = req.body as InviteRequest;
      const joinResult = await deps.eventRepository.joinIfValid(req.params.eventId, req.userId!, new Date());
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
