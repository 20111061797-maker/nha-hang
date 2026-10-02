import type { AuthResult, UserProfile } from "@/types/api";

const AUTH_KEY = "restaurant-management.auth";

export type AuthSession = Pick<AuthResult, "accessToken" | "refreshToken" | "expiresAt"> & {
  user: UserProfile;
};

export function readSession(): AuthSession | null {
  if (typeof window === "undefined") return null;
  const raw = window.localStorage.getItem(AUTH_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AuthSession;
  } catch {
    window.localStorage.removeItem(AUTH_KEY);
    return null;
  }
}

export function writeSession(result: AuthResult): AuthSession {
  const session: AuthSession = {
    accessToken: result.accessToken,
    refreshToken: result.refreshToken,
    expiresAt: result.expiresAt,
    user: result.user,
  };
  window.localStorage.setItem(AUTH_KEY, JSON.stringify(session));
  return session;
}

export function clearSession() {
  if (typeof window !== "undefined") window.localStorage.removeItem(AUTH_KEY);
}