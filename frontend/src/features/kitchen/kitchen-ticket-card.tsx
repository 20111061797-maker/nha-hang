"use client";

import { useEffect, useState } from "react";
import {
  KitchenOrderStatus,
  KitchenPriority,
  type KitchenOrder,
} from "@/types/kitchen";
import { OrderType } from "@/types/pos";
import {
  Clock,
  ChefHat,
  AlertCircle,
  Play,
  Check,
  X,
  Flame,
  BellRing,
  ShoppingBag,
  Bike,
  Sparkles,
  UtensilsCrossed,
  Copy,
  CheckCheck,
} from "lucide-react";

type Props = {
  ticket: KitchenOrder;
  isProcessing: boolean;
  onAccept: (ticketId: string, version: number) => void;
  onStart: (ticketId: string, version: number) => void;
  onReady: (ticketId: string, version: number) => void;
  onComplete: (ticketId: string, version: number) => void;
  onCancel: (ticketId: string, version: number) => void;
};

export function KitchenTicketCard({
  ticket,
  isProcessing,
  onAccept,
  onStart,
  onReady,
  onComplete,
  onCancel,
}: Props) {
  const [elapsedSeconds, setElapsedSeconds] = useState(() => {
    const created = new Date(ticket.createdAt).getTime();
    return Math.max(0, Math.floor((Date.now() - created) / 1000));
  });
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const calculateElapsed = () => {
      const created = new Date(ticket.createdAt).getTime();
      const now = Date.now();
      return Math.max(0, Math.floor((now - created) / 1000));
    };

    const interval = setInterval(() => {
      setElapsedSeconds(calculateElapsed());
    }, 1000);

    return () => clearInterval(interval);
  }, [ticket.createdAt]);

  const formatElapsed = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  // Timer urgency style
  const getTimerStyle = (seconds: number) => {
    if (seconds >= 1200) {
      // > 20 mins - Urgent Red Pulse
      return "bg-rose-500/20 text-rose-300 border-rose-500/40 shadow-[0_0_12px_rgba(244,63,94,0.3)] animate-pulse font-bold";
    }
    if (seconds >= 600) {
      // > 10 mins - Amber Warning
      return "bg-amber-500/20 text-amber-300 border-amber-500/40 font-semibold";
    }
    // Normal Green
    return "bg-emerald-500/15 text-emerald-300 border-emerald-500/30";
  };

  const getStatusBadge = () => {
    switch (ticket.status) {
      case KitchenOrderStatus.New:
        return {
          label: "Mới nhận",
          class: "bg-sky-500/15 text-sky-300 border-sky-500/30",
          dot: "bg-sky-400 animate-ping",
        };
      case KitchenOrderStatus.Accepted:
        return {
          label: "Đã nhận đơn",
          class: "bg-blue-500/15 text-blue-300 border-blue-500/30",
          dot: "bg-blue-400",
        };
      case KitchenOrderStatus.Preparing:
        return {
          label: "Đang nấu",
          class: "bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-[0_0_10px_rgba(245,158,11,0.2)]",
          dot: "bg-amber-400 animate-pulse",
        };
      case KitchenOrderStatus.Ready:
        return {
          label: "Sẵn sàng phục vụ",
          class: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-[0_0_10px_rgba(16,185,129,0.2)]",
          dot: "bg-emerald-400",
        };
      default:
        return {
          label: "Hoàn tất",
          class: "bg-gray-500/20 text-gray-300 border-gray-500/30",
          dot: "bg-gray-400",
        };
    }
  };

  const statusBadge = getStatusBadge();
  const isTakeaway = ticket.orderType === OrderType.Takeaway;
  const isDelivery = ticket.orderType === OrderType.Delivery;

  // Shorten Order Number for clean display (e.g. #ORD-...83C1B796 -> #83C1B796 or #ORD-83C1)
  const displayOrderNo = ticket.orderNumber
    ? ticket.orderNumber.length > 12
      ? `#${ticket.orderNumber.slice(-8)}`
      : `#${ticket.orderNumber}`
    : `#${ticket.id.slice(0, 6)}`;

  const copyOrderNo = () => {
    if (ticket.orderNumber) {
      navigator.clipboard?.writeText(ticket.orderNumber);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const isUrgent = ticket.priority === KitchenPriority.Urgent;
  const isReady = ticket.status === KitchenOrderStatus.Ready;
  const isPreparing = ticket.status === KitchenOrderStatus.Preparing;

  return (
    <div
      className={`group relative flex flex-col rounded-2xl shrink-0 w-full transition-all duration-300 overflow-hidden bg-[#181c26] border ${
        isUrgent
          ? "border-rose-500/70 shadow-[0_4px_24px_rgba(244,63,94,0.25)] ring-1 ring-rose-500/50"
          : isReady
          ? "border-emerald-500/50 shadow-[0_4px_24px_rgba(16,185,129,0.18)]"
          : isPreparing
          ? "border-amber-500/40 shadow-[0_4px_20px_rgba(245,158,11,0.12)]"
          : "border-[#2c3345] hover:border-[#3e4863] shadow-lg shadow-black/40 hover:shadow-xl hover:-translate-y-0.5"
      }`}
    >
      {/* Top Accent Strip */}
      <div
        className={`h-1.5 w-full shrink-0 ${
          isUrgent
            ? "bg-gradient-to-r from-rose-500 via-amber-500 to-rose-500 animate-pulse"
            : isReady
            ? "bg-gradient-to-r from-emerald-500 via-teal-400 to-emerald-500"
            : isPreparing
            ? "bg-gradient-to-r from-amber-500 via-orange-400 to-amber-500"
            : "bg-gradient-to-r from-sky-500 to-blue-600"
        }`}
      />

      {/* Ticket Header */}
      <div className="p-3.5 bg-[#1e2330] border-b border-[#2a3142] flex flex-col gap-2.5 shrink-0">
        {/* Row 1: Table Badge + Order Number + Timer */}
        <div className="flex items-center justify-between gap-2">
          {/* Table / Order Type Badge */}
          <div className="flex items-center gap-2 flex-wrap">
            {isTakeaway ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-black uppercase tracking-wider bg-gradient-to-r from-amber-500/25 to-orange-500/25 text-amber-300 border border-amber-500/40 shadow-sm">
                <ShoppingBag size={13} className="text-amber-400" />
                MANG VỀ
              </span>
            ) : isDelivery ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-black uppercase tracking-wider bg-gradient-to-r from-purple-500/25 to-pink-500/25 text-purple-300 border border-purple-500/40 shadow-sm">
                <Bike size={13} className="text-purple-400" />
                GIAO HÀNG
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-sm font-black tracking-wide bg-gradient-to-r from-sky-500/20 via-blue-500/25 to-indigo-500/20 text-sky-200 border border-sky-500/40 shadow-sm">
                <UtensilsCrossed size={13} className="text-sky-400" />
                {ticket.tableNumber ? `BÀN ${ticket.tableNumber}` : "TẠI BÀN"}
              </span>
            )}

            {/* Order Number with quick-copy */}
            <button
              type="button"
              onClick={copyOrderNo}
              className="inline-flex items-center gap-1 text-[11px] font-mono text-gray-400 hover:text-gray-200 bg-[#141720] hover:bg-[#252a38] px-2 py-0.5 rounded border border-[#2a3040] transition-colors"
              title={`Đơn hàng đầy đủ: ${ticket.orderNumber}. Nhấn để sao chép.`}
            >
              <span>{displayOrderNo}</span>
              {copied ? (
                <CheckCheck size={11} className="text-emerald-400" />
              ) : (
                <Copy size={11} className="opacity-60" />
              )}
            </button>
          </div>

          {/* Elapsed Timer Pill */}
          <div
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-mono border transition-all ${getTimerStyle(
              elapsedSeconds
            )}`}
            title={`Thời gian từ lúc gọi món: ${formatElapsed(elapsedSeconds)}`}
          >
            <Clock size={12} className={elapsedSeconds >= 1200 ? "animate-spin" : ""} />
            <span>{formatElapsed(elapsedSeconds)}</span>
          </div>
        </div>

        {/* Row 2: Station Name + Status Badge */}
        <div className="flex items-center justify-between gap-2 pt-0.5">
          <div className="flex items-center gap-1.5 text-xs text-gray-300">
            <span className="px-2 py-0.5 rounded-md bg-[#13161f] border border-[#2c3345] font-medium text-gray-300 flex items-center gap-1">
              <span className="text-orange-400">❖</span>
              {ticket.stationName || "Chung"}
            </span>
          </div>

          <div
            className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${statusBadge.class}`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${statusBadge.dot}`} />
            <span>{statusBadge.label}</span>
          </div>
        </div>

        {/* Priority Urgent Banner */}
        {isUrgent && (
          <div className="flex items-center justify-center gap-1.5 py-1 px-2.5 rounded-lg bg-rose-500/20 text-rose-300 border border-rose-500/40 text-xs font-black uppercase tracking-wider shadow-sm animate-pulse">
            <Flame size={14} className="text-rose-400 fill-rose-400" />
            <span>Ưu tiên hỏa tốc</span>
          </div>
        )}
      </div>

      {/* Ticket Items (Body) */}
      <div className="p-3.5 flex flex-col gap-2 overflow-y-auto max-h-[320px] min-h-[80px] bg-[#141720]/80">
        {ticket.items.map((item) => (
          <div
            key={item.id}
            className="flex items-start gap-3 p-2.5 rounded-xl bg-[#1d222e] hover:bg-[#232938] border border-[#2b3244] transition-colors shrink-0"
          >
            {/* Quantity Badge */}
            <div className="shrink-0 flex items-center justify-center w-8 h-8 rounded-lg bg-amber-500/20 text-amber-300 font-mono font-black text-sm border border-amber-500/35 shadow-inner">
              {item.quantity}x
            </div>

            {/* Dish details */}
            <div className="flex-1 min-w-0 flex flex-col gap-1">
              <div className="flex items-baseline gap-1.5 flex-wrap">
                <span className="font-bold text-gray-100 text-sm leading-snug">
                  {item.productName}
                </span>
                {item.variantName && (
                  <span className="text-[11px] font-medium text-sky-400 bg-sky-500/10 px-1.5 py-0.5 rounded border border-sky-500/20">
                    {item.variantName}
                  </span>
                )}
              </div>

              {/* Modifiers */}
              {item.modifiers && item.modifiers.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-0.5">
                  {item.modifiers.map((mod, idx) => (
                    <span
                      key={idx}
                      className="text-[11px] font-medium text-gray-300 bg-[#282f40] px-2 py-0.5 rounded-md border border-white/5"
                    >
                      + {mod}
                    </span>
                  ))}
                </div>
              )}

              {/* Notes */}
              {item.notes && (
                <div className="flex items-center gap-1.5 mt-1 text-xs text-amber-300 bg-amber-500/10 px-2.5 py-1 rounded-lg border border-amber-500/25 font-medium">
                  <AlertCircle size={13} className="text-amber-400 shrink-0" />
                  <span className="italic">{item.notes}</span>
                </div>
              )}
            </div>
          </div>
        ))}

        {ticket.items.length === 0 && (
          <div className="flex flex-col items-center justify-center py-6 text-gray-500 text-xs italic">
            <UtensilsCrossed size={20} className="mb-1 opacity-40" />
            <span>Không có món cụ thể</span>
          </div>
        )}
      </div>

      {/* Ticket Actions (Footer) */}
      <div className="p-3 bg-[#1a1e29] border-t border-[#2a3040] flex items-center gap-2 shrink-0">
        {ticket.status === KitchenOrderStatus.New && (
          <>
            <button
              type="button"
              disabled={isProcessing}
              onClick={() => onAccept(ticket.id, ticket.version)}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl font-bold text-sm text-white bg-gradient-to-r from-sky-600 via-blue-600 to-indigo-600 hover:from-sky-500 hover:via-blue-500 hover:to-indigo-500 shadow-md shadow-blue-500/20 active:scale-[0.98] transition-all disabled:opacity-50 cursor-pointer"
            >
              <Check size={16} className="stroke-[2.5]" />
              <span>Nhận đơn</span>
            </button>
            <button
              type="button"
              disabled={isProcessing}
              title="Hủy vé chế biến này"
              onClick={() => onCancel(ticket.id, ticket.version)}
              className="p-2.5 rounded-xl text-rose-400 hover:text-rose-300 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 active:scale-95 transition-all disabled:opacity-50 cursor-pointer"
            >
              <X size={16} />
            </button>
          </>
        )}

        {ticket.status === KitchenOrderStatus.Accepted && (
          <button
            type="button"
            disabled={isProcessing}
            onClick={() => onStart(ticket.id, ticket.version)}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl font-bold text-sm text-white bg-gradient-to-r from-amber-500 via-orange-500 to-red-500 hover:from-amber-400 hover:via-orange-400 hover:to-red-400 shadow-md shadow-orange-500/25 active:scale-[0.98] transition-all disabled:opacity-50 cursor-pointer"
          >
            <Play size={16} className="fill-white stroke-none" />
            <span>Bắt đầu nấu món</span>
          </button>
        )}

        {ticket.status === KitchenOrderStatus.Preparing && (
          <button
            type="button"
            disabled={isProcessing}
            onClick={() => onReady(ticket.id, ticket.version)}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl font-bold text-sm text-white bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 hover:from-emerald-500 hover:via-teal-500 hover:to-cyan-500 shadow-md shadow-emerald-500/25 active:scale-[0.98] transition-all disabled:opacity-50 cursor-pointer"
          >
            <BellRing size={16} className="animate-bounce" />
            <span>Hoàn tất / Báo phục vụ</span>
          </button>
        )}

        {ticket.status === KitchenOrderStatus.Ready && (
          <button
            type="button"
            disabled={isProcessing}
            onClick={() => onComplete(ticket.id, ticket.version)}
            className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl font-bold text-sm text-white bg-gradient-to-r from-purple-600 via-indigo-600 to-blue-600 hover:from-purple-500 hover:via-indigo-500 hover:to-blue-500 shadow-md shadow-purple-500/25 active:scale-[0.98] transition-all disabled:opacity-50 cursor-pointer"
          >
            <ChefHat size={16} />
            <span>Đã giao món (Lưu trữ)</span>
          </button>
        )}
      </div>
    </div>
  );
}
