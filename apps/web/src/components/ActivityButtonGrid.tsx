/** Shared activity metadata + the Home screen's button grid.
 *
 * Exported so both Home.tsx (grid + trending) and ActivitySetup.tsx (step-1
 * heading) can agree on the same slug ↔ canonical-activity-id ↔ display
 * mapping without a third file. `type` is the URL-safe slug used in the
 * `/activity/:type/setup` route; `canonicalId` is what actually gets sent
 * to the backend as `intent.activityIds[0]` — the two differ for a couple
 * of entries so the route reads naturally ("gym") while the id sent to the
 * matching pipeline stays taxonomy-aligned ("workout").
 */

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

interface ActivityButtonGridProps {
  activities: ActivityMeta[];
  onSelect: (activity: ActivityMeta) => void;
}

export default function ActivityButtonGrid({ activities, onSelect }: ActivityButtonGridProps) {
  return (
    <div className="grid grid-cols-4 gap-3">
      {activities.map((activity) => (
        <button
          key={activity.type}
          type="button"
          onClick={() => onSelect(activity)}
          className="flex flex-col items-center gap-1.5 rounded-2xl border border-line bg-card px-2 py-3 text-center shadow-sm transition active:scale-95 active:bg-surface"
        >
          <span className="text-2xl leading-none">{activity.icon}</span>
          <span className="text-[11px] font-medium leading-tight text-ink">{activity.label}</span>
        </button>
      ))}
    </div>
  );
}
