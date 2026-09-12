import { afterAll, describe, expect, it } from "vitest";
import type { EventRecord } from "shared-types";
import { closeDb } from "../../db/connection.js";
import { MongoEventRepository } from "./mongoEventRepository.js";

afterAll(async () => {
  await closeDb();
});

const HOUR_MS = 60 * 60 * 1000;

function buildEvent(overrides: Partial<Omit<EventRecord, "id">> = {}): Omit<EventRecord, "id"> {
  const now = Date.now();
  return {
    title: "Coffee run",
    canonicalActivity: "coffee",
    category: "food",
    tags: ["casual"],
    startTime: new Date(now).toISOString(),
    endTime: new Date(now + HOUR_MS).toISOString(),
    durationMinutes: 60,
    locationId: "cuc",
    capacity: 4,
    participantIds: [],
    participantCount: 0,
    isFull: false,
    hostId: "host-1",
    vibe: "Casual",
    status: "OPEN",
    createdAt: new Date(now).toISOString(),
    expiresAt: new Date(now + HOUR_MS).toISOString(),
    ...overrides,
  };
}

describe("MongoEventRepository", () => {
  it("races two different users joining the last slot: exactly one succeeds and the event ends up full", async () => {
    const repo = new MongoEventRepository();
    const now = new Date();

    const created = await repo.create(
      buildEvent({
        capacity: 4,
        participantIds: ["u1", "u2", "u3"],
        participantCount: 3,
      })
    );

    const [resultA, resultB] = await Promise.all([
      repo.joinIfValid(created.id, "userA", now),
      repo.joinIfValid(created.id, "userB", now),
    ]);

    const outcomes = [resultA, resultB];
    const successes = outcomes.filter((r) => r.ok);
    const failures = outcomes.filter((r) => !r.ok);

    expect(successes).toHaveLength(1);
    expect(failures).toHaveLength(1);
    expect(failures[0]).toMatchObject({ ok: false, reason: "FULL" });

    const finalEvent = await repo.getById(created.id);
    expect(finalEvent).not.toBeNull();
    expect(finalEvent!.participantCount).toBe(4);
    expect(finalEvent!.isFull).toBe(true);
    expect(finalEvent!.status).toBe("FULL");
    expect(finalEvent!.participantIds).toHaveLength(4);
    expect(finalEvent!.participantIds).toEqual(expect.arrayContaining(["u1", "u2", "u3"]));
  });

  it("rejects a second join from the same user with ALREADY_JOINED", async () => {
    const repo = new MongoEventRepository();
    const now = new Date();

    const created = await repo.create(buildEvent({ capacity: 5, participantIds: [], participantCount: 0 }));

    const first = await repo.joinIfValid(created.id, "userA", now);
    expect(first).toMatchObject({ ok: true });

    const second = await repo.joinIfValid(created.id, "userA", now);
    expect(second).toEqual({ ok: false, reason: "ALREADY_JOINED" });
  });

  it("rejects joining an expired event with EXPIRED", async () => {
    const repo = new MongoEventRepository();
    const now = new Date();
    const past = new Date(now.getTime() - HOUR_MS);

    const created = await repo.create(
      buildEvent({
        startTime: past.toISOString(),
        endTime: past.toISOString(),
        expiresAt: past.toISOString(),
        capacity: 5,
        participantIds: [],
        participantCount: 0,
      })
    );

    const result = await repo.joinIfValid(created.id, "userA", now);
    expect(result).toEqual({ ok: false, reason: "EXPIRED" });
  });

  it("rejects joining a non-existent event with NOT_FOUND", async () => {
    const repo = new MongoEventRepository();
    const result = await repo.joinIfValid("does-not-exist", "userA", new Date());
    expect(result).toEqual({ ok: false, reason: "NOT_FOUND" });
  });

  it("create() maps _id to id and does not store a redundant id field", async () => {
    const repo = new MongoEventRepository();
    const created = await repo.create(buildEvent());
    expect(typeof created.id).toBe("string");
    expect(created.id.length).toBeGreaterThan(0);

    const fetched = await repo.getById(created.id);
    expect(fetched).toEqual(created);
  });

  it("retrieveCandidates filters by status/expiry/capacity and activityIds", async () => {
    const repo = new MongoEventRepository();
    const now = new Date();

    const open = await repo.create(buildEvent({ canonicalActivity: "coffee" }));
    await repo.create(
      buildEvent({
        canonicalActivity: "coffee",
        expiresAt: new Date(now.getTime() - HOUR_MS).toISOString(),
      })
    );
    await repo.create(buildEvent({ canonicalActivity: "coffee", isFull: true }));

    const candidates = await repo.retrieveCandidates(
      { activityIds: ["coffee"], categoryIds: [], tags: [], locationIds: [] },
      now,
      10
    );

    const ids = candidates.map((c) => c.id);
    expect(ids).toContain(open.id);
    expect(candidates.every((c) => c.status === "OPEN" && !c.isFull)).toBe(true);
  });

  it("listOpen returns only OPEN, non-expired events", async () => {
    const repo = new MongoEventRepository();
    const now = new Date();

    const open = await repo.create(buildEvent());
    const expired = await repo.create(
      buildEvent({ expiresAt: new Date(now.getTime() - HOUR_MS).toISOString() })
    );

    const results = await repo.listOpen(now, 50);
    const ids = results.map((e) => e.id);
    expect(ids).toContain(open.id);
    expect(ids).not.toContain(expired.id);
  });

  it("listForUser flushes expired and closed events from My Activities", async () => {
    const repo = new MongoEventRepository();
    const now = new Date();
    const active = await repo.create(buildEvent({ participantIds: ["user-1"], participantCount: 1 }));
    const expired = await repo.create(buildEvent({
      participantIds: ["user-1"],
      participantCount: 1,
      expiresAt: new Date(now.getTime() - HOUR_MS).toISOString(),
    }));
    const cancelled = await repo.create(buildEvent({ participantIds: ["user-1"], status: "CANCELLED" }));

    const results = await repo.listForUser("user-1", now, 50);
    const ids = results.map((event) => event.id);
    expect(ids).toContain(active.id);
    expect(ids).not.toContain(expired.id);
    expect(ids).not.toContain(cancelled.id);
  });
});
