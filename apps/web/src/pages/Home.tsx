import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import type { Activity } from "shared-types";
import { api } from "../api/client";
import ActivityButtonGrid, {
  DEFAULT_ACTIVITIES,
  metaForCanonicalId,
  type ActivityMeta,
} from "../components/ActivityButtonGrid";
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
          setActivities(res.activityIds.map(metaForCanonicalId));
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
    <>
      <div className="flex flex-1 flex-col overflow-y-auto pb-4">
        <header className="px-5 pb-2 pt-6">
          <p className="text-sm text-muted">{timeOfDayGreeting()},</p>
          <h1 className="text-2xl font-semibold text-ink">{firstName} 👋</h1>
        </header>

        <section className="px-5 py-4">
          <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-muted">
            What do you want to do?
          </h2>
          <ActivityButtonGrid
            activities={activities}
            onSelect={(activity) => navigate(`/activity/${activity.type}/setup`)}
          />
        </section>

        <section className="px-5 py-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-xs font-semibold uppercase tracking-wide text-muted">
              Trending Around CMU
            </h2>
            <Link to="/discover" className="text-sm font-medium text-primary">
              See all
            </Link>
          </div>

          {trendingState === "loading" && <p className="text-sm text-muted">Loading…</p>}
          {trendingState === "error" && (
            <p className="text-sm text-muted">Couldn&apos;t load trending activities right now.</p>
          )}
          {trendingState === "ready" && trending.length === 0 && (
            <p className="text-sm text-muted">Nothing trending yet — be the first to start something!</p>
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
    </>
  );
}
