import { useNavigate } from "react-router-dom";

export default function Success() {
  const navigate = useNavigate();

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6 p-6 text-center">
      <div className="text-6xl">🎉</div>
      <div className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold text-ink">You made a new connection!</h1>
        <p className="text-sm text-muted">
          Nice work — that's another Scotty added to your circle. Keep the momentum going.
        </p>
      </div>
      <div className="text-3xl">✨ 🐾 ✨</div>

      <div className="mt-4 flex w-full flex-col gap-3">
        <button
          type="button"
          onClick={() => navigate("/connections")}
          className="w-full rounded-2xl bg-primary py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-primary-dark"
        >
          Connect
        </button>
        <button
          type="button"
          onClick={() => navigate("/home")}
          className="w-full rounded-2xl border border-line bg-card py-3 text-sm font-semibold text-ink transition hover:border-primary-light"
        >
          Maybe Later
        </button>
      </div>
    </div>
  );
}
