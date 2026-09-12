import { useAuth0 } from "@auth0/auth0-react";
import Button from "./Button";

const DOMAIN = import.meta.env.VITE_AUTH0_DOMAIN as string | undefined;
const CLIENT_ID = import.meta.env.VITE_AUTH0_CLIENT_ID as string | undefined;

interface Auth0SignInButtonProps {
  disabled?: boolean;
}

/** Redirects to Auth0's Universal Login (a full-page redirect, not a popup
 * — Auth0's own recommended flow: no popup-blocker or third-party-cookie
 * edge cases, and it's the path auth0-provider hardens against React
 * StrictMode's dev-only double-effect invocation). Auth0 sends the browser
 * back to this app's origin afterward; Welcome's own effect (keyed on
 * useAuth0()'s `isAuthenticated`) picks up the resulting ID token and
 * exchanges it for a session via POST /api/auth/auth0. Falls back to a
 * plain explanatory note if VITE_AUTH0_DOMAIN/VITE_AUTH0_CLIENT_ID aren't
 * configured yet, rather than rendering a broken/non-functional button. */
export default function Auth0SignInButton({ disabled }: Auth0SignInButtonProps) {
  const { loginWithRedirect } = useAuth0();

  if (!DOMAIN || !CLIENT_ID) {
    return (
      <p className="text-xs text-muted">
        Auth0 sign-in isn&apos;t configured yet — set <code>VITE_AUTH0_DOMAIN</code> and{" "}
        <code>VITE_AUTH0_CLIENT_ID</code> in <code>apps/web/.env</code> to enable it.
      </p>
    );
  }

  return (
    <Button onClick={() => loginWithRedirect()} disabled={disabled} variant="secondary" className="w-full">
      Continue with Auth0
    </Button>
  );
}
