import { useAuth0 } from "@auth0/auth0-react";
import { useNavigate } from "react-router-dom";
import { useSession } from "../state/session";
import TabBar from "../components/TabBar";

const SETTINGS_ROWS = [
  { label: "Edit Profile", icon: "✏️" },
  { label: "Privacy Settings", icon: "🔒" },
  { label: "Location Settings", icon: "📍" },
];

function ChipGroup({ title, items }: { title: string; items: string[] }) {
  if (items.length === 0) return null;
  return (
    <div className="flex flex-col gap-2">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted">{title}</p>
      <div className="flex flex-wrap gap-2">
        {items.map((item) => (
          <span key={item} className="rounded-full border border-line bg-card px-3 py-1 text-xs font-medium text-ink">
            {item}
          </span>
        ))}
      </div>
    </div>
  );
}

export default function Profile() {
  const { student, provider, clearSession } = useSession();
  const { logout: auth0Logout } = useAuth0();
  const navigate = useNavigate();

  const handleReset = () => {
    const wasAuth0 = provider === "auth0";
    clearSession();
    // A signed-in Auth0 session is Auth0's OWN SSO cookie, independent of
    // our app session — clearSession() alone leaves it intact, so landing
    // back on Welcome would silently re-authenticate via that lingering
    // session instead of actually signing the user out. A real Auth0
    // logout (full-page redirect) is the only way to end it. Checked via
    // our OWN tracked `provider`, not useAuth0().isAuthenticated — that
    // resets to false across a full page reload whenever this tenant's
    // silent re-auth check can't complete without user interaction, even
    // though the Auth0 session itself is still alive.
    if (wasAuth0) {
      auth0Logout({ logoutParams: { returnTo: window.location.origin } });
    } else {
      navigate("/");
    }
  };

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="flex flex-1 flex-col gap-5 overflow-y-auto p-4">
        <h1 className="text-xl font-semibold text-ink">Profile</h1>

        {!student && (
          <p className="rounded-2xl border border-line bg-card p-4 text-center text-sm text-muted">
            You're not signed in yet.
          </p>
        )}

        {student && (
          <>
            <div className="flex flex-col items-center gap-3 rounded-3xl border border-line bg-card p-6 text-center shadow-sm">
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/10 text-2xl font-semibold text-primary">
                {student.initials}
              </div>
              <div>
                <p className="text-lg font-semibold text-ink">{student.name}</p>
                <p className="text-sm text-muted">
                  {student.program} · {student.year}
                </p>
              </div>
              {student.bio && <p className="text-sm text-ink/80">{student.bio}</p>}
              <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-xs text-muted">
                <span>📍 {student.approximateLocation}</span>
                <span>🚶 {student.walkingMinutes} min walk</span>
              </div>
            </div>

            <div className="flex flex-col gap-4 rounded-3xl border border-line bg-card p-5 shadow-sm">
              <ChipGroup title="Interests" items={student.interests} />
              <ChipGroup title="Vibes" items={student.vibes} />
              <ChipGroup title="Availability" items={[student.availabilityLabel]} />
            </div>
          </>
        )}

        <div className="flex flex-col overflow-hidden rounded-3xl border border-line bg-card shadow-sm">
          {SETTINGS_ROWS.map((row, idx) => (
            <div
              key={row.label}
              className={`flex cursor-default items-center gap-3 px-4 py-3 text-sm text-ink ${
                idx !== 0 ? "border-t border-line" : ""
              }`}
            >
              <span className="text-base">{row.icon}</span>
              <span className="flex-1">{row.label}</span>
              <span className="text-muted">›</span>
            </div>
          ))}
          <button
            type="button"
            onClick={handleReset}
            className="flex items-center gap-3 border-t border-line px-4 py-3 text-left text-sm font-medium text-primary"
          >
            <span className="text-base">↺</span>
            <span className="flex-1">Reset Demo</span>
          </button>
        </div>
      </div>
      <TabBar />
    </div>
  );
}
