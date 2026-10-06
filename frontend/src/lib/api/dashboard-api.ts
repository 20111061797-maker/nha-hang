import { apiRequest } from "./client";
import type { DashboardData, DashboardRange } from "@/types/dashboard";

export const dashboardApi = {
  get(branchId: string, range: DashboardRange): Promise<DashboardData> {
    return apiRequest<DashboardData>(`/api/branches/${branchId}/dashboard?range=${range}`);
  },
};
