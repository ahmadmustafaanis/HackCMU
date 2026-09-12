import { locations } from "../config/index.js";
import { Router } from "express";
import type { MatchRequest, MatchResponse, Match, MatchingService, ScoreBreakdown, UserProfileService } from "shared-types";
import { requireAuth } from "../auth/requireAuth.js";
import { buildNormalizedIntent } from "../matching/intent/buildNormalizedIntent.js";
import type { IdempotencyRunner } from "../matching/matchingService.js";
import { buildMatchReasons, createMatch } from "../matches/matchesService.js";
import { resolveExplicitOrRelativeTime } from "../matching/time/resolveTime.js";
import { extractIntentSignals } from "../matching/intent/extractIntentSignals.js";

/** See recommend.route.ts — only absolute times are resolved here; relative
 * phrases are left for matchingService's availability fallback to resolve. */
function parseAbsoluteTime(time?: string): string | undefined {
  if (!time) return undefined;
  const parsed = new Date(time);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed.toISOString();
}

function intersect<T>(a: T[], b: T[]): T[] {
  const bSet = new Set(b);
  return a.filter((item) => bSet.has(item));
}

/** Small non-cryptographic hash — mirrors matchingService's own fallback-key
 * derivation. Duplicated rather than imported (matchingService doesn't
 * export it) to keep this route independently editable. */
function hashString(input: string): string {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    hash = (hash * 31 + input.charCodeAt(i)) | 0;
  }
  return (hash >>> 0).toString(36);
}

/** Derives a stable key covering this ENTIRE request/response cycle (not
 * just the underlying join/create) when the client didn't supply one — same
 * user + same intent contents + same coarse (1-minute) window collapse to
 * one key. This matters beyond matchingService's own internal idempotency:
 * without it, a duplicated HTTP call (a network retry, a double-tap, or —
 * as observed during integration testing — React StrictMode's dev-only
 * double effect-invocation) would still call matchingService.match() twice.
 * Its *join* is deduped internally, but this route's own side effect
 * (inserting a Match bookkeeping row per participant) would otherwise run
 * unconditionally on every call and visibly duplicate cards in the UI. */
function deriveRouteIdempotencyKey(userId: string, body: MatchRequest, now: Date): string {
  const bucket = Math.floor(now.getTime() / 60_000);
  const raw = JSON.stringify({
    mode: body.mode ?? "match",
    title: body.intent.title, description: body.intent.description,
    capacity: body.intent.capacity, durationMinutes: body.intent.durationMinutes,
    activityIds: [...body.intent.activityIds].sort(),
    locationIds: [...body.intent.locationIds].sort(),
    text: body.intent.text ?? null,
    time: body.intent.time ?? null,
  });
  return `match-route:${userId}:${bucket}:${hashString(raw)}`;
}

export function createMatchRouter(deps: {
  matchingService: MatchingService;
  userProfileService: UserProfileService;
  idempotencyRunner: IdempotencyRunner;
}): Router {
  const router = Router();

  // POST /api/match — core authoritative path. requireAuth: the acting user
  // is ALWAYS the verified session's userId, never a client-supplied field.
  router.post("/", requireAuth, async (req, res, next) => {
    try {
      const userId = req.userId!;
      const body = req.body as MatchRequest;
      if (body.mode !== undefined && body.mode !== "match" && body.mode !== "create") {
        res.status(400).json({ error: "Invalid activity mode" });
        return;
      }
      const details = body.intent;
      if (!details ||
          (details.capacity !== undefined && (!Number.isInteger(details.capacity) || details.capacity < 2 || details.capacity > 100)) ||
          (details.durationMinutes !== undefined && (!Number.isInteger(details.durationMinutes) || details.durationMinutes < 15 || details.durationMinutes > 480)) ||
          (details.title !== undefined && (typeof details.title !== "string" || !details.title.trim() || details.title.length > 100)) ||
          (details.description !== undefined && (typeof details.description !== "string" || details.description.length > 1000))) {
        res.status(400).json({ error: "Use 2–100 participants, 15–480 minutes, and a title up to 100 characters." });
        return;
      }
      if (body.mode === "create" && (!Array.isArray(details.locationIds) || details.locationIds.length !== 1 || !locations.some(location => location.id === details.locationIds[0]))) {
        res.status(400).json({ error: "Choose a campus location for your activity." });
        return;
      }
      const now = new Date();
      const routeKey = body.idempotencyKey
        ? `match-route:client:${userId}:${body.mode ?? "match"}:${body.idempotencyKey}`
        : deriveRouteIdempotencyKey(userId, body, now);

      const response = await deps.idempotencyRunner.runOnce(routeKey, 60_000, async (): Promise<MatchResponse> => {
        const intent = buildNormalizedIntent({
          activityIds: body.intent.activityIds,
          locationIds: body.intent.locationIds,
          sourceText: body.intent.text,
          startTime: parseAbsoluteTime(body.intent.time),
        });

        const extracted = extractIntentSignals(body.intent.text, now);
        const resolvedTime = resolveExplicitOrRelativeTime(body.intent.time, now) ?? (extracted.startTime
          ? { startTime: extracted.startTime, endTime: undefined }
          : null);
        if (body.mode === "create" && (!resolvedTime || new Date(resolvedTime.startTime).getTime() < now.getTime() - 60_000)) {
          throw Object.assign(new Error("Choose a valid start time in the future."), { status: 400 });
        }
        const resolvedIntent = {
          ...intent,
          title: details.title?.trim(),
          description: details.description?.trim(),
          capacity: details.capacity,
          durationMinutes: details.durationMinutes,
          locationIds: intent.locationIds.length ? intent.locationIds : extracted.locationIds,
          ...(resolvedTime ? { startTime: resolvedTime.startTime, endTime: resolvedTime.endTime } : {}),
        };

  const result = await deps.matchingService.match(userId, resolvedIntent, body.idempotencyKey, body.mode);

        const requester = await deps.userProfileService.getProfile(userId).catch(() => null);
        const otherParticipantIds = result.event.participantIds.filter((id) => id !== userId);
        const breakdown: ScoreBreakdown | undefined = result.breakdown;

        const matches: Match[] = [];
        for (const participantId of otherParticipantIds) {
          const participant = await deps.userProfileService.getProfile(participantId).catch(() => null);
          const shared = requester && participant ? intersect(requester.interests, participant.interests) : [];
          const match = await createMatch({
            ownerId: userId,
            studentId: participantId,
            activityType: result.event.canonicalActivity,
            score: result.score ?? 0,
            sharedInterests: shared,
            reasons: buildMatchReasons(breakdown, shared),
            status: result.outcome === "MATCHED" ? "accepted" : "suggested",
          });
          matches.push(match);
        }

        return { outcome: result.outcome, eventId: result.event.id, matches };
      });

      res.json(response);
    } catch (err) {
      if (err instanceof Error && "status" in err && err.status === 400) {
        res.status(400).json({ error: err.message });
        return;
      }
      next(err);
    }
  });

  return router;
}
