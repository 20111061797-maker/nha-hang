import { apiRequest } from "./client";
import type {
  TableListItem,
  TableDetails,
  CreateTablePayload,
  UpdateTablePayload,
  ChangeTableStatusPayload,
  AreaListItem,
  AreaDetails,
  CreateAreaPayload,
  UpdateAreaPayload,
} from "@/types/tables";

export const tableApi = {
  // Tables
  getTables(branchId: string): Promise<TableListItem[]> {
    return apiRequest<TableListItem[]>(`/api/branches/${branchId}/tables`);
  },

  getTable(id: string): Promise<TableDetails> {
    return apiRequest<TableDetails>(`/api/tables/${id}`);
  },

  createTable(branchId: string, payload: CreateTablePayload): Promise<TableDetails> {
    return apiRequest<TableDetails>(`/api/branches/${branchId}/tables`, {
      method: "POST",
      body: payload,
    });
  },

  updateTable(id: string, payload: UpdateTablePayload): Promise<TableDetails> {
    return apiRequest<TableDetails>(`/api/tables/${id}`, {
      method: "PUT",
      body: payload,
    });
  },

  deleteTable(id: string): Promise<void> {
    return apiRequest<void>(`/api/tables/${id}`, {
      method: "DELETE",
    });
  },

  changeStatus(id: string, payload: ChangeTableStatusPayload): Promise<TableDetails> {
    return apiRequest<TableDetails>(`/api/tables/${id}/status`, {
      method: "PATCH",
      body: payload,
    });
  },

  setActiveStatus(id: string, isActive: boolean): Promise<void> {
    return apiRequest<void>(`/api/tables/${id}/active-status`, {
      method: "PATCH",
      body: { isActive },
    });
  },

  // Areas
  getAreas(branchId: string): Promise<AreaListItem[]> {
    return apiRequest<AreaListItem[]>(`/api/branches/${branchId}/areas`);
  },

  getArea(id: string): Promise<AreaDetails> {
    return apiRequest<AreaDetails>(`/api/areas/${id}`);
  },

  createArea(branchId: string, payload: CreateAreaPayload): Promise<AreaDetails> {
    return apiRequest<AreaDetails>(`/api/branches/${branchId}/areas`, {
      method: "POST",
      body: payload,
    });
  },

  updateArea(id: string, payload: UpdateAreaPayload): Promise<AreaDetails> {
    return apiRequest<AreaDetails>(`/api/areas/${id}`, {
      method: "PUT",
      body: payload,
    });
  },

  deleteArea(id: string, options?: { cascade?: boolean; moveToAreaId?: string }): Promise<void> {
    const params = new URLSearchParams();
    if (options?.cascade) params.set("cascade", "true");
    if (options?.moveToAreaId) params.set("moveToAreaId", options.moveToAreaId);
    const query = params.toString() ? `?${params.toString()}` : "";
    return apiRequest<void>(`/api/areas/${id}${query}`, {
      method: "DELETE",
    });
  },
};
