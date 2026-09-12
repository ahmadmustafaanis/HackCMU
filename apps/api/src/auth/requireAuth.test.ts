import type { Request, Response } from "express";
import { describe, expect, it, vi } from "vitest";
import { requireAuth } from "./requireAuth.js";
import { signSessionToken } from "./session.js";

function fakeReqRes(authHeader?: string) {
  const req = { header: (name: string) => (name.toLowerCase() === "authorization" ? authHeader : undefined) } as Request;
  const json = vi.fn();
  const status = vi.fn(() => ({ json }));
  const res = { status } as unknown as Response;
  const next = vi.fn();
  return { req, res, status, json, next };
}

describe("requireAuth", () => {
  it("sets req.userId and calls next for a valid bearer token", () => {
    const token = signSessionToken("student-42");
    const { req, res, next } = fakeReqRes(`Bearer ${token}`);
    requireAuth(req, res, next);
    expect(req.userId).toBe("student-42");
    expect(next).toHaveBeenCalledOnce();
  });

  it("responds 401 with no Authorization header at all", () => {
    const { req, res, status, next } = fakeReqRes(undefined);
    requireAuth(req, res, next);
    expect(status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
    expect(req.userId).toBeUndefined();
  });

  it("responds 401 for a header that isn't a Bearer token", () => {
    const { req, res, status, next } = fakeReqRes("Basic dXNlcjpwYXNz");
    requireAuth(req, res, next);
    expect(status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });

  it("responds 401 for an invalid/tampered token", () => {
    const { req, res, status, next } = fakeReqRes("Bearer not-a-real-token");
    requireAuth(req, res, next);
    expect(status).toHaveBeenCalledWith(401);
    expect(next).not.toHaveBeenCalled();
  });
});
