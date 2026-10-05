import { apiRequest } from "./client";
import type {
  CreateKitchenStationRequest,
  KitchenOrder,
  KitchenOrderStatus,
  KitchenStation,
} from "@/types/kitchen";

export const kitchenApi = {
  getStations(branchId: string): Promise<KitchenStation[]> {
    return apiRequest<KitchenStation[]>(`/api/branches/${branchId}/kitchen-stations`);
  },

  createStation(branchId: string, payload: CreateKitchenStationRequest): Promise<KitchenStation> {
    return apiRequest<KitchenStation>(`/api/branches/${branchId}/kitchen-stations`, {
      method: "POST",
      body: payload,
    });
  },

  deleteStation(stationId: string): Promise<void> {
    return apiRequest<void>(`/api/kitchen-stations/${stationId}`, {
      method: "DELETE",
    });
  },

  getOrders(
    branchId: string,
    stationId?: string,
    status?: KitchenOrderStatus
  ): Promise<KitchenOrder[]> {
    const params = new URLSearchParams();
    if (stationId) params.append("stationId", stationId);
    if (status !== undefined) params.append("status", status.toString());
    const query = params.toString() ? `?${params.toString()}` : "";
    return apiRequest<KitchenOrder[]>(`/api/branches/${branchId}/kitchen/orders${query}`);
  },

  getOrder(id: string): Promise<KitchenOrder> {
    return apiRequest<KitchenOrder>(`/api/kitchen/orders/${id}`);
  },

  acceptOrder(id: string, expectedVersion?: number): Promise<KitchenOrder> {
    return apiRequest<KitchenOrder>(`/api/kitchen/orders/${id}/accept`, {
      method: "POST",
      body: { expectedVersion },
    });
  },

  startOrder(id: string, expectedVersion?: number): Promise<KitchenOrder> {
    return apiRequest<KitchenOrder>(`/api/kitchen/orders/${id}/start`, {
      method: "POST",
      body: { expectedVersion },
    });
  },

  readyOrder(id: string, expectedVersion?: number): Promise<KitchenOrder> {
    return apiRequest<KitchenOrder>(`/api/kitchen/orders/${id}/ready`, {
      method: "POST",
      body: { expectedVersion },
    });
  },

  completeOrder(id: string, expectedVersion?: number): Promise<KitchenOrder> {
    return apiRequest<KitchenOrder>(`/api/kitchen/orders/${id}/complete`, {
      method: "POST",
      body: { expectedVersion },
    });
  },

  cancelOrder(id: string, expectedVersion?: number): Promise<KitchenOrder> {
    return apiRequest<KitchenOrder>(`/api/kitchen/orders/${id}/cancel`, {
      method: "POST",
      body: { expectedVersion },
    });
  },

  getStationProducts(stationId: string): Promise<{ productId: string; displayOrder: number; isActive: boolean }[]> {
    return apiRequest(`/api/kitchen-stations/${stationId}/products`);
  },

  setStationProducts(stationId: string, productIds: string[]): Promise<unknown> {
    return apiRequest(`/api/kitchen-stations/${stationId}/products`, {
      method: "PUT",
      body: { productIds },
    });
  },
};
