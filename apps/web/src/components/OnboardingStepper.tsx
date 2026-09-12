/** Reusable chip multi-select grid used across the onboarding wizard steps
 * (interests, vibes, availability windows). Generic over any string union so
 * it can be parameterized for whichever option set a step needs. */
export interface OnboardingStepperProps<T extends string> {
  options: readonly T[];
  selected: T[];
  onToggle: (option: T) => void;
  /** Optional cap on how many options may be selected at once (e.g. vibes: 3). */
  maxSelect?: number;
}

export default function OnboardingStepper<T extends string>({
  options,
  selected,
  onToggle,
  maxSelect,
}: OnboardingStepperProps<T>) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((option) => {
        const isSelected = selected.includes(option);
        const atLimit = !!maxSelect && selected.length >= maxSelect && !isSelected;
        return (
          <button
            key={option}
            type="button"
            disabled={atLimit}
            onClick={() => onToggle(option)}
            aria-pressed={isSelected}
            className={
              isSelected
                ? "rounded-full border border-primary bg-primary px-4 py-2 text-sm font-medium text-white transition"
                : `rounded-full border border-line bg-card px-4 py-2 text-sm font-medium text-ink transition ${
                    atLimit ? "cursor-not-allowed opacity-40" : "hover:border-primary/50"
                  }`
            }
          >
            {option}
          </button>
        );
      })}
    </div>
  );
}
