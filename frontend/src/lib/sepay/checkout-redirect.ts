/**
 * Direct SePay Checkout Submission
 * Initiates the payment session and navigates directly to the official SePay portal.
 * No intermediate modal popup needed.
 */

import { unlockAudio } from "@/lib/audio/payment-sound";

export interface SepayCheckoutParams {
  orderId: string;
  orderNumber?: string;
  orderInvoiceNumber?: string;
  amount: number;
  orderDescription?: string;
  returnUrl?: string;
  cancelUrl?: string;
  customerName?: string;
  customerPhone?: string;
}

export async function submitSepayCheckout(params: SepayCheckoutParams): Promise<void> {
  if (typeof window === "undefined") return;

  unlockAudio();

  const currentOrigin = window.location.origin;
  const currentPath = window.location.pathname;

  const cleanNumber = (params.orderNumber || params.orderId)
    .replace(/[^a-zA-Z0-9]/g, "")
    .slice(-12);
  const invoiceNumber =
    params.orderInvoiceNumber || `DH${cleanNumber}-${Date.now().toString().slice(-4)}`;

  const finalSuccessUrl =
    params.returnUrl ||
    `${currentOrigin}${currentPath}?sepay_success=true&order_id=${encodeURIComponent(
      params.orderId
    )}&amount=${Math.round(params.amount)}`;

  const finalCancelUrl =
    params.cancelUrl || `${currentOrigin}${currentPath}?sepay_cancelled=true`;

  const res = await fetch("/api/sepay/checkout", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      orderId: params.orderId,
      orderInvoiceNumber: invoiceNumber,
      orderAmount: Math.round(params.amount),
      orderDescription:
        params.orderDescription || `Thanh toan don #${params.orderNumber || cleanNumber}`,
      successUrl: finalSuccessUrl,
      cancelUrl: finalCancelUrl,
      customerName: params.customerName,
      customerPhone: params.customerPhone,
    }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || "Lỗi khởi tạo cổng thanh toán SePay");
  }

  const data = await res.json();

  if (!data?.checkoutUrl || !data?.fields) {
    throw new Error("Dữ liệu phản hồi từ cổng SePay không hợp lệ");
  }

  // Create form and submit directly to SePay checkout URL in the current window
  const form = document.createElement("form");
  form.method = "POST";
  form.action = data.checkoutUrl;

  for (const [key, val] of Object.entries(data.fields)) {
    const input = document.createElement("input");
    input.type = "hidden";
    input.name = key;
    input.value = String(val ?? "");
    form.appendChild(input);
  }

  document.body.appendChild(form);
  form.submit();
  form.remove();
}
