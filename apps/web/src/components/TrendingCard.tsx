import type { Activity } from "shared-types";

export default function TrendingCard({ activity, onClick }: { activity: Activity; onClick?: () => void }) {
  const content = (
    <>
      <div className="flex items-center justify-between gap-2">
        <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-semibold text-primary">
          {activity.vibe}
        </span>
        <span className="shrink-0 text-[11px] text-muted">{activity.timeLabel}</span>
      </div>
      <p className="line-clamp-2 font-display text-sm font-medium leading-snug text-ink">{activity.title}</p>
      <p className="line-clamp-1 text-xs text-muted">{activity.approximateLocation}</p>
      <p className="mt-auto text-xs font-medium text-ink">
        {activity.attendeeCount}/{activity.capacity} joined
      </p>
    </>
  );

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className="pressable flex w-40 shrink-0 flex-col gap-2 rounded-[14px] border border-line bg-card p-3 text-left hover:border-primary/50"
      >
        {content}
      </button>
    );
  }

  return (
    <div className="flex w-40 shrink-0 flex-col gap-2 rounded-[14px] border border-line bg-card p-3">
      {content}
    </div>
  );
}
