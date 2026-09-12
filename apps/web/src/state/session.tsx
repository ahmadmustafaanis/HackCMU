import type { Student } from "shared-types";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { api, setAuthToken } from "../api/client";

interface SessionState {
  student: Student | null;
  sessionToken: string | null;
  /** True while restoring/validating a session found in localStorage — the
   * caller should show a neutral loading state rather than flashing the
   * signed-out (Welcome) screen for a moment. */
  restoring: boolean;
  setSession: (student: Student, token: string) => void;
  updateStudent: (student: Student) => void;
  clearSession: () => void;
}

const SessionContext = createContext<SessionState | null>(null);

const STORAGE_KEY = "scottys-circle:session";

export function SessionProvider({ children }: { children: ReactNode }) {
  const [student, setStudent] = useState<Student | null>(null);
  const [sessionToken, setSessionToken] = useState<string | null>(null);
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
        const parsed = JSON.parse(raw) as { student: Student; sessionToken: string };
        // Don't just trust what's cached — verify the token against the
        // server (it may have expired, or the user may have been removed)
        // and refresh the profile in case it changed elsewhere.
        setAuthToken(parsed.sessionToken);
        const freshStudent = await api.getMe();
        if (cancelled) return;
        setStudent(freshStudent);
        setSessionToken(parsed.sessionToken);
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ student: freshStudent, sessionToken: parsed.sessionToken }));
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

  const setSession = (nextStudent: Student, token: string) => {
    setStudent(nextStudent);
    setSessionToken(token);
    setAuthToken(token);
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ student: nextStudent, sessionToken: token }));
  };

  const updateStudent = (nextStudent: Student) => {
    setStudent(nextStudent);
    if (sessionToken) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ student: nextStudent, sessionToken }));
    }
  };

  const clearSession = () => {
    setStudent(null);
    setSessionToken(null);
    setAuthToken(null);
    localStorage.removeItem(STORAGE_KEY);
  };

  return (
    <SessionContext.Provider value={{ student, sessionToken, restoring, setSession, updateStudent, clearSession }}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSession(): SessionState {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession must be used within a SessionProvider");
  return ctx;
}
