import { apiRequest } from "@/lib/api/client";
import type { AuthResult, UserProfile } from "@/types/api";

export const authApi = {
  login: (usernameOrEmail: string, password: string) => apiRequest<AuthResult>("/api/auth/login", { method: "POST", body: { usernameOrEmail, password }, skipRefresh: true }),
  me: () => apiRequest<UserProfile>("/api/auth/me"),
  logout: (refreshToken: string) => apiRequest<void>("/api/auth/logout", { method: "POST", body: { refreshToken } }),
};