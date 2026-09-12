import jwt from "jsonwebtoken";

const DEFAULT_DEV_SECRET = "dev-only-insecure-secret-set-SESSION_JWT_SECRET";
const SESSION_TTL = "30d";

function getSecret(): string {
  const secret = process.env.SESSION_JWT_SECRET;
  if (!secret) {
    // eslint-disable-next-line no-console
    console.warn(
      "[auth] SESSION_JWT_SECRET is not set — using an insecure development-only " +
        "fallback. Set a real secret (e.g. `openssl rand -hex 32`) before deploying " +
        "anywhere real users will sign in."
    );
    return DEFAULT_DEV_SECRET;
  }
  return secret;
}

interface SessionPayload {
  userId: string;
}

/** Signs an opaque-looking but self-verifying session token. The token
 * itself carries no secrets — it's just `{ userId }` plus an expiry, signed
 * so a client can't forge or tamper with it. This is what makes
 * `req.userId` (set by requireAuth) trustworthy, unlike the mocked demo
 * auth's old plain `randomUUID()` token that nothing ever verified. */
export function signSessionToken(userId: string): string {
  const payload: SessionPayload = { userId };
  return jwt.sign(payload, getSecret(), { expiresIn: SESSION_TTL });
}

/** Verifies and decodes a session token. Returns null (never throws) on any
 * invalid/expired/tampered token — callers treat that as "not signed in". */
export function verifySessionToken(token: string): SessionPayload | null {
  try {
    const decoded = jwt.verify(token, getSecret());
    if (typeof decoded === "object" && decoded && typeof decoded.userId === "string") {
      return { userId: decoded.userId };
    }
    return null;
  } catch {
    return null;
  }
}
