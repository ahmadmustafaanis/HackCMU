import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router-dom";
import type { Activity } from "shared-types";
import { api } from "../api/client";
import ActivityFeedCard from "../components/ActivityFeedCard";
import CampusHeatmap from "../components/CampusHeatmap";
import TabBar from "../components/TabBar";

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

function parseWhen(value: string | null): WhenFilter {
  if (value === "now" || value === "hour" || value === "later" || value === "week") return value;
  return "all";
}

function parseCategory(value: string | null): CategoryFilter {
  if (value === "food" || value === "study" || value === "fitness" || value === "coffee" || value === "social") {
    return value;
  }
  return "all";
}

export default function Discover() {
  const navigate = useNavigate();
  const routeLocation = useLocation();
  const myActivities = routeLocation.pathname === "/activities";
  const [searchParams, setSearchParams] = useSearchParams();
  const [activities, setActivities] = useState<Activity[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [search, setSearch] = useState(() => searchParams.get("q") ?? "");
  const [when, setWhen] = useState<WhenFilter>(() => parseWhen(searchParams.get("when")));
  const [location, setLocation] = useState<string>(searchParams.get("location") ?? "all");
  const [category, setCategory] = useState<CategoryFilter>(() => parseCategory(searchParams.get("category")));

  useEffect(() => {
    setWhen(parseWhen(searchParams.get("when")));
    setLocation(searchParams.get("location") ?? "all");
    setCategory(parseCategory(searchParams.get("category")));
  }, [searchParams]);

  const patchQuery = (patch: Record<string, string | null>) => {
    const nextParams = new URLSearchParams(searchParams);
    for (const [key, value] of Object.entries(patch)) {
      if (!value || value === "all") nextParams.delete(key);
      else nextParams.set(key, value);
    }
    setSearchParams(nextParams, { replace: true });
  };

  const setSearchFilter = (value: string) => {
    setSearch(value);
    patchQuery({ q: value.trim() || null });
  };

  const setWhenFilter = (value: WhenFilter) => {
    setWhen(value);
    patchQuery({ when: value });
  };

  const setCategoryFilter = (value: CategoryFilter) => {
    setCategory(value);
    patchQuery({ category: value });
  };

  const setLocationFilter = (next: string) => {
    const value = next || "all";
    setLocation(value);
    patchQuery({ location: value });
  };

  const load = () => {
    setLoading(true);
    setError(null);
    (myActivities ? api.getMyActivities() : api.getActivities())
      .then((res) => setActivities(res.activities))
      .catch(() => setError("Couldn't load activities right now."))
      .finally(() => setLoading(false));
  };

  useEffect(load, [myActivities]);

  const locations = useMemo(() => {
    const byId = new Map<string, string>();
    (activities ?? []).forEach((a) => {
      const id = a.locationId ?? a.approximateLocation;
      byId.set(id, a.approximateLocation);
    });
    return Array.from(byId.entries()).map(([id, name]) => ({ id, name }));
  }, [activities]);

  const matchesLocation = (activity: Activity, locationFilter: string) => {
    if (locationFilter === "all") return true;
    return (activity.locationId ?? activity.approximateLocation) === locationFilter;
  };

  const preMapFiltered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return (activities ?? []).filter((a) => {
      if (q && !`${a.title} ${a.description}`.toLowerCase().includes(q)) return false;
      if (!matchesWhen(a, when)) return false;
      if (!matchesCategory(a, category)) return false;
      return true;
    });
  }, [activities, search, when, category]);

  const filtered = useMemo(
    () => preMapFiltered.filter((a) => matchesLocation(a, location)),
    [preMapFiltered, location],
  );

  const clearFilters = () => {
    setSearch("");
    setWhen("all");
    setLocation("all");
    setCategory("all");
    setSearchParams(new URLSearchParams(), { replace: true });
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <div className="shrink-0 space-y-2 px-4 pt-4">
        <div>
          <h1 className="font-display text-[1.85rem] font-medium leading-tight text-ink">
            {myActivities ? "My Activities" : "Discover"}
          </h1>
          <p className="text-sm text-muted">
            {myActivities ? "Activities you started or joined." : "Find something happening near you."}
          </p>
        </div>

        <div>
          <label htmlFor="discover-search" className="sr-only">
            Search activities
          </label>
          <input
            id="discover-search"
            type="search"
            value={search}
            onChange={(e) => setSearchFilter(e.target.value)}
            placeholder="Search activities…"
            autoComplete="off"
            className="w-full rounded-2xl border border-line bg-card px-4 py-2.5 text-sm text-ink placeholder:text-muted focus:border-primary"
          />
        </div>

        <div className="flex gap-2 overflow-x-auto pb-1">
          {WHEN_CHIPS.map((chip) => {
            const active = when === chip.value;
            return (
              <button
                key={chip.value}
                type="button"
                onClick={() => setWhenFilter(active ? "all" : chip.value)}
                className={`pressable shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium ${
                  active ? "border-primary bg-primary text-white" : "border-line bg-card text-ink hover:border-primary"
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
                onClick={() => setLocationFilter("all")}
                className={`pressable shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium ${
                  location === "all" ? "border-primary bg-primary text-white" : "border-line bg-card text-ink hover:border-primary"
                }`}
              >
                All Locations
              </button>
              {locations.map((loc) => {
                const active = location === loc.id;
                return (
                  <button
                    key={loc.id}
                    type="button"
                    onClick={() => setLocationFilter(active ? "all" : loc.id)}
                    className={`pressable shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium ${
                      active ? "border-primary bg-primary text-white" : "border-line bg-card text-ink hover:border-primary"
                    }`}
                  >
                    {loc.name}
                  </button>
                );
              })}
            </>
          )}
        </div>

        <div className="flex gap-1 rounded-2xl border border-line bg-card p-1">
          {CATEGORY_TABS.map((tab) => {
            const active = category === tab.value;
            return (
              <button
                key={tab.value}
                type="button"
                onClick={() => setCategoryFilter(tab.value)}
                className={`pressable flex-1 rounded-xl px-2 py-1.5 text-xs font-semibold ${
                  active ? "bg-primary text-white" : "text-muted hover:text-ink"
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        <CampusHeatmap
          activities={preMapFiltered}
          selectedLocationId={location}
          onSelectLocation={(id) => setLocationFilter(id ?? "all")}
          compact
        />
      </div>

        <div className="feed-scroll min-h-0 flex-1 space-y-3 px-4 py-3" aria-label="Open activities">
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
            filtered.map((activity) => (
              <ActivityFeedCard
                key={activity.id}
                activity={activity}
                onClick={() => navigate(`/meetup/${activity.id}`)}
                highlighted={location !== "all" && (activity.locationId ?? activity.approximateLocation) === location}
              />
            ))}
        </div>
      <TabBar />
    </div>
  );
}
