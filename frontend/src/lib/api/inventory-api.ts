import { apiRequest } from "./client";
import type {
  InventoryItem,
  InventorySummary,
  InventoryTransaction,
  CreateInventoryItemPayload,
  AdjustInventoryPayload,
} from "@/types/inventory";

export const inventoryApi = {
  getSummary(branchId: string): Promise<InventorySummary> {
    return apiRequest<InventorySummary>(`/api/inventory/summary?branchId=${branchId}`);
  },

  getItems(params: {
    branchId: string;
    search?: string;
    status?: string;
  }): Promise<InventoryItem[]> {
    const searchParams = new URLSearchParams();
    searchParams.set("branchId", params.branchId);
    if (params.search) searchParams.set("search", params.search);
    if (params.status) searchParams.set("status", params.status);
    return apiRequest<InventoryItem[]>(`/api/inventory/items?${searchParams.toString()}`);
  },

  getTransactions(params: {
    branchId: string;
    inventoryItemId?: string;
    limit?: number;
  }): Promise<InventoryTransaction[]> {
    const searchParams = new URLSearchParams();
    searchParams.set("branchId", params.branchId);
    if (params.inventoryItemId) searchParams.set("inventoryItemId", params.inventoryItemId);
    if (params.limit) searchParams.set("limit", String(params.limit));
    return apiRequest<InventoryTransaction[]>(`/api/inventory/transactions?${searchParams.toString()}`);
  },

  getUnits(): Promise<string[]> {
    return apiRequest<string[]>("/api/inventory/units");
  },

  createItem(payload: CreateInventoryItemPayload): Promise<InventoryItem> {
    return apiRequest<InventoryItem>("/api/inventory/items", {
      method: "POST",
      body: payload,
    });
  },

  adjustStock(payload: AdjustInventoryPayload): Promise<InventoryItem> {
    return apiRequest<InventoryItem>("/api/inventory/adjust", {
      method: "POST",
      body: payload,
    });
  },
};
