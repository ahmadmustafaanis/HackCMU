import { OAuth2Client } from "google-auth-library";

export interface GoogleProfile {
  googleId: string;
  email: string;
  emailVerified: boolean;
  name: string;
  pictureUrl?: string;
}

let client: OAuth2Client | undefined;

function getClient(): OAuth2Client {
  if (!client) {
    client = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);
  }
  return client;
}

/** Verifies a Google Identity Services ID token (the `credential` the
 * frontend's Sign In With Google button hands back) against Google's public
 * keys and our own registered Client ID (the `audience` check — this is
 * what stops a token minted for a DIFFERENT app from being replayed here).
 * Throws on any invalid/expired/wrong-audience token; never returns a
 * partially-trusted result. */
export async function verifyGoogleIdToken(idToken: string): Promise<GoogleProfile> {
  const audience = process.env.GOOGLE_CLIENT_ID;
  if (!audience) {
    throw new Error(
      "GOOGLE_CLIENT_ID is not set — Sign in with Google cannot verify tokens without it. See apps/api/.env.example."
    );
  }

  const ticket = await getClient().verifyIdToken({ idToken, audience });
  const payload = ticket.getPayload();
  if (!payload || !payload.sub || !payload.email) {
    throw new Error("Google ID token payload is missing required fields");
  }

  return {
    googleId: payload.sub,
    email: payload.email,
    emailVerified: payload.email_verified === true,
    name: payload.name ?? payload.email.split("@")[0]!,
    pictureUrl: payload.picture,
  };
}
