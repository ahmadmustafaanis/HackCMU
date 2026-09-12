import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import type { Activity } from "shared-types";
import { api } from "../api/client";
import TabBar from "../components/TabBar";
import ActivityFeedCard from "../components/ActivityFeedCard";

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

export default function Discover() {
  const navigate = useNavigate();
  const [activities, setActivities] = useState<Activity[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState("");
  const [when, setWhen] = useState<WhenFilter>("all");
  const [location, setLocation] = useState<string>("all");
  const [category, setCategory] = useState<CategoryFilter>("all");

  const load = () => {
    setLoading(true);
    setError(null);
    api
      .getActivities()
      .then((res) => setActivities(res.activities))
      .catch(() => setError("Couldn't load activities right now."))
      .finally(() => setLoading(false));
  };

  useEffect(load, []);

  const locations = useMemo(() => {
    const set = new Set<string>();
    (activities ?? []).forEach((a) => set.add(a.approximateLocation));
    return Array.from(set);
  }, [activities]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (activities ?? []).filter((a) => {
      if (q && !`${a.title} ${a.description}`.toLowerCase().includes(q)) return false;
      if (!matchesWhen(a, when)) return false;
      if (location !== "all" && a.approximateLocation !== location) return false;
      if (!matchesCategory(a, category)) return false;
      return true;
    });
  }, [activities, search, when, location, category]);

  const clearFilters = () => {
    setSearch("");
    setWhen("all");
    setLocation("all");
    setCategory("all");
  };

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="flex flex-1 flex-col gap-4 overflow-y-auto p-4">
        <div>
          <h1 className="text-xl font-semibold text-ink">Discover</h1>
          <p className="text-sm text-muted">Find something happening near you.</p>
        </div>

        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="🔍 Search activities…"
          className="w-full rounded-2xl border border-line bg-card px-4 py-2.5 text-sm text-ink placeholder:text-muted focus:border-primary focus:outline-none"
        />

        <div className="flex gap-2 overflow-x-auto pb-1">
          {WHEN_CHIPS.map((chip) => {
            const active = when === chip.value;
            return (
              <button
                key={chip.value}
                type="button"
                onClick={() => setWhen(active ? "all" : chip.value)}
                className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                  active ? "border-primary bg-primary text-white" : "border-line bg-card text-ink hover:border-primary-light"
                }`}
              >
                {chip.label}
              </button>
            );
          })}
        </div>

        {locations.length > 0 && (
          <div className="flex gap-2 overflow-x-auto pb-1">
            <button
              type="button"
              onClick={() => setLocation("all")}
              className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                location === "all" ? "border-primary bg-primary text-white" : "border-line bg-card text-ink hover:border-primary-light"
              }`}
            >
              All Locations
            </button>
            {locations.map((loc) => {
              const active = location === loc;
              return (
                <button
                  key={loc}
                  type="button"
                  onClick={() => setLocation(active ? "all" : loc)}
                  className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                    active ? "border-primary bg-primary text-white" : "border-line bg-card text-ink hover:border-primary-light"
                  }`}
                >
                  📍 {loc}
                </button>
              );
            })}
          </div>
        )}

        <div className="flex gap-1 rounded-2xl border border-line bg-card p-1">
          {CATEGORY_TABS.map((tab) => {
            const active = category === tab.value;
            return (
              <button
                key={tab.value}
                type="button"
                onClick={() => setCategory(tab.value)}
                className={`flex-1 rounded-xl px-2 py-1.5 text-xs font-semibold transition ${
                  active ? "bg-primary text-white" : "text-muted hover:text-ink"
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        <div className="flex flex-col gap-3">
          {loading && <p className="py-6 text-center text-sm text-muted">Loading activities…</p>}

          {!loading && error && (
            <div className="flex flex-col items-center gap-3 rounded-2xl border border-line bg-card p-6 text-center">
              <p className="text-sm text-muted">{error}</p>
              <button
                type="button"
                onClick={load}
                className="rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-white"
              >
                Retry
              </button>
            </div>
          )}

          {!loading && !error && filtered.length === 0 && (
            <div className="flex flex-col items-center gap-3 rounded-2xl border border-line bg-card p-6 text-center">
              <p className="text-sm text-muted">No activities match your filters.</p>
              <button type="button" onClick={clearFilters} className="text-sm font-medium text-primary underline">
                Clear filters
              </button>
            </div>
          )}

          {!loading &&
            !error &&
            filtered.map((activity) => <ActivityFeedCard key={activity.id} activity={activity} onClick={() => navigate(`/meetup/${activity.id}`)} />)}
        </div>
      </div>
      <TabBar />
    </div>
  );
}
