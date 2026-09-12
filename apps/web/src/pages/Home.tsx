import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import type { Activity, RecommendedCandidate, StructuredIntentInput } from "shared-types";
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
import buildings from "../config/buildings.json";

function timeOfDayGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 5) return "Good night";
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

type TrendingState = "loading" | "ready" | "error";
type RecommendationState = "idle" | "loading" | "ready" | "error";

const LOCATION_OPTIONS = [
  { id: "cohon-university-center", label: "CUC" },
  { id: "hunt-library", label: "Hunt" },
  { id: "gates-hillman", label: "Gates" },
  { id: "tepper-quad", label: "Tepper" },
];

function nearestBuilding(lat: number, lng: number): string {
  return buildings.reduce((nearest, building) => {
    const distance = (building.lat - lat) ** 2 + (building.lng - lng) ** 2;
    return distance < nearest.distance ? { id: building.id, distance } : nearest;
  }, { id: "cohon-university-center", distance: Number.POSITIVE_INFINITY }).id;
}

function hasTextTime(text: string): boolean {
  return /\bin\s+\d+\s*(minutes?|mins?|m|hours?|hrs?|h)\b/i.test(text);
}

export default function Home() {
  const { student } = useSession();
  const navigate = useNavigate();
  const [activities, setActivities] = useState<ActivityMeta[]>(DEFAULT_ACTIVITIES);
  const [trending, setTrending] = useState<Activity[]>([]);
  const [trendingState, setTrendingState] = useState<TrendingState>("loading");
  const [selectedActivity, setSelectedActivity] = useState<ActivityMeta | null>(null);
  const [freeText, setFreeText] = useState("");
  const [time, setTime] = useState("now");
  const [locationId, setLocationId] = useState("");
  const [recommendations, setRecommendations] = useState<RecommendedCandidate[]>([]);
  const [recommendationState, setRecommendationState] = useState<RecommendationState>("idle");
  const [intentOpen, setIntentOpen] = useState(false);

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

  useEffect(() => {
    if (!selectedActivity || !student) {
      setRecommendations([]);
      setRecommendationState("idle");
      return;
    }

    let current = true;
    setRecommendationState("loading");
    const timer = window.setTimeout(() => {
      api
        .recommend({
          activityIds: [selectedActivity.canonicalId],
          locationIds: locationId ? [locationId] : [],
          time: time === "now" ? new Date().toISOString() : time,
        })
        .then((res) => {
          if (!current) return;
          setRecommendations(res.candidates);
          setRecommendationState("ready");
        })
        .catch(() => {
          if (current) setRecommendationState("error");
        });
    }, 250);

    return () => {
      current = false;
      window.clearTimeout(timer);
    };
  }, [locationId, selectedActivity, student, time]);

  useEffect(() => {
    if (!student || !("Notification" in window)) return;
    if (Notification.permission === "default") Notification.requestPermission().catch(() => undefined);
    api.getNotifications().then(({ notifications }) => {
      if (Notification.permission !== "granted") return;
      const latest = notifications[0];
      if (latest) new Notification("Scotty's Circle", { body: latest.message });
    }).catch(() => undefined);
  }, [student]);

  function startMatching() {
    const text = freeText.trim() || undefined;
    const intent: StructuredIntentInput = {
      activityIds: selectedActivity ? [selectedActivity.canonicalId] : [],
      text,
      // Let the server extract a relative time from text instead of allowing
      // the default "now" selector to override phrases like "in 10 mins".
      time: text && hasTextTime(text) ? undefined : time === "now" ? undefined : time,
      locationIds: locationId ? [locationId] : [],
    };
    if (intent.activityIds.length === 0 && !intent.text) return;
    navigate("/matching", { state: { userId: student?.id, intent } });
  }

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
          <div className="mb-3 flex flex-col gap-2">
            <input
              type="text"
              value={freeText}
              onChange={(event) => setFreeText(event.target.value)}
              placeholder='Try "treadmill in 10 mins at CUC" or "coffee at Tepper in 10 mins"'
              className="w-full rounded-2xl border border-line bg-card px-4 py-3 text-sm text-ink placeholder:text-muted focus:border-primary"
              aria-label="Describe what you want to do"
              onFocus={() => setIntentOpen(true)}
            />
            {intentOpen && (
              <div className="flex flex-col gap-2 rounded-2xl border border-line bg-card p-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wide text-muted">Refine your plan</span>
                  <div className="flex items-center gap-3">
                    <button type="button" onClick={() => setIntentOpen(false)} className="text-xs font-medium text-muted">
                      Back
                    </button>
                    <button type="button" onClick={() => setIntentOpen(false)} className="text-lg leading-none text-muted" aria-label="Close intent options">
                      ×
                    </button>
                  </div>
                </div>
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {LOCATION_OPTIONS.map((location) => (
                    <button
                      key={location.id}
                      type="button"
                      onClick={() => setLocationId((current) => (current === location.id ? "" : location.id))}
                      className={`pressable shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium ${
                        locationId === location.id ? "border-primary bg-primary text-white" : "border-line bg-card text-ink"
                      }`}
                    >
                      {location.label}
                    </button>
                  ))}
                </div>
                <select
                  value={time}
                  onChange={(event) => setTime(event.target.value)}
                  className="rounded-xl border border-line bg-card px-3 py-2 text-sm text-ink"
                  aria-label="When do you want to meet?"
                >
                  <option value="now">Now</option>
                  <option value="in 30 minutes">In 30 minutes</option>
                  <option value="in 1 hour">In 1 hour</option>
                </select>
              </div>
            )}
          </div>
          <ActivityButtonGrid
            activities={activities}
            onSelect={(activity) => {
              setSelectedActivity(activity);
              setIntentOpen(true);
            }}
          />
          {intentOpen && (selectedActivity || freeText.trim()) && (
            <button
              type="button"
              onClick={startMatching}
              className="mt-4 w-full rounded-full bg-primary px-4 py-3 text-sm font-semibold text-white"
            >
              Find people
            </button>
          )}
          {intentOpen && selectedActivity && (
            <section className="mt-5">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-muted">Already happening</h3>
                {recommendationState === "loading" && <span className="text-xs text-muted">Updating...</span>}
              </div>
              {recommendationState === "error" && <p className="text-sm text-muted">Recommendations are unavailable right now.</p>}
              {recommendationState === "ready" && recommendations.length === 0 && (
                <p className="text-sm text-muted">Nothing matches yet. Start a new activity.</p>
              )}
              <div className="flex gap-3 overflow-x-auto pb-1">
                {recommendations.map((candidate) => (
                  <button key={candidate.eventId} type="button" onClick={() => navigate(`/meetup/${candidate.eventId}`)} className="min-w-56 rounded-2xl border border-line bg-card p-3 text-left shadow-sm">
                    <p className="text-sm font-semibold text-ink">{candidate.title}</p>
                    <p className="mt-1 text-xs text-muted">{candidate.timeLabel} · {candidate.approximateLocation}</p>
                    <p className="mt-2 text-xs font-medium text-ink">{candidate.attendeeCount} going</p>
                  </button>
                ))}
              </div>
            </section>
          )}
        </section>

        <section className="px-5 py-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-display text-xl font-medium text-ink">Trending around CMU</h2>
            <Link to="/activities" className="text-sm font-medium text-primary">
              See all
            </Link>
          </div>

          {trendingState !== "error" && (
            <div className="mb-4">
              <CampusHeatmap
                activities={trending}
                compact
                selectedLocationId={locationId || "all"}
                requestLocationOnMount
                onUserLocation={({ lat, lng }) => {
                  setLocationId(nearestBuilding(lat, lng));
                  setIntentOpen(true);
                }}
                onSelectLocation={(id) => {
                  if (id) setLocationId(id);
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
                <TrendingCard key={activity.id} activity={activity} onClick={() => navigate(`/meetup/${activity.id}`)} />
              ))}
            </div>
          )}
        </section>
      </div>
      <TabBar />
    </div>
  );
}
