import type { Match, Student } from "shared-types";

/** Normalizes a match score to a whole-number percentage regardless of
 * whether the backend sends a 0-1 fraction or an already-scaled 0-100
 * number. */
export function formatScorePct(score: number): string {
  const pct = score <= 1 ? score * 100 : score;
  return `${Math.max(0, Math.min(100, Math.round(pct)))}%`;
}

function initialsFor(student: Student | null, fallbackId: string): string {
  if (student?.initials) return student.initials;
  if (student?.name) {
    return student.name
      .split(/\s+/)
      .map((part) => part[0])
      .filter(Boolean)
      .slice(0, 2)
      .join("")
      .toUpperCase();
  }
  return fallbackId.slice(0, 2).toUpperCase();
}

export type InviteState = "idle" | "loading" | "sent" | "error";

interface PersonCardProps {
  match: Match;
  /** null while the profile is still loading, or if it failed to load —
   * the card still renders using match-only data in that case. */
  student: Student | null;
  variant?: "featured" | "row";
  onViewProfile: () => void;
  onInvite: () => void;
  inviteState?: InviteState;
  inviteMessage?: string | null;
}

export default function PersonCard({
  match,
  student,
  variant = "row",
  onViewProfile,
  onInvite,
  inviteState = "idle",
  inviteMessage,
}: PersonCardProps) {
  const displayName = student?.name ?? "Fellow Scot";
  const programYear = student ? `${student.program} · ${student.year}` : "Loading profile…";
  const initials = initialsFor(student, match.studentId);
  const reasonsLine = match.reasons.length > 0 ? match.reasons.slice(0, 2).join(" · ") : null;
  const inviteLabel =
    inviteState === "loading" ? "Inviting…" : inviteState === "sent" ? "Invited ✓" : "Invite";

  if (variant === "featured") {
    return (
      <div className="rounded-2xl border border-line bg-card p-4 shadow-sm">
        <div className="flex items-start gap-3">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-primary text-lg font-semibold text-white">
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="truncate text-base font-semibold text-ink">{displayName}</p>
                <p className="truncate text-sm text-muted">{programYear}</p>
              </div>
              <span className="shrink-0 rounded-full bg-primary/10 px-2.5 py-1 text-xs font-bold text-primary">
                {formatScorePct(match.score)}
              </span>
            </div>
          </div>
        </div>

        {match.sharedInterests.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            {match.sharedInterests.map((interest) => (
              <span
                key={interest}
                className="rounded-full border border-line bg-surface px-2.5 py-1 text-xs text-ink"
              >
                {interest}
              </span>
            ))}
          </div>
        )}

        {reasonsLine && <p className="mt-3 text-sm italic text-muted">"{reasonsLine}"</p>}

        {inviteMessage && (
          <p className={`mt-2 text-xs ${inviteState === "error" ? "text-primary" : "text-muted"}`}>
            {inviteMessage}
          </p>
        )}

        <div className="mt-4 flex gap-2">
          <button
            type="button"
            onClick={onViewProfile}
            className="flex-1 rounded-xl border border-line bg-surface py-2.5 text-sm font-medium text-ink transition active:scale-[0.98]"
          >
            View Profile
          </button>
          <button
            type="button"
            onClick={onInvite}
            disabled={inviteState === "loading" || inviteState === "sent"}
            className="flex-1 rounded-xl bg-primary py-2.5 text-sm font-semibold text-white transition active:scale-[0.98] disabled:opacity-60"
          >
            {inviteLabel}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-line bg-card p-3">
      <div className="flex items-center gap-3">
        <button type="button" onClick={onViewProfile} className="flex min-w-0 flex-1 items-center gap-3 text-left">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/90 text-sm font-semibold text-white">
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-ink">{displayName}</p>
            <p className="truncate text-xs text-muted">{programYear}</p>
          </div>
          <span className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-bold text-primary">
            {formatScorePct(match.score)}
          </span>
        </button>
        <button
          type="button"
          onClick={onInvite}
          disabled={inviteState === "loading" || inviteState === "sent"}
          className="shrink-0 rounded-full border border-primary px-3 py-1.5 text-xs font-semibold text-primary transition active:scale-[0.98] disabled:opacity-60"
        >
          {inviteLabel}
        </button>
      </div>
      {inviteMessage && (
        <p className={`mt-2 text-xs ${inviteState === "error" ? "text-primary" : "text-muted"}`}>
          {inviteMessage}
        </p>
      )}
    </div>
  );
}
