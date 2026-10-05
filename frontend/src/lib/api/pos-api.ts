import { apiRequest } from "./client";
import type {
  AddOrderItemRequest,
  CancelOrderRequest,
  CreateOrderRequest,
  DiningArea,
  DiningTable,
  MenuResponse,
  OrderDetails,
  OrderListItem,
  TableStatus,
  UpdateOrderItemRequest,
} from "@/types/pos";

export const posApi = {
  getAreas(branchId: string): Promise<DiningArea[]> {
    return apiRequest<DiningArea[]>(`/api/branches/${branchId}/areas`);
  },

  getTables(branchId: string): Promise<DiningTable[]> {
    return apiRequest<DiningTable[]>(`/api/branches/${branchId}/tables`);
  },

  getMenu(branchId: string): Promise<MenuResponse> {
    return apiRequest<MenuResponse>(`/api/branches/${branchId}/menu`);
  },

  getBranchOrders(branchId: string): Promise<OrderListItem[]> {
    return apiRequest<OrderListItem[]>(`/api/branches/${branchId}/orders`);
  },

  getOrder(orderId: string): Promise<OrderDetails> {
    return apiRequest<OrderDetails>(`/api/orders/${orderId}`);
  },

  createOrder(payload: CreateOrderRequest): Promise<OrderDetails> {
    return apiRequest<OrderDetails>("/api/orders", {
      method: "POST",
      body: payload,
    });
  },

  addItem(orderId: string, payload: AddOrderItemRequest): Promise<OrderDetails> {
    return apiRequest<OrderDetails>(`/api/orders/${orderId}/items`, {
      method: "POST",
      body: payload,
    });
  },

  updateItem(orderId: string, itemId: string, payload: UpdateOrderItemRequest): Promise<OrderDetails> {
    return apiRequest<OrderDetails>(`/api/orders/${orderId}/items/${itemId}`, {
      method: "PUT",
      body: payload,
    });
  },

  removeItem(orderId: string, itemId: string, expectedVersion?: number): Promise<OrderDetails> {
    const query = expectedVersion !== undefined ? `?expectedVersion=${expectedVersion}` : "";
    return apiRequest<OrderDetails>(`/api/orders/${orderId}/items/${itemId}${query}`, {
      method: "DELETE",
    });
  },

  confirmOrder(orderId: string, expectedVersion?: number): Promise<OrderDetails> {
    const query = expectedVersion !== undefined ? `?expectedVersion=${expectedVersion}` : "";
    return apiRequest<OrderDetails>(`/api/orders/${orderId}/confirm${query}`, {
      method: "POST",
    });
  },

  completeOrder(orderId: string, expectedVersion?: number): Promise<OrderDetails> {
    const query = expectedVersion !== undefined ? `?expectedVersion=${expectedVersion}` : "";
    return apiRequest<OrderDetails>(`/api/orders/${orderId}/complete${query}`, {
      method: "POST",
    });
  },

  cancelOrder(orderId: string, payload: CancelOrderRequest): Promise<OrderDetails> {
    return apiRequest<OrderDetails>(`/api/orders/${orderId}/cancel`, {
      method: "POST",
      body: payload,
    });
  },

  updateTableStatus(tableId: string, status: TableStatus): Promise<DiningTable> {
    return apiRequest<DiningTable>(`/api/tables/${tableId}/status`, {
      method: "PATCH",
      body: { status },
    });
  },
};
