import { useEffect, useState } from "react";
import { useLocation, useNavigate, useParams } from "react-router-dom";
import type { Student } from "shared-types";
import { api } from "../api/client";
import { useSession } from "../state/session";

/** Optional context PersonCard's "View Profile" passes via router state so
 * the invite flow here can reuse the same matchId/eventId the Match
 * Results screen already had — see MatchResults.tsx. Profile pages reached
 * any other way (e.g. a bookmark) fall back to best-effort ids below. */
interface NavState {
  matchId?: string;
  eventId?: string;
  activityType?: string;
}

type LoadState = "loading" | "ready" | "error";
type InviteState = "idle" | "loading" | "sent" | "error";

export default function PersonProfile() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { student: viewer } = useSession();
  const navState = (location.state ?? {}) as NavState;

  const [profile, setProfile] = useState<Student | null>(null);
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [inviteState, setInviteState] = useState<InviteState>("idle");
  const [inviteMessage, setInviteMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    setLoadState("loading");
    api
      .getProfile(id)
      .then((res) => {
        if (!cancelled) {
          setProfile(res);
          setLoadState("ready");
        }
      })
      .catch(() => {
        if (!cancelled) setLoadState("error");
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  async function handleInvite() {
    if (!viewer || !id) return;
    const matchId = navState.matchId ?? id;
    const targetEventId = navState.eventId ?? matchId;

    setInviteState("loading");
    setInviteMessage(null);
    try {
      const res = await api.invite(targetEventId, { userId: viewer.id, matchId });
      if (res.status === "accepted") {
        setInviteState("sent");
        navigate(`/chat/${matchId}`);
        return;
      }
      setInviteState("error");
      setInviteMessage(res.status === "full" ? "That activity just filled up." : "That invite has expired.");
    } catch {
      setInviteState("error");
      setInviteMessage("Couldn't send the invite — try again.");
    }
  }

  const activityLabel = navState.activityType ? ` for ${navState.activityType}` : "";

  return (
    <div className="flex flex-1 flex-col overflow-y-auto p-5">
      <button type="button" onClick={() => navigate(-1)} className="mb-3 self-start text-sm text-muted">
        ← Back
      </button>

      {loadState === "loading" && <p className="mt-8 text-center text-sm text-muted">Loading profile…</p>}

      {loadState === "error" && (
        <div className="mt-8 rounded-2xl border border-line bg-card p-5 text-center">
          <p className="text-sm text-ink">Couldn't load this profile right now.</p>
        </div>
      )}

      {loadState === "ready" && profile && (
        <div className="flex flex-1 flex-col">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-primary text-xl font-semibold text-white">
              {profile.initials}
            </div>
            <div className="min-w-0">
              <h1 className="truncate text-lg font-semibold text-ink">{profile.name}</h1>
              <p className="truncate text-sm text-muted">
                {profile.program} · {profile.year}
              </p>
            </div>
          </div>

          {profile.bio && <p className="mt-4 text-sm leading-relaxed text-ink">{profile.bio}</p>}

          {profile.interests.length > 0 && (
            <section className="mt-5">
              <h2 className="text-xs font-semibold uppercase tracking-wide text-muted">Interests</h2>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {profile.interests.map((interest) => (
                  <span
                    key={interest}
                    className="rounded-full border border-line bg-surface px-2.5 py-1 text-xs text-ink"
                  >
                    {interest}
                  </span>
                ))}
              </div>
            </section>
          )}

          {profile.vibes.length > 0 && (
            <section className="mt-4">
              <h2 className="text-xs font-semibold uppercase tracking-wide text-muted">Vibe</h2>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {profile.vibes.map((vibe) => (
                  <span key={vibe} className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-medium text-primary">
                    {vibe}
                  </span>
                ))}
              </div>
            </section>
          )}

          {profile.availabilityLabel && (
            <section className="mt-4">
              <h2 className="text-xs font-semibold uppercase tracking-wide text-muted">Availability</h2>
              <p className="mt-1 text-sm text-ink">{profile.availabilityLabel}</p>
            </section>
          )}

          {inviteMessage && (
            <p className={`mt-4 text-sm ${inviteState === "error" ? "text-primary" : "text-muted"}`}>
              {inviteMessage}
            </p>
          )}

          <div className="mt-auto flex flex-col gap-2 pt-6">
            <button
              type="button"
              onClick={handleInvite}
              disabled={inviteState === "loading" || inviteState === "sent"}
              className="rounded-xl bg-primary py-3 text-sm font-semibold text-white transition active:scale-[0.98] disabled:opacity-60"
            >
              {inviteState === "loading"
                ? "Inviting…"
                : inviteState === "sent"
                  ? "Invited ✓"
                  : `Invite${activityLabel}`}
            </button>
            <button
              type="button"
              onClick={() => navigate("/matches")}
              className="rounded-xl border border-line bg-surface py-3 text-sm font-medium text-ink transition active:scale-[0.98]"
            >
              Back to matches
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
