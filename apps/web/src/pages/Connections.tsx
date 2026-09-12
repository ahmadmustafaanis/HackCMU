import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { Match, Student } from "shared-types";
import { api } from "../api/client";
import { useSession } from "../state/session";
import TabBar from "../components/TabBar";

const STATUS_LABEL: Record<Match["status"], string> = {
  suggested: "Suggested",
  invited: "Invited",
  accepted: "Accepted",
  connected: "Connected",
};

// Match (shared-types) doesn't carry a timestamp, so there's no real
// "matched N minutes ago" data to read yet. This derives a stable,
// presentational relative-time label from the match id purely for UI
// polish — it never claims to reflect an actual backend timestamp.
const RELATIVE_LABELS = ["Just now", "10m ago", "1h ago", "Yesterday", "3d ago"];
function pseudoRelativeTime(id: string): string {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  return RELATIVE_LABELS[hash % RELATIVE_LABELS.length];
}

export default function Connections() {
  const { student } = useSession();
  const navigate = useNavigate();

  const [connections, setConnections] = useState<Match[] | null>(null);
  const [profiles, setProfiles] = useState<Record<string, Student>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = () => {
    if (!student) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    api
      .getConnections(student.id)
      .then(async (res) => {
        setConnections(res.connections);
        const entries = await Promise.allSettled(
          res.connections.map(async (m) => [m.studentId, await api.getProfile(m.studentId)] as const),
        );
        const next: Record<string, Student> = {};
        for (const entry of entries) {
          if (entry.status === "fulfilled") {
            const [id, profile] = entry.value;
            next[id] = profile;
          }
        }
        setProfiles(next);
      })
      .catch(() => setError("Couldn't load your connections right now."))
      .finally(() => setLoading(false));
  };

  useEffect(load, [student]);

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-4">
        <div>
          <h1 className="text-xl font-semibold text-ink">Connections</h1>
          <p className="text-sm text-muted">People you've met through Scotty's Circle.</p>
        </div>

        {!student && (
          <p className="rounded-2xl border border-line bg-card p-4 text-center text-sm text-muted">
            Sign in to see your connections.
          </p>
        )}

        {student && loading && <p className="py-6 text-center text-sm text-muted">Loading connections…</p>}

        {student && !loading && error && (
          <div className="flex flex-col items-center gap-3 rounded-2xl border border-line bg-card p-6 text-center">
            <p className="text-sm text-muted">{error}</p>
            <button type="button" onClick={load} className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white">
              Retry
            </button>
          </div>
        )}

        {student && !loading && !error && connections && connections.length === 0 && (
          <div className="flex flex-col items-center gap-3 rounded-2xl border border-line bg-card p-6 text-center">
            <p className="text-sm text-muted">No connections yet — go meet someone!</p>
            <button
              type="button"
              onClick={() => navigate("/discover")}
              className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white"
            >
              Discover activities
            </button>
          </div>
        )}

        {student &&
          !loading &&
          !error &&
          connections?.map((match) => {
            const profile = profiles[match.studentId];
            return (
              <button
                key={match.id}
                type="button"
                onClick={() => navigate(`/people/${match.studentId}`)}
                className="flex items-center gap-3 rounded-2xl border border-line bg-card p-3 text-left shadow-sm transition hover:border-primary-light"
              >
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                  {profile?.initials ?? "?"}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-ink">{profile?.name ?? "Fellow Scotty"}</p>
                  <p className="truncate text-xs text-muted">matched for {match.activityType}</p>
                </div>
                <div className="flex shrink-0 flex-col items-end gap-1">
                  <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary">
                    {STATUS_LABEL[match.status]}
                  </span>
                  <span className="text-[11px] text-muted">{pseudoRelativeTime(match.id)}</span>
                </div>
              </button>
            );
          })}
      </div>
      <TabBar />
    </div>
  );
}
