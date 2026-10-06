import { apiRequest } from "./client";
import type {
  PublicTableInfo,
  PublicCreateOrderPayload,
  PublicOrderResponse,
  PublicActiveBillResponse,
} from "@/types/qr-order";
import type { MenuResponse } from "@/types/pos";

export const qrOrderApi = {
  getTableInfo(identifierOrId: string): Promise<PublicTableInfo> {
    return apiRequest<PublicTableInfo>(`/api/public/tables/${encodeURIComponent(identifierOrId)}`);
  },

  getPublicMenu(branchId: string): Promise<MenuResponse> {
    return apiRequest<MenuResponse>(`/api/public/branches/${branchId}/menu`);
  },

  getActiveBill(tableId: string): Promise<PublicActiveBillResponse> {
    return apiRequest<PublicActiveBillResponse>(`/api/public/tables/${tableId}/active-bill`);
  },

  placeOrder(payload: PublicCreateOrderPayload): Promise<PublicOrderResponse> {
    return apiRequest<PublicOrderResponse>("/api/public/orders", {
      method: "POST",
      body: payload,
    });
  },

  completeTablePayment(tableId: string): Promise<{ success: boolean; orderId?: string; orderNumber?: string; totalAmount?: number }> {
    return apiRequest(`/api/public/tables/${tableId}/complete-payment`, {
      method: "POST",
    });
  },
};
