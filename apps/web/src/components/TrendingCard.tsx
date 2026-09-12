import type { Activity } from "shared-types";

export default function TrendingCard({ activity, onClick }: { activity: Activity; onClick?: () => void }) {
  return (
    <button type="button" onClick={onClick} className="flex w-40 shrink-0 flex-col gap-2 rounded-2xl border border-line bg-card p-3 text-left shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
          {activity.vibe}
        </span>
        <span className="shrink-0 text-[11px] text-muted">{activity.timeLabel}</span>
      </div>
      <p className="line-clamp-2 text-sm font-semibold leading-snug text-ink">{activity.title}</p>
      <p className="line-clamp-1 text-xs text-muted">{activity.approximateLocation}</p>
      <p className="mt-auto text-xs font-medium text-ink">
        {activity.attendeeCount} going
      </p>
    </button>
  );
}
