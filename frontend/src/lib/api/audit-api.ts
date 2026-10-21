import { apiRequest } from "./client";
import type {
  AuditLogFilter,
  AuditLogPagedResponse,
  AuditLogStats,
  AuditActorItem,
} from "@/types/audit";

export const auditApi = {
  getLogs(filter: AuditLogFilter = {}): Promise<AuditLogPagedResponse> {
    const params = new URLSearchParams();
    if (filter.search) params.set("search", filter.search);
    if (filter.userId) params.set("userId", filter.userId);
    if (filter.action) params.set("action", filter.action);
    if (filter.actionCategory) params.set("actionCategory", filter.actionCategory);
    if (filter.entityType) params.set("entityType", filter.entityType);
    if (filter.fromDate) params.set("fromDate", filter.fromDate);
    if (filter.toDate) params.set("toDate", filter.toDate);
    if (filter.page) params.set("page", String(filter.page));
    if (filter.pageSize) params.set("pageSize", String(filter.pageSize));

    const qs = params.toString();
    return apiRequest<AuditLogPagedResponse>(`/api/audit-logs${qs ? `?${qs}` : ""}`);
  },

  getStats(): Promise<AuditLogStats> {
    return apiRequest<AuditLogStats>("/api/audit-logs/stats");
  },

  getActions(): Promise<string[]> {
    return apiRequest<string[]>("/api/audit-logs/actions");
  },

  getActors(): Promise<AuditActorItem[]> {
    return apiRequest<AuditActorItem[]>("/api/audit-logs/actors");
  },
};
