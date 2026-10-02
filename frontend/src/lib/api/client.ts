import { config } from "@/lib/config";
import { clearSession, readSession, writeSession } from "@/lib/auth/storage";
import type { ApiError, ApiProblem, AuthResult } from "@/types/api";

type RequestOptions = Omit<RequestInit, "body"> & { body?: unknown; skipRefresh?: boolean };

async function parseProblem(response: Response): Promise<ApiProblem | undefined> {
  try {
    return (await response.json()) as ApiProblem;
  } catch {
    return undefined;
  }
}

function makeApiError(response: Response, problem?: ApiProblem): ApiError {
  const message = problem?.detail ?? problem?.message ?? problem?.title ?? `Request failed (${response.status})`;
  const error = new Error(message) as ApiError;
  error.status = response.status;
  error.problem = problem;
  return error;
}

async function refreshAccessToken(): Promise<boolean> {
  const session = readSession();
  if (!session?.refreshToken) return false;
  const response = await fetch(`${config.apiUrl}/api/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refreshToken: session.refreshToken }),
  });
  if (!response.ok) {
    clearSession();
    return false;
  }
  writeSession((await response.json()) as AuthResult);
  return true;
}

export async function apiRequest<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const session = readSession();
  const headers = new Headers(options.headers);
  headers.set("Accept", "application/json");
  if (options.body !== undefined) headers.set("Content-Type", "application/json");
  if (session?.accessToken) headers.set("Authorization", `Bearer ${session.accessToken}`);

  const response = await fetch(`${config.apiUrl}${path}`, {
    ...options,
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
  });

  if (response.status === 401 && !options.skipRefresh && session?.refreshToken) {
    if (await refreshAccessToken()) return apiRequest<T>(path, { ...options, skipRefresh: true });
    clearSession();
  }

  if (!response.ok) throw makeApiError(response, await parseProblem(response));
  if (response.status === 204) return undefined as T;
  return (await response.json()) as T;
}