import { randomUUID } from "node:crypto";
import type { Match, MatchStatus, ScoreBreakdown } from "shared-types";
import { getDb } from "../db/connection.js";

interface MatchDocument {
  _id: string;
  /** The viewer this match record belongs to — i.e. whose "matches" list it
   * shows up in. Internal only: never exposed on the public Match shape,
   * which only names the *other* person (`studentId`). Without this, GET
   * /api/matches/:userId would have no way to know which side of a match a
   * given userId is on. */
  ownerId: string;
  studentId: string;
  activityType: string;
  score: number;
  sharedInterests: Match["sharedInterests"];
  reasons: string[];
  status: MatchStatus;
}

function toMatch(doc: MatchDocument): Match {
  return {
    id: doc._id,
    studentId: doc.studentId,
    activityType: doc.activityType,
    score: doc.score,
    sharedInterests: doc.sharedInterests,
    reasons: doc.reasons,
    status: doc.status,
  };
}

async function collection() {
  const db = await getDb();
  return db.collection<MatchDocument>("matches");
}

export async function createMatch(input: Omit<Match, "id"> & { ownerId: string }): Promise<Match> {
  const doc: MatchDocument = { _id: randomUUID(), ...input };
  await (await collection()).insertOne(doc);
  return toMatch(doc);
}

export async function getMatchById(id: string): Promise<Match | null> {
  const doc = await (await collection()).findOne({ _id: id });
  return doc ? toMatch(doc) : null;
}

export async function listMatchesForStudent(ownerId: string): Promise<Match[]> {
  const docs = await (await collection()).find({ ownerId }).toArray();
  return docs.map(toMatch);
}

export async function listConnectionsForStudent(ownerId: string): Promise<Match[]> {
  const docs = await (await collection()).find({ ownerId, status: "connected" }).toArray();
  return docs.map(toMatch);
}

export async function updateMatchStatus(id: string, status: MatchStatus): Promise<Match | null> {
  const doc = await (await collection()).findOneAndUpdate({ _id: id }, { $set: { status } }, { returnDocument: "after" });
  return doc ? toMatch(doc) : null;
}

/** Deterministic, template-based human-readable reasons — no LLM. Picks at
 * most 3, always returns at least one. */
export function buildMatchReasons(breakdown: ScoreBreakdown | undefined, sharedTags: string[]): string[] {
  const reasons: string[] = [];

  if (breakdown && breakdown.timeScore >= 0.7) {
    reasons.push("You're both free around the same time");
  }
  if (breakdown && breakdown.locationScore >= 0.7) {
    reasons.push("You're nearby");
  }
  for (const tag of sharedTags) {
    if (reasons.length >= 3) break;
    reasons.push(`You both like ${tag}`);
  }
  if (reasons.length === 0) {
    reasons.push("You're both interested in this activity");
  }

  return reasons.slice(0, 3);
}
