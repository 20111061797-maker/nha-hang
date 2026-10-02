import type { UserProfile } from "@/types/api";

export function hasPermission(user: UserProfile | null, permission: string) {
  return user?.permissions.includes(permission) ?? false;
}