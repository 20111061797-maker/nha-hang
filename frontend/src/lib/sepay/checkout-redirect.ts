/**
 * Direct SePay Checkout Submission
 * Initiates the payment session and sends the customer straight to the official SePay portal.
 *
 * When an `onPaid` callback is supplied, SePay opens in a NEW TAB while the original page stays
 * open and listens for the result. That keeps the original page "user-activated", which is the
 * only way browsers allow the success chime + Vietnamese voice to play automatically (no tap).
 * Without `onPaid` (or if the pop-up is blocked) it falls back to a same-tab redirect.
 */

import { announcePaymentSuccess, unlockAudio } from "@/lib/audio/payment-sound";

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
  /** Called on the ORIGINAL page once payment is confirmed (sound is already played). */
  onPaid?: (info: { orderId: string; amount: number }) => void;
}

const CHANNEL_NAME = "sepay-payment";
const POPUP_WINDOW_NAME = "sepay_checkout";
const PAID_STATUSES = ["CAPTURED", "PAID", "COMPLETED", "SUCCESS", "APPROVED"];
const MAX_WATCH_MS = 15 * 60 * 1000;
const CLOSED_GRACE_MS = 45 * 1000;

type PaidMessage = { type: "sepay_success"; orderId: string; amount: number };

function watchPayment(opts: {
  popup: Window;
  invoiceNumber: string;
  orderId: string;
  amount: number;
  onPaid: (info: { orderId: string; amount: number }) => void;
}) {
  const { popup, invoiceNumber, orderId, amount, onPaid } = opts;
  let done = false;
  let closedAt: number | null = null;
  const startedAt = Date.now();

  const channel = typeof BroadcastChannel !== "undefined" ? new BroadcastChannel(CHANNEL_NAME) : null;
  let timer: ReturnType<typeof setInterval> | undefined;

  const cleanup = () => {
    if (timer) clearInterval(timer);
    channel?.close();
  };

  const finish = () => {
    if (done) return;
    done = true;
    cleanup();
    announcePaymentSuccess(amount);
    try {
      popup.close();
    } catch {
      /* ignore */
    }
    onPaid({ orderId, amount });
  };

  if (channel) {
    channel.onmessage = (e: MessageEvent<PaidMessage>) => {
      if (e.data?.type === "sepay_success" && e.data.orderId === orderId) finish();
    };
  }

  timer = setInterval(async () => {
    if (done) return;
    if (Date.now() - startedAt > MAX_WATCH_MS) {
      done = true;
      cleanup();
      return;
    }
    if (popup.closed) {
      closedAt = closedAt ?? Date.now();
      // Customer closed the SePay tab without paying: stop shortly after.
      if (Date.now() - closedAt > CLOSED_GRACE_MS) {
        done = true;
        cleanup();
        return;
      }
    }
    try {
      const res = await fetch(`/api/sepay/status?invoiceNumber=${encodeURIComponent(invoiceNumber)}`);
      if (!res.ok) return;
      const result = await res.json();
      if (result?.isPaid === true) finish();
    } catch {
      /* keep polling */
    }
  }, 3000);
}

/**
 * Call at the start of return handlers.
 * If this tab is the SePay pop-up (marked with sepay_popup=1), it verifies whether the invoice
 * is truly paid before notifying the parent tab and closing.
 */
export function handleSepayPopupReturn(): boolean {
  if (typeof window === "undefined") return false;
  const url = new URL(window.location.href);
  const isPopup = url.searchParams.get("sepay_popup") === "1";
  if (!isPopup) return false;

  const invoice = url.searchParams.get("invoice") || "";
  const orderId = url.searchParams.get("order_id") ?? "";
  const amount = Number(url.searchParams.get("amount")) || 0;

  if (invoice) {
    fetch(`/api/sepay/status?invoiceNumber=${encodeURIComponent(invoice)}`)
      .then((r) => r.json())
      .then((data) => {
        if (data?.isPaid === true) {
          const message: PaidMessage = {
            type: "sepay_success",
            orderId,
            amount,
          };
          if (typeof BroadcastChannel !== "undefined") {
            const channel = new BroadcastChannel(CHANNEL_NAME);
            channel.postMessage(message);
            setTimeout(() => channel.close(), 500);
          }
        }
      })
      .catch(() => {})
      .finally(() => {
        setTimeout(() => window.close(), 300);
      });
    return true;
  }

  setTimeout(() => window.close(), 300);
  return true;
}

export async function submitSepayCheckout(params: SepayCheckoutParams): Promise<"popup" | "redirect"> {
  if (typeof window === "undefined") return "redirect";

  unlockAudio();

  // Must be opened synchronously inside the click handler, before any await, or it gets blocked.
  const popup = params.onPaid ? window.open("", POPUP_WINDOW_NAME) : null;
  const usePopup = Boolean(popup);

  try {
    const currentOrigin = window.location.origin;
    const currentPath = window.location.pathname;

    const cleanNumber = (params.orderNumber || params.orderId)
      .replace(/[^a-zA-Z0-9]/g, "")
      .slice(-12);
    const invoiceNumber =
      params.orderInvoiceNumber || `DH${cleanNumber}-${Date.now().toString().slice(-4)}`;

    const finalSuccessUrl = params.returnUrl
      ? `${params.returnUrl}${usePopup ? `${params.returnUrl.includes("?") ? "&" : "?"}sepay_popup=1` : ""}`
      : `${currentOrigin}${currentPath}?sepay_verify=true&invoice=${encodeURIComponent(
          invoiceNumber
        )}&order_id=${encodeURIComponent(
          params.orderId
        )}&amount=${Math.round(params.amount)}${usePopup ? "&sepay_popup=1" : ""}`;

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

    const form = document.createElement("form");
    form.method = "POST";
    form.action = data.checkoutUrl;
    form.target = usePopup ? POPUP_WINDOW_NAME : "_self";

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

    if (usePopup && popup && params.onPaid) {
      watchPayment({
        popup,
        invoiceNumber: data.invoiceNumber || invoiceNumber,
        orderId: params.orderId,
        amount: params.amount,
        onPaid: params.onPaid,
      });
      return "popup";
    }
    return "redirect";
  } catch (err) {
    try {
      popup?.close();
    } catch {
      /* ignore */
    }
    throw err;
  }
}
