import { useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { api } from "../api/client";
import { useSession } from "../state/session";
import FeedbackEmojiPicker, { type FeedbackRating } from "../components/FeedbackEmojiPicker";

function matchIdStorageKey(eventId: string) {
  return `scottys-circle:matchId:${eventId}`;
}

export default function Feedback() {
  const { eventId } = useParams<{ eventId: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { student } = useSession();

  const [rating, setRating] = useState<FeedbackRating | null>(null);
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!eventId) {
    return (
      <div className="flex flex-1 items-center justify-center p-6 text-center text-sm text-muted">
        Missing meetup reference — go back and try again.
      </div>
    );
  }

  const matchId = searchParams.get("matchId") ?? sessionStorage.getItem(matchIdStorageKey(eventId)) ?? eventId;

  const goToSuccess = () => navigate(`/success/${matchId}`);

  const handleSubmit = async () => {
    if (!rating) return;
    setSubmitting(true);
    setError(null);
    try {
      await api.submitFeedback({
        eventId,
        matchId,
        userId: student?.id ?? "anonymous",
        rating,
      });
      goToSuccess();
    } catch {
      setError("Couldn't submit feedback right now — you can try again or skip.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex flex-1 flex-col gap-6 overflow-y-auto p-5">
      <div className="pt-2 text-center">
        <h1 className="text-xl font-semibold text-ink">How was it?</h1>
        <p className="mt-1 text-sm text-muted">Your rating helps us find you better matches.</p>
      </div>

      <FeedbackEmojiPicker value={rating} onChange={setRating} />

      <div className="flex flex-col gap-2">
        <label htmlFor="feedback-note" className="text-sm font-medium text-ink">
          Anything you'd add? <span className="font-normal text-muted">(optional, just for you)</span>
        </label>
        <textarea
          id="feedback-note"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="e.g. Great conversation about robotics club!"
          rows={4}
          className="w-full resize-none rounded-2xl border border-line bg-card p-3 text-sm text-ink placeholder:text-muted focus:border-primary focus:outline-none"
        />
      </div>

      {error && (
        <div className="rounded-2xl border border-primary/30 bg-primary/5 p-3 text-center text-sm text-primary">
          {error}
        </div>
      )}

      <div className="mt-auto flex flex-col gap-3 pb-2">
        <button
          type="button"
          disabled={!rating || submitting}
          onClick={handleSubmit}
          className="w-full rounded-2xl bg-primary py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-dark disabled:cursor-not-allowed disabled:opacity-50"
        >
          {submitting ? "Submitting…" : "Submit Feedback"}
        </button>
        <button
          type="button"
          onClick={goToSuccess}
          className="text-center text-sm font-medium text-muted underline-offset-2 hover:text-primary hover:underline"
        >
          Skip for now
        </button>
      </div>
    </div>
  );
}
