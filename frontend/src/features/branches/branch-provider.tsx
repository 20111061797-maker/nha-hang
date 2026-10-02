"use client";

import { branchApi } from "@/lib/api/branch-api";
import { useAuth } from "@/features/auth/auth-provider";
import type { Branch } from "@/types/api";
import { useQuery } from "@tanstack/react-query";
import { createContext, startTransition, useContext, useEffect, useMemo, useState } from "react";

type BranchContextValue = {
  branches: Branch[];
  currentBranch: Branch | null;
  branchId: string | null;
  isLoading: boolean;
  selectBranch: (branchId: string) => void;
};

const BranchContext = createContext<BranchContextValue | null>(null);

export function BranchProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const { data: branches = [], isLoading } = useQuery({ queryKey: ["branches"], queryFn: branchApi.list, enabled: Boolean(user) });
  const [branchId, setBranchId] = useState<string | null>(null);

  useEffect(() => {
    if (!branches.length) return;
    const saved = window.localStorage.getItem("restaurant-management.branch");
    const employeeBranch = user?.employee?.branchId;
    const next = branches.some((branch) => branch.id === saved) ? saved : employeeBranch && branches.some((branch) => branch.id === employeeBranch) ? employeeBranch : branches[0].id;
    startTransition(() => setBranchId(next ?? null));
  }, [branches, user?.employee?.branchId]);

  const value = useMemo(() => ({
    branches,
    currentBranch: branches.find((branch) => branch.id === branchId) ?? null,
    branchId,
    isLoading,
    selectBranch(next: string) {
      setBranchId(next);
      window.localStorage.setItem("restaurant-management.branch", next);
    },
  }), [branchId, branches, isLoading]);

  return <BranchContext.Provider value={value}>{children}</BranchContext.Provider>;
}

export function useBranch() {
  const context = useContext(BranchContext);
  if (!context) throw new Error("useBranch must be used inside BranchProvider");
  return context;
}