import { afterAll, describe, expect, it } from "vitest";
import { closeDb } from "../../db/connection.js";
import { MongoIdempotencyStore } from "./idempotencyStore.js";

afterAll(async () => {
  await closeDb();
});

describe("MongoIdempotencyStore", () => {
  it("runs fn exactly once for two concurrent calls with the same key, and both resolve to the same result", async () => {
    const store = new MongoIdempotencyStore();
    let counter = 0;
    const fn = async (): Promise<string> => {
      counter += 1;
      // Give the second racer a chance to hit the duplicate-key path
      // before this one finishes.
      await new Promise((resolve) => setTimeout(resolve, 25));
      return `result-${counter}`;
    };

    const [a, b] = await Promise.all([
      store.runOnce("same-key", 60_000, fn),
      store.runOnce("same-key", 60_000, fn),
    ]);

    expect(counter).toBe(1);
    expect(a).toBe("result-1");
    expect(b).toBe("result-1");
  });

  it("waits for a slow owner instead of failing the duplicate caller", async () => {
    const store = new MongoIdempotencyStore();
    let counter = 0;
    const fn = async (): Promise<string> => {
      counter += 1;
      await new Promise((resolve) => setTimeout(resolve, 2_100));
      return "slow-result";
    };

    const owner = store.runOnce("slow-key", 60_000, fn);
    await new Promise((resolve) => setTimeout(resolve, 50));
    const duplicate = store.runOnce("slow-key", 60_000, fn);

    await expect(duplicate).resolves.toBe("slow-result");
    await expect(owner).resolves.toBe("slow-result");
    expect(counter).toBe(1);
  }, 10_000);

  it("runs fn independently for two different keys", async () => {
    const store = new MongoIdempotencyStore();
    let counterA = 0;
    let counterB = 0;

    const [a, b] = await Promise.all([
      store.runOnce("key-a", 60_000, async () => {
        counterA += 1;
        return "a-result";
      }),
      store.runOnce("key-b", 60_000, async () => {
        counterB += 1;
        return "b-result";
      }),
    ]);

    expect(counterA).toBe(1);
    expect(counterB).toBe(1);
    expect(a).toBe("a-result");
    expect(b).toBe("b-result");
  });

  it("releases the claim and rethrows when fn() fails, so a later call can retry", async () => {
    const store = new MongoIdempotencyStore();
    let attempts = 0;

    await expect(
      store.runOnce("failing-key", 60_000, async () => {
        attempts += 1;
        throw new Error("boom");
      })
    ).rejects.toThrow("boom");

    const result = await store.runOnce("failing-key", 60_000, async () => {
      attempts += 1;
      return "recovered";
    });

    expect(result).toBe("recovered");
    expect(attempts).toBe(2);
  });
});
