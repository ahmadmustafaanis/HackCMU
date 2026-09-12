import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import type { Activity, Student } from "shared-types";
import { api } from "../api/client";
import { RatingBadge } from "../components/StarRating";
import { useSession } from "../state/session";

export default function Meetup() {
  const { eventId } = useParams<{ eventId: string }>();
  const navigate = useNavigate();
  const { student } = useSession();

  const [activity, setActivity] = useState<Activity | null>(null);
  const [people, setPeople] = useState<Student[]>([]);
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
        const { activity: found } = await api.getActivity(id);
        if (cancelled) return;
        setActivity(found);

        const otherIds = found.attendees.filter((attendeeId) => attendeeId !== student?.id);
        const profiles = await Promise.allSettled(otherIds.map((otherId) => api.getProfile(otherId)));
        if (!cancelled) {
          setPeople(
            profiles.flatMap((entry) => (entry.status === "fulfilled" ? [entry.value] : [])),
          );
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
  const started = Boolean(activity && new Date(activity.startTime).getTime() <= Date.now());
  const ended = Boolean(activity && new Date(activity.endTime).getTime() <= Date.now());

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
          {people[0]?.initials ?? activity?.title.slice(0, 1) ?? "?"}
        </div>

        {loading ? (
          <p className="text-sm text-muted">Loading your meetup…</p>
        ) : (
          <h1 className="font-display text-xl font-medium text-ink">{activity?.title ?? "Activity details"}</h1>
        )}

        <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-sm text-muted">
          <span>{activity?.approximateLocation ?? "Location TBD"}</span>
          <span>{activity?.timeLabel ?? "Time TBD"}</span>
        </div>

        {ended && <p className="text-xs font-medium text-primary">This activity has ended</p>}
        {!ended && started && <p className="text-xs font-medium text-muted">This activity has started</p>}

        {loadError && <p className="text-xs text-primary">{loadError}</p>}
        {joinMessage && <p className="text-xs text-primary">{joinMessage}</p>}
      </div>

      {people.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-muted">Who&apos;s going</h2>
          {people.map((person) => (
            <button
              key={person.id}
              type="button"
              onClick={() => navigate(`/people/${person.id}`)}
              className="pressable flex items-center gap-3 rounded-2xl border border-line bg-card px-4 py-3 text-left"
            >
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                {person.initials}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-ink">{person.name}</p>
                <RatingBadge average={person.ratingAverage} count={person.ratingCount} />
              </div>
            </button>
          ))}
        </section>
      )}

      <div className="mt-auto flex flex-col gap-3 pb-2">
        {isParticipant && ended && activity?.canRate && !activity.hasRated && (
          <button
            type="button"
            onClick={() => navigate(`/feedback/${eventId}`)}
            className="w-full rounded-2xl bg-primary py-3 text-sm font-semibold text-white shadow-sm"
          >
            Rate the people you met
          </button>
        )}
        {isParticipant && ended && activity?.hasRated && (
          <button
            type="button"
            onClick={() => navigate(`/feedback/${eventId}`)}
            className="w-full rounded-2xl border border-line py-3 text-sm font-semibold text-ink"
          >
            Update your ratings
          </button>
        )}
        {isParticipant && !ended && (
          <button
            type="button"
            onClick={() => navigate(`/chat/${eventId}`)}
            className="w-full rounded-2xl bg-primary py-3 text-sm font-semibold text-white shadow-sm"
          >
            Group chat
          </button>
        )}
        {!isParticipant && !started && (
          <button
            type="button"
            onClick={joinActivity}
            disabled={joining || loading || !activity}
            className="w-full rounded-2xl bg-primary py-3 text-sm font-semibold text-white shadow-sm disabled:opacity-50"
          >
            {joining ? "Joining…" : "Join activity"}
          </button>
        )}
        {!isParticipant && started && (
          <p className="text-center text-sm text-muted">This activity has already started, so it&apos;s no longer open to join.</p>
        )}
        <button type="button" onClick={() => navigate(-1)} className="text-center text-sm font-medium text-muted underline-offset-2 hover:text-primary hover:underline">Back</button>
      </div>
    </div>
  );
}
