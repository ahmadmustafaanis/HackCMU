import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Button from "../components/Button";
import Card from "../components/Card";
import { PawMark } from "../components/Icons";
import GoogleSignInButton from "../components/GoogleSignInButton";
import { api } from "../api/client";
import { useSession } from "../state/session";

/** Lightweight fallback screen at /login — the primary entry point is
 * Welcome's own sign-in options, but this route offers the same choices for
 * anyone who lands here directly. */
export default function Login() {
  const navigate = useNavigate();
  const { setSession } = useSession();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGoogleCredential = async (idToken: string) => {
    setLoading(true);
    setError(null);
    try {
      const { student, sessionToken } = await api.googleLogin(idToken);
      setSession(student, sessionToken);
      navigate("/onboarding");
    } catch {
      setError("Google sign-in failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleGuestLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      const { student, sessionToken } = await api.demoLogin({});
      setSession(student, sessionToken);
      navigate("/onboarding");
    } catch {
      setError("Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6 px-6 py-12">
      <Card className="flex w-full flex-col items-center gap-4 text-center">
        <div className="flex h-14 w-14 items-center justify-center rounded-[16px] bg-primary text-white">
          <PawMark className="h-7 w-7" />
        </div>
        <div>
          <h1 className="font-display text-2xl font-medium text-ink">Sign in to Scotty&apos;s Circle</h1>
          <p className="mt-1 text-sm text-muted">Use your Google account to continue.</p>
        </div>

        <GoogleSignInButton onCredential={handleGoogleCredential} />

        <div className="flex w-full items-center gap-3 text-xs text-muted">
          <span className="h-px flex-1 bg-line" />
          or
          <span className="h-px flex-1 bg-line" />
        </div>

        <Button onClick={handleGuestLogin} disabled={loading} variant="secondary" className="w-full">
          {loading ? "Signing in…" : "Continue as Guest (demo)"}
        </Button>
        {error && <p className="text-sm text-primary">{error}</p>}
      </Card>
    </div>
  );
}
