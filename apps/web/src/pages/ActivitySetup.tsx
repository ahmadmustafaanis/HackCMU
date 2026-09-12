import { useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import type { StructuredIntentInput } from "shared-types";
import { metaForType } from "../components/ActivityButtonGrid";
import { useSession } from "../state/session";

/** sessionStorage key Matching.tsx reads the stashed intent back from —
 * kept in sync with the same constant there. */
const PENDING_MATCH_KEY = "scottys-circle:pendingMatch";

interface PresetOption {
  id: string;
  label: string;
  text: string;
}

const PRESETS: PresetOption[] = [
  { id: "meet", label: "Meet Someone New", text: "meet someone new" },
  { id: "duo", label: "Grab coffee with one person", text: "grab coffee with one person" },
  { id: "group", label: "Join a small group", text: "join a small group" },
];

type TimeOptionId = "now" | "30min" | "1hr" | "later";

const TIME_OPTIONS: { id: TimeOptionId; label: string }[] = [
  { id: "now", label: "Now" },
  { id: "30min", label: "30 minutes" },
  { id: "1hr", label: "1 hour" },
  { id: "later", label: "Later" },
];

interface LocationOption {
  id: string;
  label: string;
}

const LOCATIONS: LocationOption[] = [
  { id: "cohon-university-center", label: "Near CUC" },
  { id: "tepper-quad", label: "Tepper" },
  { id: "gates-hillman", label: "Gates" },
  { id: "hunt-library", label: "Hunt" },
  { id: "anywhere", label: "Anywhere" },
];

function buildTimeString(option: TimeOptionId, laterValue: string): string | undefined {
  switch (option) {
    case "now":
      return new Date().toISOString();
    case "30min":
      return "in 30 minutes";
    case "1hr":
      return "in 1 hour";
    case "later":
      return laterValue ? new Date(laterValue).toISOString() : undefined;
    default:
      return undefined;
  }
}

export default function ActivitySetup() {
  const { type } = useParams<{ type: string }>();
  const meta = useMemo(() => metaForType(type), [type]);
  const navigate = useNavigate();
  const { student } = useSession();

  const [step, setStep] = useState<1 | 2>(1);
  const [presetId, setPresetId] = useState<string | null>(null);
  const [freeText, setFreeText] = useState("");

  const [timeOption, setTimeOption] = useState<TimeOptionId>("now");
  const [laterValue, setLaterValue] = useState("");
  const [locationId, setLocationId] = useState("anywhere");

  if (!student) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 text-center">
        <p className="text-base font-medium text-ink">Sign in to keep going</p>
        <Link to="/login" className="text-sm font-medium text-primary">
          Go to sign in
        </Link>
      </div>
    );
  }

  const handleSubmit = (mode: "match" | "create" = "match") => {
    const preset = PRESETS.find((p) => p.id === presetId);
    const text = [preset?.text, freeText.trim()].filter(Boolean).join("; ") || undefined;
    const time = buildTimeString(timeOption, laterValue);

    const intent: StructuredIntentInput = {
      activityIds: [meta.canonicalId],
      text,
      time,
      locationIds: locationId === "anywhere" ? [] : [locationId],
    };
    const payload = { userId: student.id, intent, mode };

    try {
      sessionStorage.setItem(PENDING_MATCH_KEY, JSON.stringify(payload));
    } catch {
      // sessionStorage can throw in locked-down environments — navigation
      // state below still carries the payload either way.
    }
    navigate(mode === "create" ? "/activity/new" : "/matching", { state: payload });
  };

  return (
    <div className="flex flex-1 flex-col px-5 py-6">
      <div className="mb-6 flex items-center gap-3">
        <button
          type="button"
          onClick={() => (step === 1 ? navigate(-1) : setStep(1))}
          className="flex h-9 w-9 items-center justify-center rounded-full border border-line text-ink"
          aria-label="Back"
        >
          ←
        </button>
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-muted">
            Step {step} of 2
          </p>
          <h1 className="text-lg font-semibold text-ink">
            {meta.icon} {meta.label}
          </h1>
        </div>
      </div>

      {step === 1 ? (
        <div className="flex flex-1 flex-col gap-5">
          <h2 className="text-xl font-semibold text-ink">
            What kind of {meta.noun} are you looking for?
          </h2>

          <div className="flex flex-col gap-3">
            {PRESETS.map((preset) => {
              const selected = presetId === preset.id;
              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => setPresetId(selected ? null : preset.id)}
                  className={`flex items-center gap-3 rounded-2xl border px-4 py-3 text-left transition ${
                    selected
                      ? "border-primary bg-primary/5"
                      : "border-line bg-card"
                  }`}
                >
                  <span
                    className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 ${
                      selected ? "border-primary bg-primary" : "border-line"
                    }`}
                  >
                    {selected && <span className="h-2 w-2 rounded-full bg-white" />}
                  </span>
                  <span className="text-sm font-medium text-ink">{preset.label}</span>
                </button>
              );
            })}
          </div>

          <div className="flex flex-col gap-2">
            <label htmlFor="free-text" className="text-sm font-medium text-ink">
              Something more specific?
            </label>
            <input
              id="free-text"
              type="text"
              value={freeText}
              onChange={(e) => setFreeText(e.target.value)}
              placeholder='e.g. "work on my robotics project"'
              className="rounded-xl border border-line bg-card px-4 py-3 text-sm text-ink placeholder:text-muted focus:border-primary focus:outline-none"
            />
          </div>

          <button
            type="button"
            onClick={() => setStep(2)}
            className="mt-auto w-full rounded-full bg-primary px-4 py-3 text-sm font-semibold text-white shadow-sm"
          >
            Continue
          </button>
        </div>
      ) : (
        <div className="flex flex-1 flex-col gap-6">
          <div>
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">
              When?
            </h2>
            <div className="grid grid-cols-2 gap-3">
              {TIME_OPTIONS.map((option) => {
                const selected = timeOption === option.id;
                return (
                  <button
                    key={option.id}
                    type="button"
                    onClick={() => setTimeOption(option.id)}
                    className={`rounded-xl border px-4 py-3 text-sm font-medium transition ${
                      selected
                        ? "border-primary bg-primary/5 text-primary"
                        : "border-line bg-card text-ink"
                    }`}
                  >
                    {option.label}
                  </button>
                );
              })}
            </div>
            {timeOption === "later" && (
              <input
                type="datetime-local"
                value={laterValue}
                onChange={(e) => setLaterValue(e.target.value)}
                className="mt-3 w-full rounded-xl border border-line bg-card px-4 py-3 text-sm text-ink focus:border-primary focus:outline-none"
              />
            )}
          </div>

          <div>
            <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted">
              Where?
            </h2>
            <div className="flex flex-wrap gap-2">
              {LOCATIONS.map((location) => {
                const selected = locationId === location.id;
                return (
                  <button
                    key={location.id}
                    type="button"
                    onClick={() => setLocationId(location.id)}
                    className={`rounded-full border px-4 py-2 text-sm font-medium transition ${
                      selected
                        ? "border-primary bg-primary text-white"
                        : "border-line bg-card text-ink"
                    }`}
                  >
                    {location.label}
                  </button>
                );
              })}
            </div>
          </div>

          <button
            type="button"
            onClick={() => handleSubmit()}
            disabled={timeOption === "later" && !laterValue}
            className="mt-auto w-full rounded-full bg-primary px-4 py-3 text-sm font-semibold text-white shadow-sm disabled:opacity-50"
          >
            Find my match
          </button>
          <button type="button" onClick={() => handleSubmit("create")} disabled={timeOption === "later" && !laterValue} className="w-full rounded-full border border-primary px-4 py-3 text-sm font-semibold text-primary disabled:opacity-50">
            Start a new activity
          </button>
        </div>
      )}
    </div>
  );
}
