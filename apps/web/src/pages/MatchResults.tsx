import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { Activity, MatchResponse } from "shared-types";
import { api } from "../api/client";
import TabBar from "../components/TabBar";
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
  const [lastIntent, setLastIntent] = useState<Record<string, unknown> | null>(null);

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
      try {
        const pending = sessionStorage.getItem("scottys-circle:lastMatchIntent");
        if (pending) setLastIntent(JSON.parse(pending) as Record<string, unknown>);
      } catch {
        setLastIntent(null);
      }
      if (loaded.eventId) {
        api.getActivity(loaded.eventId).then((response) => {
          if (!cancelled) setActivity(response.activity);
        }).catch(() => {
          if (!cancelled) setErrorMessage("The matched event could not be loaded.");
        });
      }
    }
    load();
    return () => {
      cancelled = true;
    };
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
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="feed-scroll min-h-0 flex-1 p-5">
        <button type="button" onClick={() => navigate("/home")} className="mb-3 self-start text-sm text-muted">
          ← Back
        </button>
        <h1 className="font-display text-xl font-medium text-ink">Your matched activity</h1>
        <p className="mt-1 text-sm text-muted">Review the event before joining.</p>
        {loadState === "loading" && <p className="mt-8 text-center text-sm text-muted">Loading your matched activity…</p>}
        {loadState === "error" && <p className="mt-8 text-center text-sm text-primary">{errorMessage}</p>}
        {loadState === "ready" && activity && (
          <article className="mt-5 rounded-[14px] border border-line bg-card p-5">
            <span className="inline-flex self-start rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
              {result?.eventType === "CREATED" ? "Created event" : "Matched event"}
            </span>
            <h2 className="mt-3 font-display text-lg font-medium text-ink">{activity.title}</h2>
            <p className="mt-1 text-sm text-muted">{activity.description}</p>
            <div className="mt-4 flex flex-wrap gap-3 text-sm text-muted">
              <span>📍 {activity.approximateLocation}</span>
              <span>🕒 {activity.timeLabel}</span>
              <span>{activity.attendeeCount} going</span>
            </div>
            {joinMessage && <p className="mt-4 text-sm text-primary">{joinMessage}</p>}
            {result?.eventType === "CREATED" ? (
              <button
                type="button"
                onClick={() => navigate("/activities")}
                className="mt-5 w-full rounded-2xl bg-primary py-3 text-sm font-semibold text-white"
              >
                View My Activities
              </button>
            ) : (
              <button
                type="button"
                onClick={handleJoin}
                disabled={joinState === "joining" || joinState === "joined"}
                className="mt-5 w-full rounded-2xl bg-primary py-3 text-sm font-semibold text-white disabled:opacity-50"
              >
                {joinState === "joining" ? "Joining…" : joinState === "joined" ? "Joined" : "Join activity"}
              </button>
            )}
            {result?.eventType !== "CREATED" && lastIntent && (
              <button
                type="button"
                onClick={() => navigate("/matching", { state: { ...lastIntent, forceCreate: true } })}
                className="mt-3 w-full rounded-2xl border border-line py-3 text-sm font-semibold text-ink"
              >
                Create my own activity
              </button>
            )}
          </article>
        )}
        {loadState === "ready" && !activity && (
          <p className="mt-8 text-center text-sm text-muted">No event details are available yet.</p>
        )}
      </div>
      <TabBar />
    </div>
  );
}
