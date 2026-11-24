import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import type { AuthResponse, User } from "@enishi/shared";
import { setUnauthorizedHandler, tokenStore } from "./api";

const USER_KEY = "enishi.user";

interface Session {
  user: User | null;
  /** True when the last session ended because the token expired. */
  expired: boolean;
  signIn: (auth: AuthResponse) => void;
  signOut: () => void;
}

const SessionContext = createContext<Session | null>(null);

const readUser = (): User | null => {
  if (!tokenStore.get()) return null;
  try { return JSON.parse(localStorage.getItem(USER_KEY) ?? "null"); } catch { return null; }
};

export function SessionProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(readUser);
  const [expired, setExpired] = useState(false);

  const signIn = useCallback((auth: AuthResponse) => {
    tokenStore.set(auth.accessToken);
    try { localStorage.setItem(USER_KEY, JSON.stringify(auth.user)); } catch { /* ignore */ }
    setExpired(false);
    setUser(auth.user);
  }, []);

  const signOut = useCallback(() => {
    tokenStore.clear();
    try { localStorage.removeItem(USER_KEY); } catch { /* ignore */ }
    setUser(null);
  }, []);

  useEffect(() => {
    setUnauthorizedHandler(() => { signOut(); setExpired(true); });
  }, [signOut]);

  return (
    <SessionContext.Provider value={{ user, expired, signIn, signOut }}>
      {children}
    </SessionContext.Provider>
  );
}

export function useSession() {
  const s = useContext(SessionContext);
  if (!s) throw new Error("useSession must be used inside SessionProvider");
  return s;
}
