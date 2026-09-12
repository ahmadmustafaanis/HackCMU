import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { Activity, RecommendedCandidate, StructuredIntentInput } from "shared-types";
import { api } from "../api/client";
import ActivityButtonGrid, {
  DEFAULT_ACTIVITIES,
  fillHomeActivities,
  type ActivityMeta,
} from "../components/ActivityButtonGrid";
import ActivityFeedCard from "../components/ActivityFeedCard";
import CampusHeatmap from "../components/CampusHeatmap";
import { SearchIcon, SparkIcon } from "../components/Icons";
import TabBar from "../components/TabBar";
import { useSession } from "../state/session";
import buildings from "../config/buildings.json";

function timeOfDayGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 5) return "Good night";
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

type WhenFilter = "all" | "now" | "hour" | "later" | "week";
type CategoryFilter = "all" | "food" | "study" | "fitness" | "coffee" | "social";

const WHEN_CHIPS: { value: WhenFilter; label: string }[] = [
  { value: "now", label: "Now" },
  { value: "hour", label: "Within Hour" },
  { value: "later", label: "Later Today" },
  { value: "week", label: "This Week" },
];

const CATEGORY_TABS: { value: CategoryFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "food", label: "Food" },
  { value: "study", label: "Study" },
  { value: "fitness", label: "Fitness" },
  { value: "coffee", label: "Coffee" },
  { value: "social", label: "Social" },
];

const CATEGORY_KEYWORDS: Record<Exclude<CategoryFilter, "all">, string[]> = {
  food: ["food", "eat", "lunch", "dinner", "snack", "meal", "restaurant"],
  study: ["study", "research", "homework", "library", "focus", "work"],
  fitness: ["fitness", "gym", "workout", "run", "sport", "exercise"],
  coffee: ["coffee", "cafe", "café", "espresso"],
  social: ["social", "hang", "party", "game", "mixer", "chat"],
};

const LOCATION_OPTIONS = [
  { id: "cohon-university-center", label: "CUC" },
  { id: "hunt-library", label: "Hunt" },
  { id: "gates-hillman", label: "Gates" },
  { id: "tepper-quad", label: "Tepper" },
];

function matchesWhen(activity: Activity, when: WhenFilter): boolean {
  if (when === "all") return true;
  const label = activity.timeLabel.toLowerCase();
  if (when === "now") return /\bnow\b/.test(label);
  if (when === "hour") return /hour|[1-5]?\d\s*min/.test(label);
  if (when === "later") return /today|tonight|later/.test(label);
  if (when === "week") return /week|tomorrow|mon|tue|wed|thu|fri|sat|sun/.test(label);
  return true;
}

function matchesCategory(activity: Activity, category: CategoryFilter): boolean {
  if (category === "all") return true;
  const haystack = `${activity.type} ${activity.title} ${activity.vibe}`.toLowerCase();
  return CATEGORY_KEYWORDS[category].some((kw) => haystack.includes(kw));
}

function nearestBuilding(lat: number, lng: number): string {
  return buildings.reduce(
    (nearest, building) => {
      const distance = (building.lat - lat) ** 2 + (building.lng - lng) ** 2;
      return distance < nearest.distance ? { id: building.id, distance } : nearest;
    },
    { id: "cohon-university-center", distance: Number.POSITIVE_INFINITY },
  ).id;
}

function hasTextTime(text: string): boolean {
  return /\bin\s+\d+\s*(minutes?|mins?|m|hours?|hrs?|h)\b/i.test(text);
}

function hasTextLocation(text: string): boolean {
  const normalized = text.toLowerCase();
  return buildings.some((building) => {
    const aliases = [building.id, building.label, building.id.replace(/-/g, " ")];
    return aliases.some((alias) => {
      const escaped = alias.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      return new RegExp(`(^|\\s)${escaped}(?=$|\\s|[,.;!?])`, "i").test(normalized);
    });
  });
}

type RecommendationState = "idle" | "loading" | "ready" | "error";

export default function Home() {
  const { student } = useSession();
  const navigate = useNavigate();

  // Search & matching intent state
  const [activities, setActivities] = useState<ActivityMeta[]>(DEFAULT_ACTIVITIES);
  const [selectedActivity, setSelectedActivity] = useState<ActivityMeta | null>(null);
  const [freeText, setFreeText] = useState("");
  const [time, setTime] = useState("now");
  const [locationId, setLocationId] = useState("");
  const [recommendations, setRecommendations] = useState<RecommendedCandidate[]>([]);
  const [recommendationState, setRecommendationState] = useState<RecommendationState>("idle");
  const [intentOpen, setIntentOpen] = useState(false);

  // Discover & activities feed state
  const [allActivities, setAllActivities] = useState<Activity[]>([]);
  const [loadingActivities, setLoadingActivities] = useState(true);
  const [activitiesError, setActivitiesError] = useState<string | null>(null);

  const [when, setWhen] = useState<WhenFilter>("all");
  const [selectedLocationFilter, setSelectedLocationFilter] = useState<string>("all");
  const [category, setCategory] = useState<CategoryFilter>("all");

  // Load activity suggestions tailored to student
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
        // Fall back gracefully to DEFAULT_ACTIVITIES
      });
    return () => {
      cancelled = true;
    };
  }, [student]);

  // Load campus activities for heatmap & feed
  const loadActivities = () => {
    setLoadingActivities(true);
    setActivitiesError(null);
    api
      .getActivities()
      .then((res) => {
        setAllActivities(res.activities);
      })
      .catch(() => {
        setActivitiesError("Couldn't load campus activities right now.");
      })
      .finally(() => {
        setLoadingActivities(false);
      });
  };

  useEffect(() => {
    loadActivities();
  }, []);

  // Live recommendations for intent
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

  // Notification permissions check
  useEffect(() => {
    if (!student || !("Notification" in window)) return;
    if (Notification.permission === "default") Notification.requestPermission().catch(() => undefined);
    api
      .getNotifications()
      .then(({ notifications }) => {
        if (Notification.permission !== "granted") return;
        const latest = notifications[0];
        if (latest) new Notification("Scotty's Circle", { body: latest.message });
      })
      .catch(() => undefined);
  }, [student]);

  function startMatching() {
    const text = freeText.trim() || undefined;
    const intent: StructuredIntentInput = {
      activityIds: selectedActivity ? [selectedActivity.canonicalId] : [],
      text,
      time: text && hasTextTime(text) ? undefined : time === "now" ? undefined : time,
      locationIds: text && hasTextLocation(text) ? [] : locationId ? [locationId] : [],
    };
    if (intent.activityIds.length === 0 && !intent.text) return;
    navigate("/matching", { state: { userId: student?.id, intent } });
  }

  // Location filter options derived from activities
  const locations = useMemo(() => {
    const byId = new Map<string, string>();
    allActivities.forEach((a) => {
      const id = a.locationId ?? a.approximateLocation;
      byId.set(id, a.approximateLocation);
    });
    return Array.from(byId.entries()).map(([id, name]) => ({ id, name }));
  }, [allActivities]);

  const matchesLocation = (activity: Activity, locFilter: string) => {
    if (locFilter === "all") return true;
    return (activity.locationId ?? activity.approximateLocation) === locFilter;
  };

  // Discover feed filtering: respects search text, when filter, category filter
  const preMapFiltered = useMemo(() => {
    const q = freeText.trim().toLowerCase();
    return allActivities.filter((a) => {
      if (q && !`${a.title} ${a.description} ${a.type}`.toLowerCase().includes(q)) return false;
      if (!matchesWhen(a, when)) return false;
      if (!matchesCategory(a, category)) return false;
      return true;
    });
  }, [allActivities, freeText, when, category]);

  const filtered = useMemo(
    () => preMapFiltered.filter((a) => matchesLocation(a, selectedLocationFilter)),
    [preMapFiltered, selectedLocationFilter],
  );

  const clearDiscoverFilters = () => {
    setFreeText("");
    setWhen("all");
    setSelectedLocationFilter("all");
    setCategory("all");
  };

  const firstName = student?.name.split(" ")[0] ?? "there";

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="feed-scroll flex min-h-0 flex-1 flex-col pb-4">
        {/* Header with Carnegie typography */}
        <header className="px-5 pb-2 pt-6">
          <p className="text-sm text-muted">{timeOfDayGreeting()},</p>
          <h1 className="font-display text-[1.85rem] font-medium leading-tight text-ink">
            {firstName} <span className="inline-block text-xl">👋</span>
          </h1>
        </header>

        {/* Search Bar & Intent Section */}
        <section className="px-5 py-3">
          <div className="relative mb-2">
            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3.5 text-muted">
              <SearchIcon className="h-4 w-4" />
            </div>
            <input
              type="text"
              value={freeText}
              onChange={(e) => setFreeText(e.target.value)}
              placeholder='Try "coffee at Tepper" or "treadmill at CUC"'
              className="w-full rounded-2xl border border-line bg-card py-3 pl-10 pr-4 text-sm text-ink placeholder:text-muted focus:border-primary"
              aria-label="Describe what you want to do"
              onFocus={() => setIntentOpen(true)}
            />
            {freeText && (
              <button
                type="button"
                onClick={() => setFreeText("")}
                className="absolute inset-y-0 right-0 flex items-center pr-3.5 text-xs text-muted hover:text-ink"
                aria-label="Clear search"
              >
                ✕
              </button>
            )}
          </div>

          {/* Expandable Intent & Refinement Panel */}
          {intentOpen && (
            <div className="mb-3 flex flex-col gap-3 rounded-2xl border border-line bg-card p-4 shadow-sm animate-in fade-in duration-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-primary">
                  <SparkIcon className="h-3.5 w-3.5" />
                  <span>Refine plan &amp; match</span>
                </div>
                <button
                  type="button"
                  onClick={() => setIntentOpen(false)}
                  className="pressable rounded-full px-2.5 py-1 text-xs font-medium text-muted hover:bg-surface hover:text-ink"
                >
                  Done
                </button>
              </div>

              {/* Location options */}
              <div className="flex gap-2 overflow-x-auto pb-1">
                {LOCATION_OPTIONS.map((loc) => {
                  const active = locationId === loc.id;
                  return (
                    <button
                      key={loc.id}
                      type="button"
                      onClick={() => {
                        const next = active ? "" : loc.id;
                        setLocationId(next);
                        if (next) setSelectedLocationFilter(next);
                      }}
                      className={`pressable shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                        active
                          ? "border-primary bg-primary text-white"
                          : "border-line bg-surface text-ink hover:border-primary/50"
                      }`}
                    >
                      {loc.label}
                    </button>
                  );
                })}
              </div>

              {/* Time select */}
              <select
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className="rounded-xl border border-line bg-surface px-3 py-2 text-xs text-ink focus:border-primary"
                aria-label="When do you want to meet?"
              >
                <option value="now">Now</option>
                <option value="in 30 minutes">In 30 minutes</option>
                <option value="in 1 hour">In 1 hour</option>
              </select>

              {/* Activity Button Grid */}
              <ActivityButtonGrid
                activities={activities}
                selectedId={selectedActivity?.canonicalId}
                onSelect={(act) =>
                  setSelectedActivity((curr) => (curr?.canonicalId === act.canonicalId ? null : act))
                }
              />

              {/* Match CTA button */}
              {(selectedActivity || freeText.trim()) && (
                <button
                  type="button"
                  onClick={startMatching}
                  className="pressable w-full rounded-full bg-primary px-4 py-3 text-sm font-semibold text-white shadow-[0_8px_18px_-10px_rgb(196_18_48_/_0.7)] hover:bg-primary-dark"
                >
                  Find people to join you
                </button>
              )}

              {/* Live Recommendations */}
              {selectedActivity && (
                <div className="mt-2 border-t border-line pt-3">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase tracking-wide text-muted">
                      Already happening
                    </span>
                    {recommendationState === "loading" && (
                      <span className="text-xs text-muted">Searching…</span>
                    )}
                  </div>

                  {recommendationState === "error" && (
                    <p className="text-xs text-muted">Recommendations currently unavailable.</p>
                  )}
                  {recommendationState === "ready" && recommendations.length === 0 && (
                    <p className="text-xs text-muted">Nothing active yet. Tap &ldquo;Find people&rdquo; to start!</p>
                  )}

                  <div className="flex gap-2.5 overflow-x-auto pb-1">
                    {recommendations.map((candidate) => (
                      <button
                        key={candidate.eventId}
                        type="button"
                        onClick={() => navigate(`/meetup/${candidate.eventId}`)}
                        className="pressable min-w-48 shrink-0 rounded-xl border border-line bg-surface p-2.5 text-left hover:border-primary/50"
                      >
                        <p className="font-display text-sm font-medium text-ink">{candidate.title}</p>
                        <p className="mt-0.5 text-[11px] text-muted">
                          {candidate.timeLabel} · {candidate.approximateLocation}
                        </p>
                        <p className="mt-1 text-[11px] font-medium text-primary">
                          {candidate.attendeeCount} going
                        </p>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </section>

        {/* Discover Page Layout under the Search Bar */}
        <section className="px-5 py-2">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-display text-xl font-medium text-ink">Discover Campus</h2>
            <span className="tabular-nums text-xs text-muted">
              {filtered.length} {filtered.length === 1 ? "activity" : "activities"}
            </span>
          </div>

          {/* When Filter Chips */}
          <div className="mb-2 flex gap-2 overflow-x-auto pb-1">
            {WHEN_CHIPS.map((chip) => {
              const active = when === chip.value;
              return (
                <button
                  key={chip.value}
                  type="button"
                  onClick={() => setWhen(active ? "all" : chip.value)}
                  className={`pressable shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium ${
                    active
                      ? "border-primary bg-primary text-white"
                      : "border-line bg-card text-ink hover:border-primary"
                  }`}
                >
                  {chip.label}
                </button>
              );
            })}

            {locations.length > 0 && (
              <>
                <span className="mx-0.5 h-6 w-px shrink-0 self-center bg-line" aria-hidden="true" />
                <button
                  type="button"
                  onClick={() => setSelectedLocationFilter("all")}
                  className={`pressable shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium ${
                    selectedLocationFilter === "all"
                      ? "border-primary bg-primary text-white"
                      : "border-line bg-card text-ink hover:border-primary"
                  }`}
                >
                  All Locations
                </button>
                {locations.map((loc) => {
                  const active = selectedLocationFilter === loc.id;
                  return (
                    <button
                      key={loc.id}
                      type="button"
                      onClick={() => {
                        const next = active ? "all" : loc.id;
                        setSelectedLocationFilter(next);
                        setLocationId(next === "all" ? "" : next);
                      }}
                      className={`pressable shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium ${
                        active
                          ? "border-primary bg-primary text-white"
                          : "border-line bg-card text-ink hover:border-primary"
                      }`}
                    >
                      {loc.name}
                    </button>
                  );
                })}
              </>
            )}
          </div>

          {/* Category Tabs */}
          <div className="mb-3 flex gap-1 rounded-2xl border border-line bg-card p-1">
            {CATEGORY_TABS.map((tab) => {
              const active = category === tab.value;
              return (
                <button
                  key={tab.value}
                  type="button"
                  onClick={() => setCategory(tab.value)}
                  className={`pressable flex-1 rounded-xl px-2 py-1.5 text-xs font-semibold ${
                    active ? "bg-primary text-white" : "text-muted hover:text-ink"
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          {/* Interactive Campus Heatmap */}
          <div className="mb-4">
            <CampusHeatmap
              activities={preMapFiltered}
              compact
              selectedLocationId={selectedLocationFilter}
              requestLocationOnMount
              onUserLocation={({ lat, lng }) => {
                const nearest = nearestBuilding(lat, lng);
                setSelectedLocationFilter(nearest);
                setLocationId(nearest);
              }}
              onSelectLocation={(id) => {
                const next = id ?? "all";
                setSelectedLocationFilter(next);
                setLocationId(next === "all" ? "" : next);
              }}
            />
          </div>

          {/* Activities Feed */}
          <div className="space-y-3" aria-label="Campus activities">
            {loadingActivities && (
              <p className="py-6 text-center text-sm text-muted">Loading campus activities…</p>
            )}

            {!loadingActivities && activitiesError && (
              <div className="flex flex-col items-center gap-3 rounded-2xl border border-line bg-card p-6 text-center">
                <p className="text-sm text-muted">{activitiesError}</p>
                <button
                  type="button"
                  onClick={loadActivities}
                  className="pressable rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white"
                >
                  Retry
                </button>
              </div>
            )}

            {!loadingActivities && !activitiesError && filtered.length === 0 && (
              <div className="flex flex-col items-center gap-3 rounded-2xl border border-line bg-card p-6 text-center">
                <p className="text-sm text-muted">No activities match your filters.</p>
                <button
                  type="button"
                  onClick={clearDiscoverFilters}
                  className="text-sm font-medium text-primary underline"
                >
                  Clear filters
                </button>
              </div>
            )}

            {!loadingActivities &&
              !activitiesError &&
              filtered.map((activity) => (
                <ActivityFeedCard
                  key={activity.id}
                  activity={activity}
                  onClick={() => navigate(`/meetup/${activity.id}`)}
                  highlighted={
                    selectedLocationFilter !== "all" &&
                    (activity.locationId ?? activity.approximateLocation) === selectedLocationFilter
                  }
                />
              ))}
          </div>
        </section>
      </div>
      <TabBar />
    </div>
  );
}
