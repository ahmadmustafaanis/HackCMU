import type { Student } from "shared-types";
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

interface SessionState {
  student: Student | null;
  sessionToken: string | null;
  setSession: (student: Student, token: string) => void;
  updateStudent: (student: Student) => void;
  clearSession: () => void;
}

const SessionContext = createContext<SessionState | null>(null);

const STORAGE_KEY = "scottys-circle:session";

export function SessionProvider({ children }: { children: ReactNode }) {
  const [student, setStudent] = useState<Student | null>(null);
  const [sessionToken, setSessionToken] = useState<string | null>(null);

  useEffect(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw) as { student: Student; sessionToken: string };
      setStudent(parsed.student);
      setSessionToken(parsed.sessionToken);
    } catch {
      localStorage.removeItem(STORAGE_KEY);
    }
  }, []);

  const setSession = (nextStudent: Student, token: string) => {
    setStudent(nextStudent);
    setSessionToken(token);
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
    localStorage.removeItem(STORAGE_KEY);
  };

  return (
    <SessionContext.Provider value={{ student, sessionToken, setSession, updateStudent, clearSession }}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSession(): SessionState {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error("useSession must be used within a SessionProvider");
  return ctx;
}
