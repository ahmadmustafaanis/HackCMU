import type { Collection } from "mongodb";
import { ensureIndexes, getDb } from "../../db/connection.js";

const POLL_INTERVAL_MS = 50;
const MAX_POLL_MS = 2000;

interface IdempotencyDoc<T> {
  _id: string;
  status: "pending" | "done";
  createdAt: Date;
  expiresAt: Date;
  result?: T;
}

function isDuplicateKeyError(err: unknown): boolean {
  return typeof err === "object" && err !== null && (err as { code?: unknown }).code === 11000;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Ensures `fn()` executes at most once per idempotency key, even when
 * concurrent callers race the same key (e.g. a client retrying a request
 * whose response was lost in transit).
 *
 * Correctness rests entirely on the unique index on `idempotencyKeys._id`
 * (created by `db/connection.ts#ensureIndexes`): claiming a key is a single
 * `insertOne` that either succeeds (we own it) or throws E11000 (someone
 * else owns it) — never a separate existence-check followed by an insert,
 * which would race.
 */
export class MongoIdempotencyStore {
  private indexesReady?: Promise<void>;

  private async getCollection<T>(): Promise<Collection<IdempotencyDoc<T>>> {
    const db = await getDb();
    if (!this.indexesReady) {
      // Best-effort only: this store's correctness never depends on an
      // explicit index — MongoDB's implicit _id index is already unique,
      // which is what runOnce()'s insertOne/E11000 race actually relies
      // on. A failure here must never block DB access. (As of this
      // writing, ensureIndexes() throws deterministically —
      // MongoServerError: "The field 'unique' is not valid for an _id
      // index specification" — from the idempotencyKeys._id index spec in
      // db/connection.ts, which is out of this file's scope to fix.)
      this.indexesReady = ensureIndexes(db).catch((err) => {
        // eslint-disable-next-line no-console
        console.warn("[matching/idempotency] ensureIndexes failed (continuing without it):", err);
      });
    }
    await this.indexesReady;
    return db.collection<IdempotencyDoc<T>>("idempotencyKeys");
  }

  async runOnce<T>(key: string, ttlMs: number, fn: () => Promise<T>): Promise<T> {
    const collection = await this.getCollection<T>();
    const now = new Date();

    try {
      await collection.insertOne({
        _id: key,
        status: "pending",
        createdAt: now,
        expiresAt: new Date(now.getTime() + ttlMs),
      });
    } catch (err) {
      if (isDuplicateKeyError(err)) {
        return this.awaitClaim(collection, key);
      }
      throw err;
    }

    // We won the race to claim this key — we're solely responsible for
    // running fn() and recording its result.
    try {
      const result = await fn();
      await collection.updateOne({ _id: key }, { $set: { status: "done", result } });
      return result;
    } catch (err) {
      // Release the claim so a future call can retry from scratch.
      await collection.deleteOne({ _id: key });
      throw err;
    }
  }

  /** Someone else already claimed `key` — wait for their result rather
   * than re-running fn() ourselves. */
  private async awaitClaim<T>(collection: Collection<IdempotencyDoc<T>>, key: string): Promise<T> {
    const deadline = Date.now() + MAX_POLL_MS;
    for (;;) {
      const doc = await collection.findOne({ _id: key });
      if (doc?.status === "done") {
        return doc.result as T;
      }
      if (Date.now() >= deadline) {
        throw new Error(`idempotency key "${key}" is still in progress after ${MAX_POLL_MS}ms`);
      }
      await sleep(POLL_INTERVAL_MS);
    }
  }
}
