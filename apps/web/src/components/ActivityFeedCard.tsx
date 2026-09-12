import type { Activity } from "shared-types";

const STATUS_STYLES: Record<Activity["status"], string> = {
  open: "bg-primary/10 text-primary",
  joined: "bg-primary text-white",
  completed: "bg-line text-muted",
};

const STATUS_LABEL: Record<Activity["status"], string> = {
  open: "Open",
  joined: "Joined",
  completed: "Completed",
};

interface ActivityFeedCardProps {
  activity: Activity;
}

export default function ActivityFeedCard({ activity }: ActivityFeedCardProps) {
  const spotsLeft = Math.max(activity.capacity - activity.attendeeCount, 0);

  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-line bg-card p-4 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold text-ink">{activity.title}</p>
          <p className="text-xs text-muted">{activity.type}</p>
        </div>
        <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-medium ${STATUS_STYLES[activity.status]}`}>
          {STATUS_LABEL[activity.status]}
        </span>
      </div>

      {activity.description && <p className="line-clamp-2 text-sm text-ink/80">{activity.description}</p>}

      <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted">
        <span>📍 {activity.approximateLocation}</span>
        <span>🕒 {activity.timeLabel}</span>
        <span>🚶 {activity.walkingMinutes} min</span>
      </div>

      <div className="flex items-center justify-between pt-1">
        <span className="rounded-full border border-line px-2.5 py-1 text-[11px] font-medium text-muted">
          {activity.vibe}
        </span>
        <span className="text-xs text-muted">
          {activity.attendeeCount}/{activity.capacity} joined
          {activity.status === "open" && spotsLeft > 0 ? ` · ${spotsLeft} spot${spotsLeft === 1 ? "" : "s"} left` : ""}
        </span>
      </div>
    </div>
  );
}
