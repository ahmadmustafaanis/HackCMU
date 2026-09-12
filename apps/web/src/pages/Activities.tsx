import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import type { Activity } from "shared-types";
import { api } from "../api/client";
import ActivityFeedCard from "../components/ActivityFeedCard";
import TabBar from "../components/TabBar";
import { useSession } from "../state/session";

export default function Activities() {
  const navigate = useNavigate();
  const routeLocation = useLocation();
  const { student } = useSession();
  const [activities, setActivities] = useState<Activity[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [bannerMessage, setBannerMessage] = useState<string | null>(() => {
    return (routeLocation.state as { successMessage?: string } | null)?.successMessage ?? null;
  });

  const load = () => {
    setLoading(true);
    setError(null);
    api
      .getMyActivities()
      .then((res) => setActivities(res.activities))
      .catch(() => setError("Couldn't load your activities right now."))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="feed-scroll flex min-h-0 flex-1 flex-col gap-4 p-5">
        <div>
          <h1 className="font-display text-2xl font-medium text-ink">My Activities</h1>
          <p className="mt-1 text-sm text-muted">Activities you created or joined.</p>
        </div>

        {bannerMessage && (
          <div className="flex items-center justify-between gap-2 rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800 shadow-sm animate-in fade-in duration-200">
            <div className="flex items-center gap-2">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-600 text-xs text-white">
                ✓
              </span>
              <span>{bannerMessage}</span>
            </div>
            <button
              type="button"
              onClick={() => setBannerMessage(null)}
              className="text-xs text-emerald-700 hover:text-emerald-950"
              aria-label="Dismiss banner"
            >
              ✕
            </button>
          </div>
        )}

        {loading && <p className="py-8 text-center text-sm text-muted">Loading your activities…</p>}

        {!loading && error && (
          <div className="flex flex-col items-center gap-3 rounded-2xl border border-line bg-card p-6 text-center">
            <p className="text-sm text-muted">{error}</p>
            <button
              type="button"
              onClick={load}
              className="pressable rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white"
            >
              Retry
            </button>
          </div>
        )}

        {!loading && !error && activities && activities.length === 0 && (
          <div className="flex flex-col items-center gap-3 rounded-2xl border border-line bg-card p-8 text-center">
            <p className="font-display text-base font-medium text-ink">No activities yet</p>
            <p className="text-sm text-muted">You haven&apos;t started or joined any activities yet.</p>
            <button
              type="button"
              onClick={() => navigate("/home")}
              className="pressable mt-2 rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-white shadow-sm"
            >
              Find an activity
            </button>
          </div>
        )}

        {!loading &&
          !error &&
          activities &&
          activities.map((activity) => (
            <ActivityFeedCard
              key={activity.id}
              activity={activity}
              onClick={() => navigate(`/meetup/${activity.id}`)}
              isHost={activity.hostId === student?.id}
            />
          ))}
      </div>
      <TabBar />
    </div>
  );
}
