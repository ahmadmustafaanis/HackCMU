import type { FeedbackRequest } from "shared-types";

export type FeedbackRating = FeedbackRequest["rating"];

const OPTIONS: { value: FeedbackRating; emoji: string; label: string }[] = [
  { value: "great", emoji: "😄", label: "Great" },
  { value: "good", emoji: "🙂", label: "Good" },
  { value: "okay", emoji: "😐", label: "Okay" },
];

interface FeedbackEmojiPickerProps {
  value: FeedbackRating | null;
  onChange: (rating: FeedbackRating) => void;
}

export default function FeedbackEmojiPicker({ value, onChange }: FeedbackEmojiPickerProps) {
  return (
    <div className="flex justify-center gap-4">
      {OPTIONS.map((opt) => {
        const selected = value === opt.value;
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            aria-pressed={selected}
            className={`flex w-24 flex-col items-center gap-2 rounded-2xl border py-4 transition ${
              selected
                ? "border-primary bg-primary/10 text-primary"
                : "border-line bg-card text-muted hover:border-primary-light"
            }`}
          >
            <span className="text-4xl leading-none">{opt.emoji}</span>
            <span className={`text-sm font-medium ${selected ? "text-primary" : "text-ink"}`}>{opt.label}</span>
          </button>
        );
      })}
    </div>
  );
}
