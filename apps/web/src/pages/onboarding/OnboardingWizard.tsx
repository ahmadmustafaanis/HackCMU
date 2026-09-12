import { useState } from "react";
import { useNavigate } from "react-router-dom";
import type { Interest, Vibe } from "shared-types";
import Button from "../../components/Button";
import Card from "../../components/Card";
import OnboardingStepper from "../../components/OnboardingStepper";
import { api } from "../../api/client";
import { useSession } from "../../state/session";

const INTERESTS: Interest[] = [
  "AI",
  "Research",
  "Music",
  "Sports",
  "Gaming",
  "Art",
  "Startups",
  "Books",
  "Food",
  "Fitness",
  "Movies",
  "Photography",
  "Travel",
  "Coding",
  "Coffee",
];

const VIBES: Vibe[] = ["Social", "Curious", "Focused", "Chill", "Networking", "Casual"];
const VIBES_MAX = 3;

const AVAILABILITY: string[] = ["Morning", "Afternoon", "Evening", "Weekends"];

const STEP_TITLES = ["What are you into?", "What's your vibe?", "When are you free?"];
const STEP_SUBTITLES = [
  "Pick a few interests — this helps us find your people.",
  `Choose up to ${VIBES_MAX} that describe how you like to hang out.`,
  "Select the windows that usually work for you.",
];

export default function OnboardingWizard() {
  const navigate = useNavigate();
  const { student, updateStudent } = useSession();
  const [step, setStep] = useState(0);
  const [interests, setInterests] = useState<Interest[]>([]);
  const [vibes, setVibes] = useState<Vibe[]>([]);
  const [availability, setAvailability] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggleInterest = (value: Interest) => {
    setInterests((prev) => (prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]));
  };

  const toggleVibe = (value: Vibe) => {
    setVibes((prev) => (prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]));
  };

  const toggleAvailability = (value: string) => {
    setAvailability((prev) => (prev.includes(value) ? prev.filter((v) => v !== value) : [...prev, value]));
  };

  const canContinue = step === 0 ? interests.length > 0 : step === 1 ? vibes.length > 0 : availability.length > 0;

  const handleBack = () => {
    setError(null);
    setStep((s) => Math.max(0, s - 1));
  };

  const handleContinue = async () => {
    if (step < 2) {
      setStep((s) => s + 1);
      return;
    }
    if (!student) {
      setError("Session expired — please sign in again.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const result = await api.onboard({
        userId: student.id,
        interests,
        vibes,
        availabilityLabel: availability.join(", "),
      });
      updateStudent(result);
      navigate("/home");
    } catch {
      setError("Couldn't save your preferences. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (!student) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 p-6 text-center">
        <p className="text-lg font-medium text-ink">Let&apos;s get you signed in first</p>
        <p className="text-sm text-muted">We need a session before we can save your preferences.</p>
        <Button onClick={() => navigate("/")}>Back to Welcome</Button>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col gap-6 p-6">
      <div className="flex flex-col gap-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wide text-primary">Onboarding</span>
          <span className="text-xs font-medium text-muted">{step + 1}/3</span>
        </div>
        <div className="flex gap-1.5">
          {[0, 1, 2].map((i) => (
            <div key={i} className={`h-1.5 flex-1 rounded-full ${i <= step ? "bg-primary" : "bg-line"}`} />
          ))}
        </div>
      </div>

      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-bold text-ink">{STEP_TITLES[step]}</h1>
        <p className="text-sm text-muted">{STEP_SUBTITLES[step]}</p>
      </div>

      <Card className="flex-1">
        {step === 0 && <OnboardingStepper options={INTERESTS} selected={interests} onToggle={toggleInterest} />}
        {step === 1 && (
          <OnboardingStepper options={VIBES} selected={vibes} onToggle={toggleVibe} maxSelect={VIBES_MAX} />
        )}
        {step === 2 && (
          <OnboardingStepper options={AVAILABILITY} selected={availability} onToggle={toggleAvailability} />
        )}
      </Card>

      {error && <p className="text-sm text-primary">{error}</p>}

      <div className="flex gap-3">
        {step > 0 && (
          <Button variant="secondary" onClick={handleBack} className="flex-1" disabled={submitting}>
            Back
          </Button>
        )}
        <Button onClick={handleContinue} className="flex-1" disabled={!canContinue || submitting}>
          {step < 2 ? "Continue" : submitting ? "Saving…" : "Finish"}
        </Button>
      </div>
    </div>
  );
}
