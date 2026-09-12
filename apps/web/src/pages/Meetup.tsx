import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import type { Activity, Student } from "shared-types";
import { api } from "../api/client";
import { useSession } from "../state/session";

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
  const [joining, setJoining] = useState(false);
  const [joinMessage, setJoinMessage] = useState<string | null>(null);

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

  const isParticipant = Boolean(student && activity?.attendees.includes(student.id));

  const joinActivity = async () => {
    if (!eventId) return;
    setJoining(true);
    setJoinMessage(null);
    try {
      const response = await api.joinEvent(eventId);
      if (response.status === "accepted") navigate("/activities");
      else setJoinMessage(response.status === "full" ? "This activity is full." : "This activity is no longer available.");
    } catch {
      setJoinMessage("Could not join this activity right now.");
    } finally {
      setJoining(false);
    }
  };

  return (
    <div className="flex flex-1 flex-col gap-5 overflow-y-auto p-5">
      <div className="pt-2">
        <button type="button" onClick={() => navigate(-1)} className="text-sm font-medium text-muted">← Back</button>
      </div>

      <div className="flex flex-col items-center gap-3 rounded-3xl border border-line bg-card p-6 text-center shadow-sm">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 text-2xl font-semibold text-primary">
          {match?.initials ?? "🤝"}
        </div>

        {loading ? (
          <p className="text-sm text-muted">Loading your meetup…</p>
        ) : (
          <h1 className="text-xl font-semibold text-ink">{activity?.title ?? "Activity details"}</h1>
        )}

        {activity && (
          <p className="text-sm font-medium text-primary">{activity.title}</p>
        )}

        <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-sm text-muted">
          <span>📍 {activity?.approximateLocation ?? "Location TBD"}</span>
          <span>🕒 {activity?.timeLabel ?? "Time TBD"}</span>
        </div>

        {loadError && <p className="text-xs text-primary">{loadError}</p>}
        {joinMessage && <p className="text-xs text-primary">{joinMessage}</p>}
      </div>
      <div className="mt-auto flex flex-col gap-3 pb-2">
        {isParticipant ? (
          <button
            type="button"
            onClick={() => navigate(`/chat/${eventId}`)}
            className="w-full rounded-2xl bg-primary py-3 text-sm font-semibold text-white shadow-sm"
          >
            💬 Group chat
          </button>
        ) : (
          <button
            type="button"
            onClick={joinActivity}
            disabled={joining || loading || !activity}
            className="w-full rounded-2xl bg-primary py-3 text-sm font-semibold text-white shadow-sm disabled:opacity-50"
          >
            {joining ? "Joining…" : "Join activity"}
          </button>
        )}
        <button type="button" onClick={() => navigate(-1)} className="text-center text-sm font-medium text-muted underline-offset-2 hover:text-primary hover:underline">Back</button>
      </div>
    </div>
  );
}
