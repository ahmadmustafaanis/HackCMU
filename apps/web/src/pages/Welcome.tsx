import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Button from "../components/Button";
import { api } from "../api/client";
import { useSession } from "../state/session";

export default function Welcome() {
  const navigate = useNavigate();
  const { setSession } = useSession();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleContinue = async () => {
    setLoading(true);
    setError(null);
    try {
      const { student, sessionToken } = await api.demoLogin({});
      setSession(student, sessionToken);
      navigate("/onboarding");
    } catch {
      setError("Couldn't reach the server. Please try again.");
    } finally {
      setLoading(false);
    }
  };

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

      <div className="flex w-full flex-col gap-3">
        <Button onClick={handleContinue} disabled={loading} className="w-full">
          {loading ? "Connecting…" : "Continue with CMU"}
        </Button>
        {error && <p className="text-sm text-primary">{error}</p>}
        <p className="text-xs text-muted">Demo auth — no real CMU SSO involved.</p>
      </div>
    </div>
  );
}
