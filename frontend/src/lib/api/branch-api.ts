import { apiRequest } from "@/lib/api/client";
import type { Branch } from "@/types/api";

export const branchApi = {
  list: () => apiRequest<Branch[]>("/api/branches"),
};