import { Router } from "express";
import type {
  Activity,
  ActivitiesResponse,
  ActivityStatus,
  EventRecord,
  EventRatingsResponse,
  EventRepository,
  EventStatus,
  InviteRequest,
  InviteResponse,
  JoinEventRequest,
  JoinEventResponse,
  RecommendationService,
  SubmitPeerRatingsRequest,
  SubmitPeerRatingsResponse,
  SuggestionsResponse,
} from "shared-types";
import { optionalAuth, requireAuth } from "../auth/requireAuth.js";
import { locations } from "../config/index.js";
import { getMatchById, updateMatchStatus } from "../matches/matchesService.js";
import { notifyEventHost } from "../notifications/notificationService.js";
import { getEventRatings, PeerRatingError, ratedEventIds, submitPeerRatings } from "../ratings/peerRatingService.js";
import { formatTimeLabel } from "../shared/formatTimeLabel.js";

function locationById(locationId: string) {
  return locations.find((l) => l.id === locationId);
}

function locationName(locationId: string): string {
  return locationById(locationId)?.name ?? locationId;
}

function capitalize(text: string): string {
  return text.length === 0 ? text : text[0]!.toUpperCase() + text.slice(1);
}

// EventStatus is a richer state machine than the UI's ActivityStatus; this
// is a pragmatic, documented collapse rather than a 1:1 mapping. `viewerHasJoined`
// (true when the caller's own userId is in participantIds) takes priority over
// the event's global capacity state — otherwise "joined" only ever showed up
// by coincidence, whenever the event happened to hit capacity, regardless of
// whether the viewer themselves were a participant. There is still no
// per-viewer identity on the public, unauthenticated GET /activities feed —
// callers there pass viewerHasJoined=false and fall back to the old
// FULL-implies-joined approximation (ActivityStatus has no "full" state).
function toActivityStatus(status: EventStatus, viewerHasJoined: boolean, ended: boolean): ActivityStatus {
  if (ended) return "completed";
  switch (status) {
    case "OPEN":
      return viewerHasJoined ? "joined" : "open";
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

function toActivity(
  event: EventRecord,
  viewerId?: string,
  extras: { now?: Date; hasRated?: boolean } = {},
): Activity {
  const loc = locationById(event.locationId);
  const viewerHasJoined = viewerId != null && event.participantIds.includes(viewerId);
  const now = extras.now ?? new Date();
  const ended = new Date(event.endTime).getTime() <= now.getTime();
  const othersJoined = event.participantIds.some((id) => id !== viewerId);
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
    startTime: event.startTime,
    endTime: event.endTime,
    walkingMinutes: PLACEHOLDER_WALKING_MINUTES,
    attendees: event.participantIds,
    attendeeCount: event.participantCount,
    capacity: event.capacity,
    hostId: event.hostId,
    vibe: event.vibe,
    status: toActivityStatus(event.status, viewerHasJoined, ended),
    canRate: Boolean(viewerHasJoined && ended && othersJoined),
    hasRated: extras.hasRated ?? false,
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
      const response: ActivitiesResponse = { activities: events.map((event) => toActivity(event)) };
      res.json(response);
    } catch (err) {
      next(err);
    }
  });

  router.get("/mine", requireAuth, async (req, res, next) => {
    try {
      const now = new Date();
      const events = await deps.eventRepository.listForUser(req.userId!, now, 100);
      const rated = await ratedEventIds(req.userId!, events.map((event) => event.id));
      const response: ActivitiesResponse = {
        activities: events.map((event) => toActivity(event, req.userId!, { now, hasRated: rated.has(event.id) })),
      };
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
        const status: JoinEventResponse["status"] = result.reason === "ALREADY_JOINED" ? "accepted" : result.reason === "FULL" ? "full" : result.reason === "EXPIRED" ? "expired" : result.reason === "NOT_FOUND" ? "not_found" : "expired";
        res.json({ status } satisfies JoinEventResponse);
        return;
      }
      if (result.event.hostId !== req.userId!) {
        await notifyEventHost({ hostId: result.event.hostId, eventId: result.event.id, actorId: req.userId! });
      }
      res.json({ status: "accepted", activity: toActivity(result.event, req.userId!) } satisfies JoinEventResponse);
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

  router.get("/:eventId", optionalAuth, async (req, res, next) => {
    try {
      const event = await deps.eventRepository.getById(req.params.eventId);
      if (!event) {
        res.status(404).json({ error: "activity not found" });
        return;
      }
      const now = new Date();
      const viewerId = req.userId;
      const rated = viewerId ? await ratedEventIds(viewerId, [event.id]) : new Set<string>();
      const response: { activity: Activity } = {
        activity: toActivity(event, viewerId, { now, hasRated: rated.has(event.id) }),
      };
      res.json(response);
    } catch (err) {
      next(err);
    }
  });

  router.get("/:eventId/ratings", requireAuth, async (req, res, next) => {
    try {
      const event = await deps.eventRepository.getById(req.params.eventId);
      if (!event) {
        res.status(404).json({ error: "activity not found" });
        return;
      }
      const response: EventRatingsResponse = await getEventRatings(event, req.userId!, new Date());
      res.json(response);
    } catch (err) {
      if (err instanceof PeerRatingError) {
        res.status(err.status).json({ error: err.message });
        return;
      }
      next(err);
    }
  });

  router.post("/:eventId/ratings", requireAuth, async (req, res, next) => {
    try {
      const event = await deps.eventRepository.getById(req.params.eventId);
      if (!event) {
        res.status(404).json({ error: "activity not found" });
        return;
      }
      const body = req.body as SubmitPeerRatingsRequest;
      await submitPeerRatings(event, req.userId!, body, new Date());
      const response: SubmitPeerRatingsResponse = { ok: true };
      res.json(response);
    } catch (err) {
      if (err instanceof PeerRatingError) {
        res.status(err.status).json({ error: err.message });
        return;
      }
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
