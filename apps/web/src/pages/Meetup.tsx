import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import type { Activity, Student } from "shared-types";
import { api } from "../api/client";
import { useSession } from "../state/session";

type MeetupStatus = "pending" | "on_the_way" | "arrived";

function matchIdStorageKey(eventId: string) {
  return `scottys-circle:matchId:${eventId}`;
}

export default function Meetup() {
  const { eventId } = useParams<{ eventId: string }>();
  const navigate = useNavigate();
  const { student } = useSession();

  const [activity, setActivity] = useState<Activity | null>(null);
  const [match, setMatch] = useState<Student | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [status, setStatus] = useState<MeetupStatus>("pending");

  useEffect(() => {
    if (!eventId) return;
    const id = eventId;
    let cancelled = false;

    async function load() {
      setLoading(true);
      setLoadError(null);
      try {
        const { activities } = await api.getActivities();
        if (cancelled) return;
        const found = activities.find((a) => a.id === id) ?? null;
        setActivity(found);

        const otherId =
          found?.attendees.find((attendeeId) => attendeeId !== student?.id) ??
          (found && found.hostId !== student?.id ? found.hostId : undefined);

        if (otherId) {
          sessionStorage.setItem(matchIdStorageKey(id), otherId);
          try {
            const profile = await api.getProfile(otherId);
            if (!cancelled) setMatch(profile);
          } catch {
            // Backend may not be wired yet — fall back to generic copy below.
          }
        }
      } catch {
        if (!cancelled) setLoadError("Couldn't load this meetup's details right now.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [eventId, student?.id]);

  const goToFeedback = () => {
    if (!eventId) return;
    navigate(`/feedback/${eventId}`);
  };

  const cancelMeetup = () => {
    navigate("/home");
  };

  const displayName = match?.name ?? "your match";

  return (
    <div className="flex flex-1 flex-col gap-5 overflow-y-auto p-5">
      <div className="pt-2 text-center">
        <p className="text-sm font-medium text-muted">Meetup in progress</p>
      </div>

      <div className="flex flex-col items-center gap-3 rounded-3xl border border-line bg-card p-6 text-center shadow-sm">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-2xl font-semibold text-primary">
          {match?.initials ?? "🤝"}
        </div>

        {loading ? (
          <p className="text-sm text-muted">Loading your meetup…</p>
        ) : (
          <h1 className="text-xl font-semibold text-ink">You're meeting {displayName}!</h1>
        )}

        {activity && (
          <p className="text-sm font-medium text-primary">{activity.title}</p>
        )}

        <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-sm text-muted">
          <span>📍 {activity?.approximateLocation ?? "Location TBD"}</span>
          <span>🕒 {activity?.timeLabel ?? "Time TBD"}</span>
        </div>

        {loadError && <p className="text-xs text-primary">{loadError}</p>}
      </div>

      <div className="rounded-3xl border border-line bg-card p-5 shadow-sm">
        <p className="mb-3 text-center text-sm font-medium text-muted">
          {status === "pending" && "Let them know where you're at"}
          {status === "on_the_way" && "🚶 You're on your way"}
          {status === "arrived" && "📍 You've arrived"}
        </p>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => setStatus("on_the_way")}
            className={`flex-1 rounded-2xl border py-3 text-sm font-semibold transition ${
              status === "on_the_way"
                ? "border-primary bg-primary text-white"
                : "border-line bg-surface text-ink hover:border-primary-light"
            }`}
          >
            I'm On My Way
          </button>
          <button
            type="button"
            onClick={() => setStatus("arrived")}
            className={`flex-1 rounded-2xl border py-3 text-sm font-semibold transition ${
              status === "arrived"
                ? "border-primary bg-primary text-white"
                : "border-line bg-surface text-ink hover:border-primary-light"
            }`}
          >
            I'm Here
          </button>
        </div>
      </div>

      <div className="mt-auto flex flex-col gap-3 pb-2">
        <button
          type="button"
          onClick={goToFeedback}
          className="w-full rounded-2xl bg-primary py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-dark"
        >
          Wrap Up &amp; Leave Feedback
        </button>
        <button type="button" onClick={cancelMeetup} className="text-center text-sm font-medium text-muted underline-offset-2 hover:text-primary hover:underline">
          Cancel meetup
        </button>
      </div>
    </div>
  );
}
