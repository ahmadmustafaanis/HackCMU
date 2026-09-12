import type { Student } from "shared-types";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { api, setAuthToken } from "../api/client";

/** Which sign-in path established the current session. Tracked client-side
 * (not part of the `Student` API contract) purely so logout can decide
 * whether an Auth0 SSO cookie also needs clearing — `useAuth0().isAuthenticated`
 * isn't a reliable signal for that: it resets to false across a full page
 * reload whenever this tenant's silent re-auth check can't complete without
 * user interaction (e.g. consent isn't skipped), even though the Auth0
 * session itself is still alive. */
export type AuthProvider = "google" | "auth0" | "demo";

interface SessionState {
  student: Student | null;
  sessionToken: string | null;
  provider: AuthProvider | null;
  /** True while restoring/validating a session found in localStorage — the
   * caller should show a neutral loading state rather than flashing the
   * signed-out (Welcome) screen for a moment. */
  restoring: boolean;
  setSession: (student: Student, token: string, provider: AuthProvider) => void;
  updateStudent: (student: Student) => void;
  clearSession: () => void;
}

const SessionContext = createContext<SessionState | null>(null);

const STORAGE_KEY = "scottys-circle:session";

export function SessionProvider({ children }: { children: ReactNode }) {
  const [student, setStudent] = useState<Student | null>(null);
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [provider, setProvider] = useState<AuthProvider | null>(null);
  const [restoring, setRestoring] = useState(true);

  useEffect(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      setRestoring(false);
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const parsed = JSON.parse(raw) as { student: Student; sessionToken: string; provider?: AuthProvider };
        // Don't just trust what's cached — verify the token against the
        // server (it may have expired, or the user may have been removed)
        // and refresh the profile in case it changed elsewhere.
        setAuthToken(parsed.sessionToken);
        const freshStudent = await api.getMe();
        if (cancelled) return;
        setStudent(freshStudent);
        setSessionToken(parsed.sessionToken);
        setProvider(parsed.provider ?? null);
        localStorage.setItem(
          STORAGE_KEY,
          JSON.stringify({ student: freshStudent, sessionToken: parsed.sessionToken, provider: parsed.provider ?? null })
        );
      } catch {
        if (cancelled) return;
        setAuthToken(null);
        localStorage.removeItem(STORAGE_KEY);
      } finally {
        if (!cancelled) setRestoring(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const setSession = (nextStudent: Student, token: string, nextProvider: AuthProvider) => {
    setStudent(nextStudent);
    setSessionToken(token);
    setProvider(nextProvider);
    setAuthToken(token);
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ student: nextStudent, sessionToken: token, provider: nextProvider }));
  };

  const updateStudent = (nextStudent: Student) => {
    setStudent(nextStudent);
    if (sessionToken) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ student: nextStudent, sessionToken, provider }));
    }
  };

  const clearSession = () => {
    setStudent(null);
    setSessionToken(null);
    setProvider(null);
    setAuthToken(null);
    localStorage.removeItem(STORAGE_KEY);
  };

  return (
    <SessionContext.Provider value={{ student, sessionToken, provider, restoring, setSession, updateStudent, clearSession }}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSession(): SessionState {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession must be used within a SessionProvider");
  return ctx;
}
