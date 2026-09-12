import jwt from "jsonwebtoken";
import jwksClient from "jwks-rsa";

export interface Auth0Profile {
  auth0Id: string;
  email: string;
  emailVerified: boolean;
  name: string;
  pictureUrl?: string;
}

let client: jwksClient.JwksClient | undefined;

function getClient(domain: string): jwksClient.JwksClient {
  if (!client) {
    client = jwksClient({ jwksUri: `https://${domain}/.well-known/jwks.json` });
  }
  return client;
}

function getSigningKey(domain: string, kid: string): Promise<string> {
  return new Promise((resolve, reject) => {
    getClient(domain).getSigningKey(kid, (err, key) => {
      if (err || !key) {
        reject(err ?? new Error("Auth0 JWKS has no signing key for this token's kid"));
        return;
      }
      resolve(key.getPublicKey());
    });
  });
}

/** Verifies an Auth0 Universal Login ID token (the raw JWT the frontend's
 * Auth0 SDK hands back after the user signs in) against Auth0's own JWKS
 * endpoint for our tenant, and our registered Client ID (the `audience`
 * check — same role as the Google flow's audience check: stops a token
 * minted for a different Auth0 application from being replayed here).
 * Throws on any invalid/expired/wrong-audience/wrong-issuer token; never
 * returns a partially-trusted result. */
export async function verifyAuth0IdToken(idToken: string): Promise<Auth0Profile> {
  const domain = process.env.AUTH0_DOMAIN;
  const audience = process.env.AUTH0_CLIENT_ID;
  if (!domain || !audience) {
    throw new Error(
      "AUTH0_DOMAIN / AUTH0_CLIENT_ID are not set — Sign in with Auth0 cannot verify tokens without them. See apps/api/.env.example."
    );
  }

  const decoded = jwt.decode(idToken, { complete: true });
  if (!decoded || typeof decoded === "string" || !decoded.header.kid) {
    throw new Error("malformed Auth0 ID token");
  }

  const signingKey = await getSigningKey(domain, decoded.header.kid);
  const payload = jwt.verify(idToken, signingKey, {
    audience,
    issuer: `https://${domain}/`,
    algorithms: ["RS256"],
  });

  if (typeof payload === "string" || !payload.sub || !payload.email) {
    throw new Error("Auth0 ID token payload is missing required fields");
  }

  return {
    auth0Id: payload.sub,
    email: payload.email as string,
    emailVerified: payload.email_verified === true,
    name: (payload.name as string | undefined) ?? (payload.email as string).split("@")[0]!,
    pictureUrl: payload.picture as string | undefined,
  };
}
