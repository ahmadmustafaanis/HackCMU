import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { Activity, MatchResponse } from "shared-types";
import { api } from "../api/client";
import { useSession } from "../state/session";

const LAST_MATCH_KEY = "scottys-circle:lastMatch";
type LoadState = "loading" | "ready" | "error";

export default function MatchResults() {
  const navigate = useNavigate();
  const { student } = useSession();
  const [result, setResult] = useState<MatchResponse | null>(null);
  const [activity, setActivity] = useState<Activity | null>(null);
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [joinState, setJoinState] = useState<"idle" | "joining" | "joined" | "error">("idle");
  const [joinMessage, setJoinMessage] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoadState("loading");
      setErrorMessage(null);
      let loaded: MatchResponse | null = null;
      const raw = sessionStorage.getItem(LAST_MATCH_KEY);
      if (raw) {
        try {
          const parsed = JSON.parse(raw) as MatchResponse;
          if (parsed && Array.isArray(parsed.matches)) loaded = parsed;
        } catch {
          // Fall through to persisted matches.
        }
      }
      if (!loaded && student) {
        try {
          const matches = await api.getMatches(student.id);
          loaded = { outcome: "PENDING", eventId: "", matches: matches.matches };
        } catch {
          if (!cancelled) {
            setErrorMessage("Couldn't load your matched activity right now.");
            setLoadState("error");
          }
          return;
        }
      }
      if (!loaded) {
        if (!cancelled) {
          setErrorMessage("Log in to see your matched activity.");
          setLoadState("error");
        }
        return;
      }
      if (cancelled) return;
      setResult(loaded);
      setLoadState("ready");
      if (loaded.eventId) {
        api.getActivity(loaded.eventId).then((response) => {
          if (!cancelled) setActivity(response.activity);
        }).catch(() => {
          if (!cancelled) setErrorMessage("The matched event could not be loaded.");
        });
      }
    }
    load();
    return () => { cancelled = true; };
  }, [student]);

  async function handleJoin() {
    if (!result?.eventId) return;
    setJoinState("joining");
    setJoinMessage(null);
    try {
      const response = await api.joinEvent(result.eventId);
      if (response.status === "accepted") {
        setJoinState("joined");
        setJoinMessage("You have successfully joined this activity.");
        if (response.activity) setActivity(response.activity);
      } else {
        setJoinState("error");
        setJoinMessage(response.status === "full" ? "This activity is full." : "This activity is no longer available.");
      }
    } catch {
      setJoinState("error");
      setJoinMessage("Could not join this activity right now.");
    }
  }

  return (
    <div className="flex flex-1 flex-col overflow-y-auto p-5">
      <button type="button" onClick={() => navigate("/home")} className="mb-3 self-start text-sm text-muted">← Back</button>
      <h1 className="text-xl font-semibold text-ink">Your matched activity</h1>
      <p className="mt-1 text-sm text-muted">Review the event before joining.</p>
      {loadState === "loading" && <p className="mt-8 text-center text-sm text-muted">Loading your matched activity…</p>}
      {loadState === "error" && <p className="mt-8 text-center text-sm text-primary">{errorMessage}</p>}
      {loadState === "ready" && activity && (
        <article className="mt-5 rounded-2xl border border-line bg-card p-5 shadow-sm">
          <h2 className="text-lg font-semibold text-ink">{activity.title}</h2>
          <p className="mt-1 text-sm text-muted">{activity.description}</p>
          <div className="mt-4 flex flex-wrap gap-3 text-sm text-muted">
            <span>📍 {activity.approximateLocation}</span>
            <span>🕒 {activity.timeLabel}</span>
            <span>{activity.attendeeCount} going</span>
          </div>
          {joinMessage && <p className="mt-4 text-sm text-primary">{joinMessage}</p>}
          <button type="button" onClick={handleJoin} disabled={joinState === "joining" || joinState === "joined"} className="mt-5 w-full rounded-2xl bg-primary py-3 text-sm font-semibold text-white disabled:opacity-50">
            {joinState === "joining" ? "Joining…" : joinState === "joined" ? "Joined" : "Join activity"}
          </button>
        </article>
      )}
      {loadState === "ready" && !activity && <p className="mt-8 text-center text-sm text-muted">No event details are available yet.</p>}
    </div>
  );
}
