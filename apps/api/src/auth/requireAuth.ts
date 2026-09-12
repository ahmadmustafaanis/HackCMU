import type { NextFunction, Request, Response } from "express";
import { verifySessionToken } from "./session.js";

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      /** The AUTHORITATIVE user id, derived from a verified session token —
       * never from a client-supplied body/query field. Only present after
       * requireAuth has run. */
      userId?: string;
    }
  }
}

/** Express middleware: requires a valid `Authorization: Bearer <token>`
 * session token (issued by POST /api/auth/google), and sets `req.userId`
 * from it. Responds 401 on anything missing/invalid — never falls back to
 * trusting a client-supplied user id. */
export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const header = req.header("authorization");
  const token = header?.startsWith("Bearer ") ? header.slice("Bearer ".length) : undefined;

  if (!token) {
    res.status(401).json({ error: "missing bearer session token" });
    return;
  }

  const session = verifySessionToken(token);
  if (!session) {
    res.status(401).json({ error: "invalid or expired session" });
    return;
  }

  req.userId = session.userId;
  next();
}

/** Attaches `req.userId` when a valid session is present; never 401s.
 * Use on read paths that personalize when signed in (canRate, joined). */
export function optionalAuth(req: Request, _res: Response, next: NextFunction): void {
  const header = req.header("authorization");
  const token = header?.startsWith("Bearer ") ? header.slice("Bearer ".length) : undefined;
  if (!token) {
    next();
    return;
  }
  const session = verifySessionToken(token);
  if (session) req.userId = session.userId;
  next();
}
