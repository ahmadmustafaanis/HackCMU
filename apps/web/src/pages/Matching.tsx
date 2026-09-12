import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import type { MatchResponse, StructuredIntentInput } from "shared-types";
import { api } from "../api/client";

/** Kept in sync with the same constant in ActivitySetup.tsx. */
const PENDING_MATCH_KEY = "scottys-circle:pendingMatch";
/** MatchResults.tsx reads the finished result back from this exact key
 * (LAST_MATCH_KEY there) — must match, since it doesn't consult router
 * navigation state at all, only this and (as a fallback) GET /api/matches. */
const RESULT_KEY = "scottys-circle:lastMatch";

const STEPS = [
  "Checking availability",
  "Finding people nearby",
  "Comparing interests",
  "Matching your vibe",
  "Finding best fit",
];

const STEP_INTERVAL_MS = 550;

interface PendingMatch {
  mode?: "match" | "create";
  userId: string;
  intent: StructuredIntentInput;
}

function isPendingMatch(value: unknown): value is PendingMatch {
  return (
    !!value &&
    typeof value === "object" &&
    typeof (value as PendingMatch).userId === "string" &&
    typeof (value as PendingMatch).intent === "object"
  );
}

function readPendingMatch(navigationState: unknown): PendingMatch | null {
  if (isPendingMatch(navigationState)) return navigationState;
  try {
    const raw = sessionStorage.getItem(PENDING_MATCH_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    return isPendingMatch(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

export default function Matching() {
  const navigate = useNavigate();
  const location = useLocation();

  const [creating] = useState(() => readPendingMatch(location.state)?.mode === "create");
  const steps = creating ? ["Preparing your activity", "Opening it for others to join"] : STEPS;

  const [visibleCount, setVisibleCount] = useState(1);
  const [apiDone, setApiDone] = useState(false);
  const [result, setResult] = useState<MatchResponse | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Staged checklist reveal — purely client-side, independent of the real
  // network call so the animation always plays out at a consistent pace.
  useEffect(() => {
    const timers = steps.slice(1).map((_step, idx) =>
      window.setTimeout(() => setVisibleCount(idx + 2), (idx + 1) * STEP_INTERVAL_MS)
    );
    return () => timers.forEach((timer) => window.clearTimeout(timer));
  }, []);

  // The real request. Runs once on mount regardless of the checklist timing
  // above — the last checklist item just waits on `apiDone` before it can
  // show a checkmark instead of a spinner.
  useEffect(() => {
    let cancelled = false;
    const pending = readPendingMatch(location.state);
    if (!pending) {
      // Leave the staged checklist timer (above) alone — it owns
      // `visibleCount` on its own schedule. Forcing it here would fight
      // that timer and make already-shown checkmarks flicker away.
      setError("No activity request found. Head back and pick something to do.");
      setApiDone(true);
      return;
    }

    api
      .match({ userId: pending.userId, intent: pending.intent, mode: pending.mode })
      .then((res) => {
        if (cancelled) return;
        try {
          sessionStorage.setItem(RESULT_KEY, JSON.stringify(res));
          sessionStorage.removeItem(PENDING_MATCH_KEY);
        } catch {
          // Best-effort persistence only — navigation state below still
          // carries the result.
        }
        setResult(res);
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        setError(err instanceof Error ? err.message : "Something went wrong finding a match.");
      })
      .finally(() => {
        if (!cancelled) setApiDone(true);
      });

    return () => {
      cancelled = true;
    };
    // Intentionally runs once — `location.state` is only read on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!apiDone || !result || visibleCount < steps.length) return;
    const timer = window.setTimeout(() => {
      navigate("/matches", { state: { result } });
    }, 450);
    return () => window.clearTimeout(timer);
  }, [apiDone, result, visibleCount, navigate, steps.length]);

  const success = apiDone && !error;

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-8 px-8 py-12 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-primary text-3xl shadow-lg shadow-primary/20">
        🐾
      </div>
      <div>
        <h1 className="text-xl font-semibold text-ink">{creating ? "Starting your activity…" : "Finding your match…"}</h1>
        <p className="mt-1 text-sm text-muted">{creating ? "Your plan will be open for others to join." : "Hang tight while we look around campus."}</p>
      </div>

      <ul className="flex w-full flex-col gap-3 text-left">
        {steps.map((step, index) => {
          const isVisible = index < visibleCount;
          const isLastStep = index === steps.length - 1;
          const isChecked = isVisible && (!isLastStep || success);
          const isSpinning = isVisible && isLastStep && !apiDone;

          return (
            <li
              key={step}
              className={`flex items-center gap-3 rounded-xl border border-line bg-card px-4 py-3 transition-opacity duration-300 ${
                isVisible ? "opacity-100" : "opacity-30"
              }`}
            >
              <span
                className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs ${
                  isChecked ? "bg-primary text-white" : "border border-line"
                }`}
              >
                {isChecked ? "✓" : isSpinning ? (
                  <span className="block h-3 w-3 animate-spin rounded-full border-2 border-line border-t-primary" />
                ) : null}
              </span>
              <span className={`text-sm ${isVisible ? "text-ink" : "text-muted"}`}>{step}</span>
            </li>
          );
        })}
      </ul>

      {error && (
        <div className="flex w-full flex-col items-center gap-3">
          <p className="text-sm text-primary">{error}</p>
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="rounded-full border border-line px-5 py-2 text-sm font-medium text-ink"
          >
            Go back
          </button>
        </div>
      )}
    </div>
  );
}
