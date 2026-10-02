"use client";

import { useAuth } from "@/features/auth/auth-provider";
import { hasPermission } from "@/lib/permissions";

export function PermissionGate({ permission, children, fallback = null }: { permission: string; children: React.ReactNode; fallback?: React.ReactNode }) {
  const { user } = useAuth();
  return hasPermission(user, permission) ? children : fallback;
}