import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Button from "../components/Button";
import Card from "../components/Card";
import { api } from "../api/client";
import { useSession } from "../state/session";

/** Lightweight fallback screen at /login — the primary entry point is
 * Welcome's own "Continue with CMU" button, but this route offers the same
 * mock CMU sign-in action for anyone who lands here directly. */
export default function Login() {
  const navigate = useNavigate();
  const { setSession } = useSession();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async () => {
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
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-2xl">🐾</div>
        <div>
          <h1 className="text-xl font-semibold text-ink">Sign in to Scotty&apos;s Circle</h1>
          <p className="mt-1 text-sm text-muted">Use your CMU identity to continue.</p>
        </div>
        <Button onClick={handleLogin} disabled={loading} className="w-full">
          {loading ? "Signing in…" : "Continue with CMU"}
        </Button>
        {error && <p className="text-sm text-primary">{error}</p>}
      </Card>
    </div>
  );
}
