export type AuditActorItem = {
  userId?: string | null;
  username: string;
  fullName: string;
};

export type AuditLogItem = {
  id: string;
  createdAt: string;
  userId?: string | null;
  username: string;
  fullName: string;
  action: string;
  actionTitle: string;
  actionCategory: "orders" | "payments" | "kitchen" | "menu" | "inventory" | "employees" | "auth" | "other" | string;
  entityType: string;
  entityId?: string | null;
  ipAddress?: string | null;
  metadataJson?: string | null;
};

export type AuditLogFilter = {
  search?: string;
  userId?: string;
  action?: string;
  actionCategory?: string;
  entityType?: string;
  fromDate?: string;
  toDate?: string;
  page?: number;
  pageSize?: number;
};

export type AuditLogPagedResponse = {
  items: AuditLogItem[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

export type AuditLogStats = {
  totalLogs: number;
  todayLogs: number;
  activeUsersCount: number;
  latestActivityAt?: string | null;
};
