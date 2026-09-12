import { describe, expect, it } from "vitest";
import { signSessionToken, verifySessionToken } from "./session.js";

describe("session tokens", () => {
  it("round-trips a signed token back to the same userId", () => {
    const token = signSessionToken("user-123");
    const session = verifySessionToken(token);
    expect(session).toEqual({ userId: "user-123" });
  });

  it("rejects a tampered token", () => {
    const token = signSessionToken("user-123");
    const tampered = token.slice(0, -2) + (token.at(-2) === "a" ? "b" : "a") + token.at(-1);
    expect(verifySessionToken(tampered)).toBeNull();
  });

  it("rejects garbage input without throwing", () => {
    expect(verifySessionToken("not.a.jwt")).toBeNull();
    expect(verifySessionToken("")).toBeNull();
  });

  it("produces different tokens for different users", () => {
    const a = signSessionToken("user-a");
    const b = signSessionToken("user-b");
    expect(a).not.toEqual(b);
    expect(verifySessionToken(a)?.userId).toBe("user-a");
    expect(verifySessionToken(b)?.userId).toBe("user-b");
  });
});
