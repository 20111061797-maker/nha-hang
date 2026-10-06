"use client";

import { useState, useEffect, useRef } from "react";
import {
  QrCode,
  CreditCard,
  Building2,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  X,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

import { announcePaymentSuccess } from "@/lib/audio/payment-sound";

interface SePayModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderId?: string;
  orderNumber?: string;
  orderInvoiceNumber?: string;
  amount?: number;
  orderAmount?: number;
  orderDescription?: string;
  tableName?: string;
  customerName?: string;
  customerPhone?: string;
  onPaymentSuccess?: () => void;
}

interface CheckoutSession {
  checkoutUrl: string;
  fields: Record<string, any>;
  invoiceNumber: string;
  amount: number;
}

function formatVnd(amount: number) {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
  }).format(amount);
}

export function SePayModal({
  isOpen,
  onClose,
  orderId,
  orderNumber,
  orderInvoiceNumber,
  amount,
  orderAmount,
  orderDescription,
  tableName,
  customerName,
  customerPhone,
  onPaymentSuccess,
}: SePayModalProps) {
  const [loading, setLoading] = useState(false);
  const [session, setSession] = useState<CheckoutSession | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [polling, setPolling] = useState(false);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [hasAutoOpened, setHasAutoOpened] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const pollTimerRef = useRef<NodeJS.Timeout | null>(null);

  const finalAmount = Math.round(orderAmount ?? amount ?? 0);
  const finalId = orderId || orderInvoiceNumber || "order";
  const displayOrderNumber = orderNumber || orderInvoiceNumber || "DH";

  // Initialize SePay checkout session
  useEffect(() => {
    if (!isOpen || finalAmount <= 0) return;

    let isMounted = true;
    setLoading(true);
    setError(null);
    setPaymentSuccess(false);
    setHasAutoOpened(false);

    // Clean invoice number for SePay
    const cleanNumber = (orderNumber || orderInvoiceNumber || finalId)
      .replace(/[^a-zA-Z0-9]/g, "")
      .slice(-12);
    const invoiceNumber = orderInvoiceNumber
      ? orderInvoiceNumber.replace(/[^a-zA-Z0-9_-]/g, "")
      : `DH${cleanNumber}-${Date.now().toString().slice(-4)}`;

    const currentUrl = typeof window !== "undefined" ? window.location.href : "";

    fetch("/api/sepay/checkout", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        orderId: finalId,
        orderInvoiceNumber: invoiceNumber,
        orderAmount: finalAmount,
        orderDescription:
          orderDescription || `Thanh toan don ${tableName || ""} #${cleanNumber}`.trim(),
        successUrl: `${currentUrl}${currentUrl.includes("?") ? "&" : "?"}sepay=success&inv=${invoiceNumber}`,
        cancelUrl: currentUrl,
        customerName,
        customerPhone,
      }),
    })
      .then(async (res) => {
        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.message || "Lỗi khởi tạo cổng SePay");
        }
        return res.json();
      })
      .then((data: CheckoutSession) => {
        if (isMounted) {
          setSession(data);
          setLoading(false);
          startPolling(data.invoiceNumber);

          // Tự động mở link cổng SePay ngay khi phiên được khởi tạo!
          setTimeout(() => {
            if (formRef.current) {
              formRef.current.submit();
              setHasAutoOpened(true);
            }
          }, 150);
        }
      })
      .catch((err) => {
        if (isMounted) {
          console.error("SePay init error:", err);
          setError(err.message || "Không thể kết nối đến cổng SePay");
          setLoading(false);
        }
      });

    return () => {
      isMounted = false;
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    };
  }, [
    isOpen,
    finalId,
    finalAmount,
    orderNumber,
    orderInvoiceNumber,
    orderDescription,
    tableName,
    customerName,
    customerPhone,
  ]);

  // Polling order status
  const startPolling = (invoiceNumber: string) => {
    if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    setPolling(true);

    pollTimerRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/sepay/status?invoiceNumber=${encodeURIComponent(invoiceNumber)}`);
        if (!res.ok) return;
        const result = await res.json();
        const orderData = result?.data;
        const status = orderData?.order_status?.toUpperCase() || orderData?.status?.toUpperCase();

        if (status === "PAID" || status === "COMPLETED" || status === "SUCCESS") {
          if (pollTimerRef.current) clearInterval(pollTimerRef.current);
          setPolling(false);
          setPaymentSuccess(true);
          // Phát tiếng chuông và giọng đọc thông báo số tiền thanh toán thành công
          announcePaymentSuccess(finalAmount);
          if (onPaymentSuccess) {
            onPaymentSuccess();
          }
        }
      } catch (e) {
        // Continue polling silently
      }
    }, 3000);
  };

  const handleManualConfirm = () => {
    if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    setPolling(false);
    setPaymentSuccess(true);
    // Phát tiếng chuông và giọng đọc thông báo số tiền thanh toán thành công
    announcePaymentSuccess(finalAmount);
    if (onPaymentSuccess) {
      onPaymentSuccess();
    }
  };

  const handleOpenSePayPortal = () => {
    if (formRef.current) {
      formRef.current.submit();
      setHasAutoOpened(true);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
      <div className="bg-[#181a22] border border-[#2e3547] rounded-3xl w-full max-w-md overflow-hidden shadow-2xl animate-in zoom-in-95 relative text-white">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-[#252b3b] bg-[#14161d]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-amber-500/20 to-orange-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-md">
              <QrCode size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black font-heading text-white">Cổng thanh toán SePay</h3>
                <span className="px-2 py-0.2 rounded-full text-[10px] font-extrabold uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  LIVE
                </span>
              </div>
              <p className="text-xs text-gray-400">VietQR • Napas • Thẻ quốc tế Visa/Master</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl text-gray-400 hover:text-white hover:bg-[#252b3b] transition-all cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5">
          {/* Order Info Summary */}
          <div className="bg-[#12141a] p-4 rounded-2xl border border-[#252b3b] space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-400">Đơn hàng:</span>
              <span className="font-mono font-bold text-white">
                #{displayOrderNumber ? (displayOrderNumber.length > 14 ? displayOrderNumber.slice(-8) : displayOrderNumber) : "N/A"}
                {tableName ? ` (${tableName})` : ""}
              </span>
            </div>
            <div className="flex items-center justify-between text-xs">
              <span className="text-gray-400">Đơn vị thụ hưởng:</span>
              <span className="font-semibold text-amber-400 flex items-center gap-1">
                <Building2 size={13} /> Đại học Quốc gia
              </span>
            </div>
            <div className="flex items-center justify-between pt-2 border-t border-[#202534]">
              <span className="text-xs font-bold text-gray-300">Tổng tiền thanh toán:</span>
              <span className="text-xl font-black text-emerald-400 font-mono">
                {formatVnd(finalAmount)}
              </span>
            </div>
          </div>

          {/* Success State */}
          {paymentSuccess ? (
            <div className="p-6 rounded-2xl bg-emerald-950/60 border border-emerald-500/40 text-center space-y-3 animate-in zoom-in-95">
              <div className="w-14 h-14 mx-auto rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center">
                <CheckCircle2 size={32} />
              </div>
              <h4 className="text-base font-black text-emerald-200">Thanh toán thành công!</h4>
              <p className="text-xs text-emerald-300/80">
                Giao dịch SePay đã được xác nhận. Bàn ăn và đơn hàng đã được cập nhật hoàn tất.
              </p>
              <button
                type="button"
                onClick={onClose}
                className="w-full py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs shadow-lg transition-all cursor-pointer"
              >
                Đóng
              </button>
            </div>
          ) : error ? (
            <div className="p-4 rounded-2xl bg-rose-950/60 border border-rose-500/40 text-center space-y-2">
              <AlertCircle size={28} className="mx-auto text-rose-400" />
              <p className="text-xs font-bold text-rose-200">{error}</p>
              <button
                type="button"
                onClick={() => {
                  setError(null);
                  setLoading(true);
                }}
                className="px-4 py-2 rounded-xl bg-rose-500/20 text-rose-300 hover:bg-rose-500/30 text-xs font-bold transition-all cursor-pointer"
              >
                Thử lại
              </button>
            </div>
          ) : loading ? (
            <div className="p-8 text-center space-y-3">
              <RefreshCw className="animate-spin mx-auto text-amber-400" size={28} />
              <p className="text-xs text-gray-400 font-medium">Đang tạo phiên thanh toán SePay...</p>
            </div>
          ) : session ? (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-gradient-to-br from-amber-500/10 via-orange-500/5 to-transparent border border-amber-500/20 space-y-2 text-xs text-gray-300">
                <div className="flex items-center gap-2 text-amber-400 font-bold">
                  <ShieldCheck size={16} />
                  <span>Cổng thanh toán chính thức SePay</span>
                </div>
                <p className="text-[11px] text-gray-400 leading-relaxed">
                  Bấm nút bên dưới để chuyển hướng sang trang thanh toán bảo mật SePay. Khách có thể quét mã VietQR tự động khớp tiền hoặc thanh toán qua thẻ ngân hàng.
                </p>
              </div>

              {/* Hidden Auto-POST Form for SePay */}
              <form
                ref={formRef}
                action={session.checkoutUrl}
                method="POST"
                target="_blank"
                className="hidden"
              >
                {Object.keys(session.fields).map((field) => (
                  <input
                    key={field}
                    type="hidden"
                    name={field}
                    value={session.fields[field] ?? ""}
                  />
                ))}
              </form>

              {/* Action Buttons */}
              <div className="space-y-2.5">
                <button
                  type="button"
                  onClick={handleOpenSePayPortal}
                  className="w-full flex items-center justify-center gap-2 py-3.5 px-4 rounded-2xl bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-400 hover:to-orange-500 text-white font-black text-sm shadow-xl shadow-orange-950/50 active:scale-[0.98] transition-all cursor-pointer"
                >
                  <CreditCard size={18} />
                  <span>{hasAutoOpened ? "Mở lại link thanh toán SePay" : "Mở link thanh toán SePay ngay"}</span>
                  <ExternalLink size={15} className="ml-1 opacity-80" />
                </button>

                {polling && (
                  <div className="flex items-center justify-center gap-2 text-[11px] text-emerald-400/90 py-1 font-medium bg-emerald-500/10 rounded-xl border border-emerald-500/20">
                    <RefreshCw className="animate-spin text-emerald-400" size={13} />
                    <span>Hệ thống đang tự động lắng nghe giao dịch SePay...</span>
                  </div>
                )}

                <button
                  type="button"
                  onClick={handleManualConfirm}
                  className="w-full py-2.5 px-3 rounded-xl bg-[#1c2434] hover:bg-[#253046] text-amber-300 hover:text-amber-200 border border-amber-500/30 text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  <CheckCircle2 size={15} className="text-emerald-400" />
                  <span>Đã nhận tiền thành công &amp; Trả bàn ngay</span>
                </button>
              </div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
