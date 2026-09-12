import { useState, type FormEvent } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import type { StructuredIntentInput } from "shared-types";
import { useSession } from "../state/session";
import buildings from "../config/buildings.json";

function localDateTime(time?: string): string {
  const relative = time?.match(/^in (\d+) (minute|hour)s?$/);
  const date = relative
    ? new Date(Date.now() + Number(relative[1]) * (relative[2] === "hour" ? 60 : 1) * 60_000)
    : time ? new Date(time) : new Date(Date.now() + 30 * 60_000);
  if (Number.isNaN(date.getTime()) || date.getTime() < Date.now()) return "";
  return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16);
}

export default function CreateActivity() {
  const location = useLocation();
  const navigate = useNavigate();
  const { student } = useSession();
  const [draft] = useState<StructuredIntentInput>(() => location.state?.intent ?? { activityIds: [], locationIds: [] });
  const [title, setTitle] = useState(draft.title ?? draft.text ?? draft.activityIds[0] ?? "");
  const [description, setDescription] = useState(draft.description ?? "");
  const [locationId, setLocationId] = useState(draft.locationIds[0] ?? "");
  const [locationQuery, setLocationQuery] = useState(() => buildings.find(b => b.id === draft.locationIds[0])?.label ?? "");
  const matchingLocations = buildings.filter(b => `${b.label} ${b.id}`.toLowerCase().includes(locationQuery.trim().toLowerCase()));
  const [start, setStart] = useState(() => localDateTime(draft.time));
  const [when, setWhen] = useState(() => localDateTime(draft.time) ? "scheduled" : "now");
  const [capacity, setCapacity] = useState(draft.capacity ?? 4);
  const [duration, setDuration] = useState(draft.durationMinutes ?? 60);
  const [error, setError] = useState("");
  const fieldClass = "mt-1 w-full rounded-xl border border-line bg-card px-3 py-3 text-sm text-ink";

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!student) return;
    const date = when === "now" ? new Date() : new Date(start);
    if (!title.trim() || !locationId || Number.isNaN(date.getTime()) || (when !== "now" && date.getTime() <= Date.now())) {
      setError("Add a title, choose a location, and select a future start time or Now.");
      return;
    }
    const intent: StructuredIntentInput = {
      ...draft,
      text: draft.text || title.trim(),
      title: title.trim(), description: description.trim(),
      time: date.toISOString(), locationIds: [locationId], capacity, durationMinutes: duration,
    };
    const payload = { userId: student.id, intent, mode: "create" };
    try { sessionStorage.setItem("scottys-circle:pendingMatch", JSON.stringify(payload)); } catch { /* Navigation also carries the draft. */ }
    navigate("/matching", { state: payload });
  }

  return (
    <div className="flex flex-1 flex-col p-5">
      <button type="button" onClick={() => navigate(-1)} className="mb-4 self-start text-sm text-muted">← Back</button>
      <h1 className="text-xl font-semibold text-ink">Start a new activity</h1>
      <p className="mt-1 text-sm text-muted">Set the details so others know when and where to join you.</p>
      <form onSubmit={submit} className="mt-5 flex flex-col gap-4">
        <label className="text-sm font-medium text-ink">Activity name
          <input required maxLength={100} value={title} onChange={e => setTitle(e.target.value)} placeholder="Coffee and a study break" className={fieldClass} />
        </label>
        <div>
          <label className="text-sm font-medium text-ink" htmlFor="location-search">Location</label>
          <input id="location-search" required autoComplete="off" value={locationQuery}
            onChange={e => {
              setLocationQuery(e.target.value);
              const exact = buildings.find(b => b.label.toLowerCase() === e.target.value.trim().toLowerCase() || b.id === e.target.value.trim().toLowerCase());
              setLocationId(exact?.id ?? "");
            }}
            placeholder="Type a campus location, e.g. Hunt or Gates" className={fieldClass} />
          {!locationId && <div className="mt-2 flex max-h-40 flex-col gap-1 overflow-y-auto" aria-label="Matching campus locations">
            {matchingLocations.map(building => <button key={building.id} type="button"
              onClick={() => { setLocationId(building.id); setLocationQuery(building.label); }}
              className="rounded-lg border border-line px-3 py-2 text-left text-sm text-ink hover:border-primary">{building.label}</button>)}
            {matchingLocations.length === 0 && <p className="text-xs text-muted">No campus location found. Try a building name and add the room or meeting point in Details below.</p>}
          </div>}
          {locationId && <p className="mt-1 text-xs text-primary">✓ {buildings.find(b => b.id === locationId)?.label} selected</p>}
        </div>
        <label className="text-sm font-medium text-ink">When
          <select value={when} onChange={e => setWhen(e.target.value)} className={fieldClass}>
            <option value="now">Now</option><option value="scheduled">Choose date and time</option>
          </select>
        </label>
        {when === "scheduled" && <label className="text-sm font-medium text-ink">Start date and time
          <input required type="datetime-local" value={start} onChange={e => setStart(e.target.value)} className={fieldClass} />
        </label>}
        <label className="text-sm font-medium text-ink">Duration (minutes)
          <input required type="number" min={15} max={480} step={1} value={duration} onChange={e => setDuration(Number(e.target.value))} className={fieldClass} />
        </label>
        <label className="text-sm font-medium text-ink">Participant limit
          <input required type="number" min={2} max={100} step={1} value={capacity} onChange={e => setCapacity(Number(e.target.value))} className={fieldClass} />
          <span className="mt-1 block text-xs font-normal text-muted">Includes you. Choose 2–100 people; others can join until it fills up.</span>
        </label>
        <label className="text-sm font-medium text-ink">Details (optional)
          <textarea maxLength={1000} rows={3} value={description} onChange={e => setDescription(e.target.value)} placeholder="Where to meet, what to bring, or anything else to know" className={fieldClass} />
        </label>
        {error && <p role="alert" className="text-sm text-primary">{error}</p>}
        <button type="submit" className="rounded-full bg-primary px-4 py-3 text-sm font-semibold text-white">Create activity</button>
      </form>
    </div>
  );
}
