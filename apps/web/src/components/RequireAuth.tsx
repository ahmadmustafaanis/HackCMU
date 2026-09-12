import { Navigate, Outlet } from "react-router-dom";
import { useSession } from "../state/session";

/** Route guard for every screen that assumes a signed-in student (Home,
 * onboarding, matching, chat, profile, etc). Redirects to Welcome ("/") when
 * there's no verified session, instead of letting a page render with a null
 * student. Mirrors Welcome's own `restoring` check so a session being
 * restored/verified on load doesn't flash a redirect before it resolves. */
export default function RequireAuth() {
  const { student, restoring } = useSession();

  if (restoring) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-line border-t-primary" />
      </div>
    );
  }

  if (!student) return <Navigate to="/" replace />;

  return <Outlet />;
}
