"use client";

import { authApi } from "@/lib/api/auth-api";
import { clearSession, readSession, writeSession, type AuthSession } from "@/lib/auth/storage";
import type { UserProfile } from "@/types/api";
import { createContext, useContext, useEffect, useMemo, useState } from "react";

type AuthContextValue = {
  user: UserProfile | null;
  session: AuthSession | null;
  isLoading: boolean;
  login: (usernameOrEmail: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true;
    void Promise.resolve().then(async () => {
      const existing = readSession();
      if (!existing) {
        if (active) setIsLoading(false);
        return;
      }
      try {
        const user = await authApi.me();
        if (active) setSession({ ...existing, user });
      } catch {
        clearSession();
        if (active) setSession(null);
      } finally {
        if (active) setIsLoading(false);
      }
    });
    return () => { active = false; };
  }, []);

  const value = useMemo<AuthContextValue>(() => ({
    user: session?.user ?? null,
    session,
    isLoading,
    async login(usernameOrEmail, password) {
      const next = writeSession(await authApi.login(usernameOrEmail, password));
      setSession(next);
    },
    async logout() {
      const refreshToken = session?.refreshToken;
      try {
        if (refreshToken) await authApi.logout(refreshToken);
      } finally {
        clearSession();
        setSession(null);
      }
    },
  }), [isLoading, session]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside AuthProvider");
  return context;
}