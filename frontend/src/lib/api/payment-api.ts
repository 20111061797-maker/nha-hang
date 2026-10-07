import { apiRequest } from "./client";
import type {
  CreatePaymentRequest,
  PaymentResponse,
  PaymentSummary,
} from "@/types/payments";

export const paymentApi = {
  createPayment(orderId: string, payload: CreatePaymentRequest): Promise<PaymentResponse> {
    const methodMap: Record<string, number> = {
      Cash: 0,
      BankTransfer: 1,
      QrPayment: 2,
      Card: 3,
      EWallet: 4,
      Online: 5,
      Other: 6,
    };
    const paymentMethodInt =
      typeof payload.paymentMethod === "number"
        ? payload.paymentMethod
        : methodMap[payload.paymentMethod] ?? 0;

    return apiRequest<PaymentResponse>(`/api/orders/${orderId}/payments`, {
      method: "POST",
      body: {
        ...payload,
        paymentMethod: paymentMethodInt,
        tenderedAmount: payload.tenderedAmount ?? payload.amount,
      },
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

  reclassifyPayment(
    paymentId: string,
    payload: {
      paymentMethod: number | string;
      provider?: string;
      note?: string;
      providerTransactionId?: string;
      transactionReference?: string;
    }
  ): Promise<PaymentResponse> {
    const methodMap: Record<string, number> = {
      Cash: 0,
      BankTransfer: 1,
      QrPayment: 2,
      Card: 3,
      EWallet: 4,
      Online: 5,
      Other: 6,
    };
    const paymentMethodInt =
      typeof payload.paymentMethod === "number"
        ? payload.paymentMethod
        : methodMap[payload.paymentMethod] ?? 2;

    return apiRequest<PaymentResponse>(`/api/payments/${paymentId}/reclassify`, {
      method: "PATCH",
      body: {
        ...payload,
        paymentMethod: paymentMethodInt,
      },
    });
  },
};
