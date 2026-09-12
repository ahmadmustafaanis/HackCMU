import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { Match, MatchResponse, Student } from "shared-types";
import { api } from "../api/client";
import PersonCard, { type InviteState } from "../components/PersonCard";
import { useSession } from "../state/session";

/** Coordination point with Agent F's Matching.tsx: after a successful
 * POST /api/match, it stashes the raw MatchResponse here so this screen can
 * render it without an extra round trip. If the key is missing/stale we
 * fall back to GET /api/matches/:userId below. */
const LAST_MATCH_KEY = "scottys-circle:lastMatch";

type LoadState = "loading" | "ready" | "error";

export default function MatchResults() {
  const navigate = useNavigate();
  const { student } = useSession();

  const [matches, setMatches] = useState<Match[] | null>(null);
  const [eventId, setEventId] = useState<string | null>(null);
  const [loadState, setLoadState] = useState<LoadState>("loading");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const [profiles, setProfiles] = useState<Record<string, Student | null>>({});
  const [inviteStates, setInviteStates] = useState<Record<string, InviteState>>({});
  const [inviteMessages, setInviteMessages] = useState<Record<string, string>>({});

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoadState("loading");
      setErrorMessage(null);

      const raw = sessionStorage.getItem(LAST_MATCH_KEY);
      if (raw) {
        try {
          const parsed = JSON.parse(raw) as MatchResponse;
          if (parsed && Array.isArray(parsed.matches)) {
            if (!cancelled) {
              setMatches(parsed.matches);
              setEventId(parsed.eventId ?? null);
              setLoadState("ready");
            }
            return;
          }
        } catch {
          // malformed/stale session value — fall through to the API fallback
        }
      }

      if (!student) {
        if (!cancelled) {
          setErrorMessage("Log in to see your matches.");
          setLoadState("error");
        }
        return;
      }

      try {
        const res = await api.getMatches(student.id);
        if (!cancelled) {
          setMatches(res.matches);
          setEventId(null);
          setLoadState("ready");
        }
      } catch {
        if (!cancelled) {
          setErrorMessage("Couldn't load your matches right now.");
          setLoadState("error");
        }
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [student]);

  useEffect(() => {
    if (!matches || matches.length === 0) return;
    let cancelled = false;
    const ids = Array.from(new Set(matches.map((m) => m.studentId)));

    ids.forEach((id) => {
      api
        .getProfile(id)
        .then((profile) => {
          if (!cancelled) setProfiles((prev) => ({ ...prev, [id]: profile }));
        })
        .catch(() => {
          if (!cancelled) setProfiles((prev) => ({ ...prev, [id]: null }));
        });
    });

    return () => {
      cancelled = true;
    };
  }, [matches]);

  function handleViewProfile(match: Match) {
    navigate(`/people/${match.studentId}`, {
      state: { matchId: match.id, eventId, activityType: match.activityType },
    });
  }

  async function handleInvite(match: Match) {
    if (!student) return;
    setInviteStates((prev) => ({ ...prev, [match.id]: "loading" }));
    setInviteMessages((prev) => {
      const next = { ...prev };
      delete next[match.id];
      return next;
    });

    try {
      // Best-effort: when we only had GET /api/matches to go on (no
      // MatchResponse in sessionStorage) there's no eventId to attach the
      // invite to, so fall back to the match id itself.
      const targetEventId = eventId ?? match.id;
      const res = await api.invite(targetEventId, { userId: student.id, matchId: match.id });

      if (res.status === "accepted") {
        setInviteStates((prev) => ({ ...prev, [match.id]: "sent" }));
        navigate(`/chat/${match.id}`);
        return;
      }

      setInviteStates((prev) => ({ ...prev, [match.id]: "error" }));
      setInviteMessages((prev) => ({
        ...prev,
        [match.id]: res.status === "full" ? "That activity just filled up." : "That invite has expired.",
      }));
    } catch {
      setInviteStates((prev) => ({ ...prev, [match.id]: "error" }));
      setInviteMessages((prev) => ({ ...prev, [match.id]: "Couldn't send the invite — try again." }));
    }
  }

  return (
    <div className="flex flex-1 flex-col overflow-y-auto p-5">
      <button
        type="button"
        onClick={() => navigate("/home")}
        className="mb-3 self-start text-sm text-muted"
      >
        ← Back
      </button>

      <h1 className="text-xl font-semibold text-ink">We found some people for you</h1>
      <p className="mt-1 text-sm text-muted">
        Ranked by shared interests, vibe, and availability.
      </p>

      <div className="mt-5 flex flex-1 flex-col gap-3">
        {loadState === "loading" && (
          <p className="mt-8 text-center text-sm text-muted">Finding your best matches…</p>
        )}

        {loadState === "error" && (
          <div className="mt-8 rounded-2xl border border-line bg-card p-5 text-center">
            <p className="text-sm text-ink">{errorMessage}</p>
          </div>
        )}

        {loadState === "ready" && matches && matches.length === 0 && (
          <div className="mt-8 rounded-2xl border border-line bg-card p-5 text-center">
            <p className="text-sm font-medium text-ink">No matches yet</p>
            <p className="mt-1 text-sm text-muted">
              Try a different activity or check back in a bit — new people join all the time.
            </p>
          </div>
        )}

        {loadState === "ready" &&
          matches &&
          matches.map((match, index) => (
            <PersonCard
              key={match.id}
              match={match}
              student={profiles[match.studentId] ?? null}
              variant={index === 0 ? "featured" : "row"}
              onViewProfile={() => handleViewProfile(match)}
              onInvite={() => handleInvite(match)}
              inviteState={inviteStates[match.id] ?? "idle"}
              inviteMessage={inviteMessages[match.id] ?? null}
            />
          ))}
      </div>
    </div>
  );
}
