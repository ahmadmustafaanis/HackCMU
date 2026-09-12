import { useAuth0 } from "@auth0/auth0-react";
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import Auth0SignInButton from "../components/Auth0SignInButton";
import Button from "../components/Button";
import GoogleSignInButton from "../components/GoogleSignInButton";
import { PawMark } from "../components/Icons";
import { api } from "../api/client";
import { hasCompletedOnboarding } from "../lib/onboarding";
import { useSession } from "../state/session";

export default function Welcome() {
  const navigate = useNavigate();
  const { student, restoring, setSession } = useSession();
  const { isAuthenticated: auth0Authenticated, isLoading: auth0Loading, error: auth0Error, getIdTokenClaims } = useAuth0();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Already signed in (session restored + verified on load) — skip straight
  // to Home instead of showing the welcome screen again. Deliberately keyed
  // ONLY on `restoring` (not `student`): this must fire exactly once, right
  // when restoration finishes, to redirect a RETURNING visitor.
  useEffect(() => {
    if (!restoring && student) {
      navigate(hasCompletedOnboarding(student) ? "/home" : "/onboarding", { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restoring]);

  const handleGoogleCredential = async (idToken: string) => {
    setLoading(true);
    setError(null);
    try {
      const { student: signedInStudent, sessionToken } = await api.googleLogin(idToken);
      setSession(signedInStudent, sessionToken, "google");
      navigate(hasCompletedOnboarding(signedInStudent) ? "/home" : "/onboarding");
    } catch {
      setError("Google sign-in failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (auth0Error) setError("Auth0 sign-in failed. Please try again.");
  }, [auth0Error]);

  const exchangeStarted = useRef(false);
  useEffect(() => {
    if (auth0Loading || !auth0Authenticated || student || exchangeStarted.current) return;
    exchangeStarted.current = true;
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const claims = await getIdTokenClaims();
        if (!claims?.__raw) throw new Error("Auth0 did not return an ID token");
        const { student: signedInStudent, sessionToken } = await api.auth0Login(claims.__raw);
        setSession(signedInStudent, sessionToken, "auth0");
        navigate(hasCompletedOnboarding(signedInStudent) ? "/home" : "/onboarding");
      } catch {
        setError("Auth0 sign-in failed. Please try again.");
      } finally {
        setLoading(false);
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [auth0Loading, auth0Authenticated, student]);

  const handleGuestContinue = async () => {
    setLoading(true);
    setError(null);
    try {
      const { student: guestStudent, sessionToken } = await api.demoLogin({});
      setSession(guestStudent, sessionToken, "demo");
      navigate(hasCompletedOnboarding(guestStudent) ? "/home" : "/onboarding");
    } catch {
      setError("Couldn't reach the server. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (restoring) {
    return (
      <div className="flex flex-1 items-center justify-center" aria-live="polite" aria-busy="true">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-line border-t-primary" />
        <span className="sr-only">Restoring your session</span>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-10 px-8 py-12 text-center">
      <div className="flex flex-col items-center gap-5">
        <div className="welcome-mark flex h-20 w-20 items-center justify-center rounded-[22px] bg-primary text-white shadow-[0_14px_28px_-16px_rgb(196_18_48_/_0.8)]">
          <PawMark className="h-10 w-10" />
        </div>
        <div className="welcome-title">
          <h1 className="font-display text-[2.15rem] font-medium leading-[1.1] text-ink">Scotty’s Circle</h1>
          <span className="welcome-rule mx-auto mt-3 block h-px w-16 bg-primary" />
          <p className="mt-3 text-base text-muted">Find your people. Find your thing.</p>
        </div>
      </div>

      <div className="flex w-full flex-col items-center gap-4">
        <GoogleSignInButton onCredential={handleGoogleCredential} />
        <Auth0SignInButton disabled={loading} />

        <div className="flex w-full items-center gap-3 text-xs text-muted">
          <span className="h-px flex-1 bg-line" />
          or
          <span className="h-px flex-1 bg-line" />
        </div>

        <Button onClick={handleGuestContinue} disabled={loading} variant="secondary" className="w-full">
          {loading ? "Connecting…" : "Continue as Guest (demo)"}
        </Button>

        {error && <p className="text-sm text-primary">{error}</p>}
        <p className="text-xs text-muted">Guest mode skips real sign-in. No Google account needed to try the app.</p>
      </div>
    </div>
  );
}
