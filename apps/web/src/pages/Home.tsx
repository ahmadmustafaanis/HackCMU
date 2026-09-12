import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import type { Activity } from "shared-types";
import { api } from "../api/client";
import ActivityButtonGrid, {
  DEFAULT_ACTIVITIES,
  fillHomeActivities,
  type ActivityMeta,
} from "../components/ActivityButtonGrid";
import CampusHeatmap from "../components/CampusHeatmap";
import TabBar from "../components/TabBar";
import TrendingCard from "../components/TrendingCard";
import { useSession } from "../state/session";

function timeOfDayGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 5) return "Good night";
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

type TrendingState = "loading" | "ready" | "error";

export default function Home() {
  const { student } = useSession();
  const navigate = useNavigate();
  const [activities, setActivities] = useState<ActivityMeta[]>(DEFAULT_ACTIVITIES);
  const [trending, setTrending] = useState<Activity[]>([]);
  const [trendingState, setTrendingState] = useState<TrendingState>("loading");

  useEffect(() => {
    if (!student) return;
    let cancelled = false;
    api
      .getSuggestions(student.id)
      .then((res) => {
        if (cancelled) return;
        if (res.activityIds.length > 0) {
          setActivities(fillHomeActivities(res.activityIds));
        }
      })
      .catch(() => {
        // Keep the default activity list — the endpoint isn't guaranteed
        // to be wired up yet.
      });
    return () => {
      cancelled = true;
    };
  }, [student]);

  useEffect(() => {
    let cancelled = false;
    api
      .getActivities()
      .then((res) => {
        if (cancelled) return;
        setTrending(res.activities);
        setTrendingState("ready");
      })
      .catch(() => {
        if (!cancelled) setTrendingState("error");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const firstName = student?.name.split(" ")[0] ?? "there";

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="feed-scroll flex min-h-0 flex-1 flex-col pb-4">
        <header className="px-5 pb-2 pt-6">
          <p className="text-sm text-muted">{timeOfDayGreeting()},</p>
          <h1 className="font-display text-[1.85rem] font-medium leading-tight text-ink">{firstName}</h1>
        </header>

        <section className="px-5 py-4">
          <h2 className="mb-3 font-display text-xl font-medium text-ink">What do you want to do?</h2>
          <ActivityButtonGrid
            activities={activities}
            onSelect={(activity) => navigate(`/activity/${activity.type}/setup`)}
          />
        </section>

        <section className="px-5 py-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-display text-xl font-medium text-ink">Trending around CMU</h2>
            <Link to="/discover" className="text-sm font-medium text-primary">
              See all
            </Link>
          </div>

          {trendingState !== "error" && (
            <div className="mb-4">
              <CampusHeatmap
                activities={trending}
                compact
                onSelectLocation={(id) => {
                  if (id) navigate(`/discover?location=${encodeURIComponent(id)}`);
                  else navigate("/discover");
                }}
              />
            </div>
          )}

          {trendingState === "loading" && <p className="text-sm text-muted">Loading…</p>}
          {trendingState === "error" && (
            <p className="text-sm text-muted">Couldn&apos;t load trending activities right now.</p>
          )}
          {trendingState === "ready" && trending.length === 0 && (
            <p className="text-sm text-muted">Nothing trending yet. Be the first to start something!</p>
          )}
          {trendingState === "ready" && trending.length > 0 && (
            <div className="-mx-5 flex gap-3 overflow-x-auto px-5 pb-1">
              {trending.slice(0, 6).map((activity) => (
                <TrendingCard key={activity.id} activity={activity} />
              ))}
            </div>
          )}
        </section>
      </div>
      <TabBar />
    </div>
  );
}
