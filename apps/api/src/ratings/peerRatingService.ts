import { randomUUID } from "node:crypto";
import type { EventRecord, EventRatingsResponse, StarScore, Student, SubmitPeerRatingsRequest } from "shared-types";
import { getDb } from "../db/connection.js";

export interface PeerRatingDocument {
  _id: string;
  eventId: string;
  raterId: string;
  rateeId: string;
  score: StarScore;
  createdAt: string;
  updatedAt: string;
}

interface UserDocument {
  _id: string;
  name: string;
  initials: string;
  program: string;
  year: string;
  bio: string;
  interests: string[];
  vibes: string[];
  preferredActivities: string[];
  approximateLocation: string;
  walkingMinutes: number;
  availabilityLabel: string;
  avatarUrl?: string;
  ratingAverage?: number;
  ratingCount?: number;
}

function toStudent(doc: UserDocument): Student {
  return {
    id: doc._id,
    name: doc.name,
    initials: doc.initials,
    program: doc.program,
    year: doc.year,
    bio: doc.bio,
    interests: doc.interests as Student["interests"],
    vibes: doc.vibes as Student["vibes"],
    preferredActivities: doc.preferredActivities,
    approximateLocation: doc.approximateLocation,
    walkingMinutes: doc.walkingMinutes,
    availabilityLabel: doc.availabilityLabel,
    avatarUrl: doc.avatarUrl,
    ratingAverage: doc.ratingAverage,
    ratingCount: doc.ratingCount,
  };
}

function isStarScore(value: number): value is StarScore {
  return Number.isInteger(value) && value >= 1 && value <= 5;
}

export class PeerRatingError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = "PeerRatingError";
  }
}

export async function ratedEventIds(raterId: string, eventIds: string[]): Promise<Set<string>> {
  if (eventIds.length === 0) return new Set();
  const db = await getDb();
  const rows = await db
    .collection<PeerRatingDocument>("peerRatings")
    .find({ raterId, eventId: { $in: eventIds } }, { projection: { eventId: 1 } })
    .toArray();
  return new Set(rows.map((row) => row.eventId));
}

export async function getEventRatings(event: EventRecord, viewerId: string, now: Date): Promise<EventRatingsResponse> {
  if (!event.participantIds.includes(viewerId)) {
    throw new PeerRatingError("only participants can see ratings for this activity", 403);
  }

  const ended = new Date(event.endTime).getTime() <= now.getTime();
  const db = await getDb();
  const otherIds = event.participantIds.filter((id) => id !== viewerId);
  const users = otherIds.length
    ? await db.collection<UserDocument>("users").find({ _id: { $in: otherIds } }).toArray()
    : [];
  const existing = await db
    .collection<PeerRatingDocument>("peerRatings")
    .find({ eventId: event.id, raterId: viewerId })
    .toArray();
  const scoreByRatee = new Map(existing.map((row) => [row.rateeId, row.score]));

  const usersById = new Map(users.map((user) => [user._id, user]));
  const people = otherIds.flatMap((id) => {
    const user = usersById.get(id);
    if (!user) return [];
    const existingScore = scoreByRatee.get(id);
    return [{ student: toStudent(user), ...(existingScore ? { existingScore } : {}) }];
  });

  return {
    eventId: event.id,
    ended,
    endTime: event.endTime,
    submitted: existing.length > 0 && existing.length >= otherIds.length,
    people,
  };
}

export async function submitPeerRatings(
  event: EventRecord,
  raterId: string,
  body: SubmitPeerRatingsRequest,
  now: Date,
): Promise<void> {
  if (!event.participantIds.includes(raterId)) {
    throw new PeerRatingError("only participants can rate this activity", 403);
  }
  if (new Date(event.endTime).getTime() > now.getTime()) {
    throw new PeerRatingError("ratings open after the activity ends", 400);
  }

  const allowed = new Set(event.participantIds.filter((id) => id !== raterId));
  const ratings = body.ratings ?? [];
  if (ratings.length === 0) {
    throw new PeerRatingError("rate at least one person", 400);
  }

  const seen = new Set<string>();
  for (const rating of ratings) {
    if (!allowed.has(rating.userId)) {
      throw new PeerRatingError("you can only rate people who joined this activity", 400);
    }
    if (!isStarScore(rating.score)) {
      throw new PeerRatingError("each rating must be a whole number from 1 to 5", 400);
    }
    if (seen.has(rating.userId)) {
      throw new PeerRatingError("each person can only be rated once", 400);
    }
    seen.add(rating.userId);
  }

  const db = await getDb();
  const collection = db.collection<PeerRatingDocument>("peerRatings");
  const nowIso = now.toISOString();

  for (const rating of ratings) {
    await collection.updateOne(
      { eventId: event.id, raterId, rateeId: rating.userId },
      {
        $set: { score: rating.score, updatedAt: nowIso },
        $setOnInsert: { _id: randomUUID(), createdAt: nowIso },
      },
      { upsert: true },
    );
  }

  const rateeIds = Array.from(new Set(ratings.map((rating) => rating.userId)));
  await Promise.all(rateeIds.map((rateeId) => recomputeUserRating(rateeId)));
}

async function recomputeUserRating(userId: string): Promise<void> {
  const db = await getDb();
  const rows = await db.collection<PeerRatingDocument>("peerRatings").find({ rateeId: userId }).toArray();
  const ratingCount = rows.length;
  const ratingAverage =
    ratingCount === 0 ? 0 : Math.round((rows.reduce((sum, row) => sum + row.score, 0) / ratingCount) * 10) / 10;
  await db.collection("users").updateOne({ _id: userId }, { $set: { ratingAverage, ratingCount } });
}
