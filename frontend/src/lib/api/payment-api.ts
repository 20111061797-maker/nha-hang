import { apiRequest } from "./client";
import type {
  CreatePaymentRequest,
  PaymentResponse,
  PaymentSummary,
} from "@/types/payments";

export const paymentApi = {
  createPayment(orderId: string, payload: CreatePaymentRequest): Promise<PaymentResponse> {
    return apiRequest<PaymentResponse>(`/api/orders/${orderId}/payments`, {
      method: "POST",
      body: payload,
    });
  },

  getOrderPayments(orderId: string): Promise<PaymentResponse[]> {
    return apiRequest<PaymentResponse[]>(`/api/orders/${orderId}/payments`);
  },

  getBranchPayments(branchId: string): Promise<PaymentResponse[]> {
    return apiRequest<PaymentResponse[]>(`/api/branches/${branchId}/payments`);
  },

  getPayment(paymentId: string): Promise<PaymentResponse> {
    return apiRequest<PaymentResponse>(`/api/payments/${paymentId}`);
  },

  completePayment(paymentId: string): Promise<PaymentResponse> {
    return apiRequest<PaymentResponse>(`/api/payments/${paymentId}/complete`, {
      method: "POST",
    });
  },

  cancelPayment(paymentId: string, reason: string): Promise<PaymentResponse> {
    return apiRequest<PaymentResponse>(`/api/payments/${paymentId}/cancel`, {
      method: "POST",
      body: { reason },
    });
  },

  getSummary(orderId: string): Promise<PaymentSummary> {
    return apiRequest<PaymentSummary>(`/api/orders/${orderId}/payment-summary`);
  },
};
