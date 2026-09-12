import { ACTIVITY_ICONS, SparkIcon } from "./Icons";

/** Shared activity metadata + the Home screen's button grid. */

export interface ActivityMeta {
  type: string;
  canonicalId: string;
  label: string;
  icon: string;
  /** Used in ActivitySetup's "What kind of {noun} are you looking for?" heading. */
  noun: string;
}

export const DEFAULT_ACTIVITIES: ActivityMeta[] = [
  { type: "eat", canonicalId: "lunch", label: "Eat", icon: "🍔", noun: "food" },
  { type: "coffee", canonicalId: "coffee", label: "Coffee", icon: "☕", noun: "coffee" },
  { type: "study", canonicalId: "studying", label: "Study", icon: "📚", noun: "study session" },
  { type: "walk", canonicalId: "walking", label: "Walk", icon: "🚶", noun: "walk" },
  { type: "gym", canonicalId: "workout", label: "Gym", icon: "🏋️", noun: "workout" },
  { type: "hangout", canonicalId: "hangout", label: "Hang Out", icon: "🎲", noun: "hangout" },
  { type: "events", canonicalId: "events", label: "Events", icon: "🎉", noun: "event" },
  { type: "meet", canonicalId: "meet-someone", label: "Just Meet Someone", icon: "👋", noun: "person" },
];

const BY_TYPE = new Map(DEFAULT_ACTIVITIES.map((activity) => [activity.type, activity]));
const BY_CANONICAL_ID = new Map(DEFAULT_ACTIVITIES.map((activity) => [activity.canonicalId, activity]));

function titleCase(id: string): string {
  const cleaned = id.replace(/[-_]+/g, " ").trim();
  if (!cleaned) return "Activity";
  return cleaned.replace(/\b\w/g, (char) => char.toUpperCase());
}

function genericMeta(id: string): ActivityMeta {
  const label = titleCase(id);
  return { type: id, canonicalId: id, label, icon: "✨", noun: label.toLowerCase() };
}

/** Looks up display metadata for a route `:type` param, falling back to a
 * generic entry so an unexpected slug still renders something sensible. */
export function metaForType(type: string | undefined): ActivityMeta {
  if (!type) return genericMeta("activity");
  return BY_TYPE.get(type) ?? genericMeta(type);
}

/** Maps a canonical activity id (as returned by api.getSuggestions) to
 * display metadata, falling back to a generic entry for ids outside the
 * curated default list above. */
export function metaForCanonicalId(id: string): ActivityMeta {
  return BY_CANONICAL_ID.get(id) ?? genericMeta(id);
}

const HOME_GRID_SIZE = 8;

/** Always 8 tiles: suggested ids first, then the curated defaults. */
export function fillHomeActivities(preferredIds: string[]): ActivityMeta[] {
  const out: ActivityMeta[] = [];
  const seen = new Set<string>();

  const push = (meta: ActivityMeta) => {
    if (seen.has(meta.type) || seen.has(meta.canonicalId)) return;
    seen.add(meta.type);
    seen.add(meta.canonicalId);
    out.push(meta);
  };

  for (const id of preferredIds) {
    push(metaForCanonicalId(id));
    if (out.length === HOME_GRID_SIZE) return out;
  }
  for (const activity of DEFAULT_ACTIVITIES) {
    push(activity);
    if (out.length === HOME_GRID_SIZE) return out;
  }
  return out;
}

interface ActivityButtonGridProps {
  activities: ActivityMeta[];
  onSelect: (activity: ActivityMeta) => void;
}

export default function ActivityButtonGrid({ activities, onSelect }: ActivityButtonGridProps) {
  return (
    <div className="grid grid-cols-4 gap-3">
      {activities.map((activity) => {
        const Glyph = ACTIVITY_ICONS[activity.type];
        return (
          <button
            key={activity.type}
            type="button"
            onClick={() => onSelect(activity)}
            className="pressable flex flex-col items-center gap-1.5 rounded-[14px] border border-line bg-card px-2 py-3 text-center hover:border-primary hover:text-primary"
          >
            {Glyph ? <Glyph className="h-6 w-6 text-primary" /> : <SparkIcon className="h-6 w-6 text-primary" />}
            <span className="text-[11px] font-medium leading-tight text-ink">{activity.label}</span>
          </button>
        );
      })}
    </div>
  );
}
