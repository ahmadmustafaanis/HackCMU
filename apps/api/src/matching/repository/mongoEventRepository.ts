import { randomUUID } from "node:crypto";
import type { Collection, Filter, WithId } from "mongodb";
import type { EventRecord, EventRepository, JoinResult, NormalizedIntent } from "shared-types";
import { ensureIndexes, getDb } from "../../db/connection.js";

/** The `events` collection's on-disk shape: identical to EventRecord except
 * Mongo's own `_id` plays the role of `id` — we never store a redundant
 * `id` field alongside `_id`. */
type EventDocument = Omit<EventRecord, "id"> & { _id: string };

function toEventRecord(doc: WithId<EventDocument>): EventRecord {
  const { _id, ...rest } = doc;
  return { id: _id, ...rest };
}

/**
 * MongoDB-backed EventRepository. See ../CLAUDE.md and this directory's
 * CLAUDE.md for the atomicity contract this class must uphold:
 *   - every read path independently filters expiresAt > now (never trusts
 *     status alone — a background expiry sweep may not have run yet)
 *   - joinIfValid is a SINGLE findOneAndUpdate; capacity/duplicate checks
 *     live in the same atomic operation as the mutation, never as a
 *     preceding read-then-write.
 */
export class MongoEventRepository implements EventRepository {
  private indexesReady?: Promise<void>;

  private async getCollection(): Promise<Collection<EventDocument>> {
    const db = await getDb();
    if (!this.indexesReady) {
      // Best-effort: index creation is a performance optimization, not a
      // correctness requirement, for this file's operations (every query
      // here independently filters expiresAt/status regardless of which
      // indexes exist). A failure must never block DB access entirely —
      // as of this writing, ensureIndexes() throws deterministically
      // (MongoServerError: "The field 'unique' is not valid for an _id
      // index specification", from the idempotencyKeys._id index spec in
      // db/connection.ts, which is out of this file's scope to fix) —
      // without this guard, every call to this repository would fail.
      this.indexesReady = ensureIndexes(db).catch((err) => {
        // eslint-disable-next-line no-console
        console.warn("[matching/repository] ensureIndexes failed (continuing without it):", err);
      });
    }
    await this.indexesReady;
    return db.collection<EventDocument>("events");
  }

  async retrieveCandidates(intent: NormalizedIntent, now: Date, limit: number): Promise<EventRecord[]> {
    const collection = await this.getCollection();

    const filter: Filter<EventDocument> = {
      status: "OPEN",
      expiresAt: { $gt: now.toISOString() },
      isFull: false,
    };

    // Best-effort indexed prefilter only — the caller (scoring/ranking)
    // does the detailed relevance work. Prefer the most specific signal
    // available and fall back progressively.
    if (intent.activityIds.length > 0) {
      filter.canonicalActivity = { $in: intent.activityIds };
    } else if (intent.categoryIds.length > 0) {
      filter.category = { $in: intent.categoryIds };
    }

    const docs = await collection.find(filter).limit(limit).toArray();
    return docs.map(toEventRecord);
  }

  async joinIfValid(eventId: string, userId: string, now: Date): Promise<JoinResult> {
    const collection = await this.getCollection();
    const nowIso = now.toISOString();

    // Single atomic round-trip: the filter revalidates OPEN/not-expired/
    // has-capacity/not-already-joined, and the aggregation-pipeline update
    // computes the new participant count/fullness/status from the
    // document's own current values — never a separate read then write.
    const result = await collection.findOneAndUpdate(
      {
        _id: eventId,
        status: "OPEN",
        expiresAt: { $gt: nowIso },
        participantIds: { $ne: userId },
        isFull: false,
      },
      [
        {
          $set: {
            participantIds: { $concatArrays: ["$participantIds", [userId]] },
            participantCount: { $add: ["$participantCount", 1] },
          },
        },
        {
          $set: {
            isFull: { $gte: ["$participantCount", "$capacity"] },
            status: { $cond: [{ $gte: ["$participantCount", "$capacity"] }, "FULL", "$status"] },
          },
        },
      ],
      { returnDocument: "after" }
    );

    if (result) {
      return { ok: true, event: toEventRecord(result) };
    }

    // The atomic filter didn't match. Do a cheap (non-atomic, messaging
    // only) follow-up read to explain why — this is never used to decide
    // whether the join happens, only to pick a JoinFailureReason.
    const existing = await collection.findOne({ _id: eventId });

    if (!existing) {
      return { ok: false, reason: "NOT_FOUND" };
    }
    if (existing.participantIds.includes(userId)) {
      return { ok: false, reason: "ALREADY_JOINED" };
    }
    if (existing.expiresAt <= nowIso) {
      return { ok: false, reason: "EXPIRED" };
    }
    if (existing.isFull || existing.participantCount >= existing.capacity) {
      return { ok: false, reason: "FULL" };
    }
    if (existing.status !== "OPEN") {
      return { ok: false, reason: "NOT_OPEN" };
    }
    // The filter's conditions above should be exhaustive given the checks
    // just performed; this is an unreachable-in-practice safety net.
    return { ok: false, reason: "NOT_OPEN" };
  }

  async create(event: Omit<EventRecord, "id">): Promise<EventRecord> {
    const collection = await this.getCollection();

    // Safety net: default isFull from capacity/participantCount if the
    // caller didn't set it consistently, rather than trusting it blindly.
    const capacityFull = event.participantCount >= event.capacity;
    const isFull = event.isFull ?? capacityFull;

    const doc: EventDocument = {
      ...event,
      isFull,
      _id: randomUUID(),
    };

    await collection.insertOne(doc);
    return toEventRecord(doc as WithId<EventDocument>);
  }

  async getById(eventId: string): Promise<EventRecord | null> {
    const collection = await this.getCollection();
    const doc = await collection.findOne({ _id: eventId });
    return doc ? toEventRecord(doc) : null;
  }

  async listOpen(now: Date, limit: number): Promise<EventRecord[]> {
    const collection = await this.getCollection();
    const docs = await collection
      .find({ status: "OPEN", expiresAt: { $gt: now.toISOString() } })
      .limit(limit)
      .toArray();
    return docs.map(toEventRecord);
  }

  async listForUser(userId: string, _now: Date, limit: number): Promise<EventRecord[]> {
    const collection = await this.getCollection();
    const docs = await collection.find({ participantIds: userId }).sort({ startTime: 1 }).limit(limit).toArray();
    return docs.map(toEventRecord);
  }
}
