import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import Button from "../components/Button";
import GoogleSignInButton from "../components/GoogleSignInButton";
import { api } from "../api/client";
import { useSession } from "../state/session";

export default function Welcome() {
  const navigate = useNavigate();
  const { student, restoring, setSession } = useSession();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Already signed in (session restored + verified on load) — skip straight
  // to Home instead of showing the welcome screen again. Deliberately keyed
  // ONLY on `restoring` (not `student`): this must fire exactly once, right
  // when restoration finishes, to redirect a RETURNING visitor. If it also
  // re-ran on every `student` change, it would race a fresh interactive
  // sign-in's own `navigate("/onboarding")` below (setSession's state update
  // and that navigate can land in the same render pass) and incorrectly
  // skip onboarding for brand-new sign-ins too.
  useEffect(() => {
    if (!restoring && student) navigate("/home", { replace: true });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [restoring]);

  const handleGoogleCredential = async (idToken: string) => {
    setLoading(true);
    setError(null);
    try {
      const { student: signedInStudent, sessionToken } = await api.googleLogin(idToken);
      setSession(signedInStudent, sessionToken);
      navigate("/onboarding");
    } catch {
      setError("Google sign-in failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleGuestContinue = async () => {
    setLoading(true);
    setError(null);
    try {
      const { student: guestStudent, sessionToken } = await api.demoLogin({});
      setSession(guestStudent, sessionToken);
      navigate("/onboarding");
    } catch {
      setError("Couldn't reach the server. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (restoring) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-line border-t-primary" />
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-10 px-8 py-12 text-center">
      <div className="flex flex-col items-center gap-4">
        <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-primary text-4xl shadow-lg shadow-primary/20">
          🐾
        </div>
        <div>
          <h1 className="text-3xl font-bold text-ink">Scotty&apos;s Circle</h1>
          <p className="mt-2 text-base text-muted">Find your people. Find your thing.</p>
        </div>
      </div>

      <div className="flex w-full flex-col items-center gap-4">
        <GoogleSignInButton onCredential={handleGoogleCredential} />

        <div className="flex w-full items-center gap-3 text-xs text-muted">
          <span className="h-px flex-1 bg-line" />
          or
          <span className="h-px flex-1 bg-line" />
        </div>

        <Button onClick={handleGuestContinue} disabled={loading} variant="secondary" className="w-full">
          {loading ? "Connecting…" : "Continue as Guest (demo)"}
        </Button>

        {error && <p className="text-sm text-primary">{error}</p>}
        <p className="text-xs text-muted">Guest mode skips real sign-in — no Google account needed to try the app.</p>
      </div>
    </div>
  );
}
