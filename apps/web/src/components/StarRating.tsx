import type { StarScore } from "shared-types";
import { StarIcon } from "./Icons";

interface StarRatingProps {
  value: number;
  onChange?: (score: StarScore) => void;
  size?: "sm" | "md";
  readOnly?: boolean;
}

const SCORES: StarScore[] = [1, 2, 3, 4, 5];

export default function StarRating({ value, onChange, size = "md", readOnly = false }: StarRatingProps) {
  const px = size === "sm" ? "h-4 w-4" : "h-7 w-7";
  return (
    <div className="flex items-center gap-0.5" role={readOnly ? "img" : "group"} aria-label={`${value} out of 5 stars`}>
      {SCORES.map((score) => {
        const filled = score <= value;
        if (readOnly || !onChange) {
          return (
            <StarIcon
              key={score}
              filled={filled}
              className={`${px} ${filled ? "text-primary" : "text-line"}`}
            />
          );
        }
        return (
          <button
            key={score}
            type="button"
            onClick={() => onChange(score)}
            aria-label={`${score} star${score === 1 ? "" : "s"}`}
            aria-pressed={score === value}
            className={`pressable rounded-md p-0.5 ${filled ? "text-primary" : "text-line hover:text-primary/60"}`}
          >
            <StarIcon filled={filled} className={px} />
          </button>
        );
      })}
    </div>
  );
}

export function RatingBadge({ average, count }: { average?: number; count?: number }) {
  if (!count || count <= 0 || average == null) {
    return <p className="text-sm text-muted">No ratings yet</p>;
  }
  return (
    <div className="flex items-center gap-1.5 text-sm text-ink">
      <StarIcon filled className="h-4 w-4 text-primary" />
      <span className="font-semibold tabular-nums">{average.toFixed(1)}</span>
      <span className="text-muted">({count})</span>
    </div>
  );
}
