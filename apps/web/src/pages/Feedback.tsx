import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import type { EventRatingsResponse, StarScore } from "shared-types";
import { api } from "../api/client";
import StarRating, { RatingBadge } from "../components/StarRating";

export default function Feedback() {
  const { eventId } = useParams<{ eventId: string }>();
  const navigate = useNavigate();

  const [details, setDetails] = useState<EventRatingsResponse | null>(null);
  const [scores, setScores] = useState<Record<string, StarScore>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!eventId) return;
    let cancelled = false;
    setLoading(true);
    api
      .getEventRatings(eventId)
      .then((response) => {
        if (cancelled) return;
        setDetails(response);
        const initial: Record<string, StarScore> = {};
        for (const person of response.people) {
          if (person.existingScore) initial[person.student.id] = person.existingScore;
        }
        setScores(initial);
      })
      .catch(() => {
        if (!cancelled) setError("Couldn't load who you can rate for this activity.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [eventId]);

  if (!eventId) {
    return (
      <div className="flex flex-1 items-center justify-center p-6 text-center text-sm text-muted">
        Missing meetup reference. Go back and try again.
      </div>
    );
  }

  const goBack = () => navigate("/activities");

  const handleSubmit = async () => {
    const ratings = Object.entries(scores).map(([userId, score]) => ({ userId, score }));
    if (ratings.length === 0) return;
    setSubmitting(true);
    setError(null);
    try {
      await api.submitPeerRatings(eventId, { ratings });
      navigate("/activities", { state: { successMessage: "Thanks — your ratings were saved." } });
    } catch {
      setError("Couldn't submit ratings right now. You can try again or skip.");
    } finally {
      setSubmitting(false);
    }
  };

  const allRated = Boolean(details && details.people.length > 0 && details.people.every((person) => scores[person.student.id]));

  return (
    <div className="flex flex-1 flex-col gap-6 overflow-y-auto p-5">
      <div className="pt-2">
        <button type="button" onClick={goBack} className="text-sm font-medium text-muted">← Back</button>
        <h1 className="mt-3 font-display text-xl font-medium text-ink">Rate your group</h1>
        <p className="mt-1 text-sm text-muted">
          After the activity ends, everyone rates everyone else — same idea as Uber.
        </p>
      </div>

      {loading && <p className="text-center text-sm text-muted">Loading people to rate…</p>}

      {details && !details.ended && (
        <div className="rounded-2xl border border-line bg-card p-4 text-sm text-muted">
          Rating opens after this activity ends.
        </div>
      )}

      {details && details.ended && details.people.length === 0 && (
        <div className="rounded-2xl border border-line bg-card p-5 text-center">
          <p className="font-medium text-ink">No one else joined</p>
          <p className="mt-1 text-sm text-muted">There&apos;s nobody to rate for this activity.</p>
        </div>
      )}

      {details && details.ended && details.people.length > 0 && (
        <ul className="flex flex-col gap-3">
          {details.people.map((person) => (
            <li key={person.student.id} className="rounded-2xl border border-line bg-card p-4">
              <div className="mb-3 flex items-center gap-3">
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                  {person.student.initials}
                </div>
                <div className="min-w-0">
                  <p className="truncate font-medium text-ink">{person.student.name}</p>
                  <RatingBadge average={person.student.ratingAverage} count={person.student.ratingCount} />
                </div>
              </div>
              <StarRating
                value={scores[person.student.id] ?? 0}
                onChange={(score) => setScores((current) => ({ ...current, [person.student.id]: score }))}
              />
              <p className="mt-2 text-xs text-muted">1 = no-show or rough · 5 = great to hang with</p>
            </li>
          ))}
        </ul>
      )}

      {error && (
        <div className="rounded-2xl border border-primary/30 bg-primary/5 p-3 text-center text-sm text-primary">
          {error}
        </div>
      )}

      <div className="mt-auto flex flex-col gap-3 pb-2">
        <button
          type="button"
          disabled={!allRated || submitting || !details?.ended}
          onClick={handleSubmit}
          className="w-full rounded-2xl bg-primary py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-50"
        >
          {submitting ? "Saving…" : "Submit ratings"}
        </button>
        <button
          type="button"
          onClick={goBack}
          className="text-center text-sm font-medium text-muted underline-offset-2 hover:text-primary hover:underline"
        >
          Skip for now
        </button>
      </div>
    </div>
  );
}
