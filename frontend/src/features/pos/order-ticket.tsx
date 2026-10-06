"use client";

import { useState } from "react";
import { OrderStatus, OrderType, type OrderDetails } from "@/types/pos";
import {
  ChefHat,
  CreditCard,
  Trash2,
  Plus,
  Minus,
  AlertCircle,
  Clock,
  ArrowLeft,
  Receipt,
  XCircle,
  Copy,
  CheckCheck,
  UtensilsCrossed,
  ShoppingBag,
  Bike,
  QrCode,
} from "lucide-react";

type Props = {
  order: OrderDetails;
  tableName?: string;
  isSendingToKitchen: boolean;
  isProcessing: boolean;
  onSendToKitchen: () => void;
  onCompleteOrder: () => void;
  onPayWithSepay?: () => void;
  onCancelOrder: (reason: string) => void;
  onUpdateItemQuantity: (itemId: string, currentQty: number, delta: number) => void;
  onRemoveItem: (itemId: string) => void;
  onBackToFloor: () => void;
};

export function OrderTicket({
  order,
  tableName,
  isSendingToKitchen,
  isProcessing,
  onSendToKitchen,
  onCompleteOrder,
  onPayWithSepay,
  onCancelOrder,
  onUpdateItemQuantity,
  onRemoveItem,
  onBackToFloor,
}: Props) {
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [copied, setCopied] = useState(false);

  const isOpenOrDraft = order.status === OrderStatus.Draft || order.status === OrderStatus.Open;
  const isConfirmed = order.status === OrderStatus.Confirmed;
  const isPreparing = order.status === OrderStatus.Preparing;
  const isReady = order.status === OrderStatus.Ready;
  const isCompleted = order.status === OrderStatus.Completed;
  const isCancelled = order.status === OrderStatus.Cancelled;

  const getStatusBadge = () => {
    switch (order.status) {
      case OrderStatus.Draft:
      case OrderStatus.Open:
        return {
          label: "Đang chọn món",
          class: "bg-sky-500/15 text-sky-300 border-sky-500/30",
          dot: "bg-sky-400 animate-ping",
        };
      case OrderStatus.Confirmed:
        return {
          label: "Đã gửi bếp",
          class: "bg-amber-500/15 text-amber-300 border-amber-500/30",
          dot: "bg-amber-400",
        };
      case OrderStatus.Preparing:
        return {
          label: "Bếp đang nấu",
          class: "bg-orange-500/20 text-orange-300 border-orange-500/40 shadow-sm",
          dot: "bg-orange-400 animate-pulse",
        };
      case OrderStatus.Ready:
        return {
          label: "Món đã xong",
          class: "bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-sm",
          dot: "bg-emerald-400",
        };
      case OrderStatus.Completed:
        return {
          label: "Đã thanh toán",
          class: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
          dot: "bg-emerald-400",
        };
      case OrderStatus.Cancelled:
        return {
          label: "Đã hủy đơn",
          class: "bg-rose-500/15 text-rose-300 border-rose-500/30",
          dot: "bg-rose-400",
        };
      default:
        return {
          label: "Chưa xác định",
          class: "bg-gray-500/15 text-gray-300 border-gray-500/30",
          dot: "bg-gray-400",
        };
    }
  };

  const statusBadge = getStatusBadge();

  const handleConfirmCancel = () => {
    if (!cancelReason.trim()) return;
    onCancelOrder(cancelReason.trim());
    setCancelModalOpen(false);
  };

  const copyOrderNo = () => {
    navigator.clipboard?.writeText(order.orderNumber);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isTakeaway = order.orderType === OrderType.Takeaway;
  const isDelivery = order.orderType === OrderType.Delivery;

  return (
    <div className="flex flex-col rounded-2xl bg-[#151923] border border-[#272e3f] shadow-2xl overflow-hidden sticky top-4 max-h-[calc(100vh-100px)]">
      {/* Ticket Header */}
      <div className="p-4 bg-gradient-to-r from-[#1c2230] via-[#1a202d] to-[#151923] border-b border-[#283144] flex flex-col gap-3">
        <div className="flex items-center justify-between gap-2">
          {/* Back button & Table Identifier */}
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onBackToFloor}
              className="p-1.5 rounded-lg bg-[#242b3b] hover:bg-[#2e374b] text-gray-300 hover:text-white border border-[#343e54] transition-all cursor-pointer"
              title="Quay lại sơ đồ bàn"
            >
              <ArrowLeft size={16} />
            </button>

            <div>
              <div className="flex items-center gap-2">
                <span className="text-base font-black text-white tracking-tight flex items-center gap-1.5">
                  {isTakeaway ? (
                    <>
                      <ShoppingBag size={16} className="text-amber-400" />
                      <span>Mang về</span>
                    </>
                  ) : isDelivery ? (
                    <>
                      <Bike size={16} className="text-purple-400" />
                      <span>Giao hàng</span>
                    </>
                  ) : (
                    <>
                      <UtensilsCrossed size={16} className="text-sky-400" />
                      <span>{tableName || "Tại bàn"}</span>
                    </>
                  )}
                </span>
              </div>
            </div>
          </div>

          {/* Status Badge */}
          <div
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${statusBadge.class}`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${statusBadge.dot}`} />
            <span>{statusBadge.label}</span>
          </div>
        </div>

        {/* Order Meta: Code & Guest */}
        <div className="flex items-center justify-between text-xs text-gray-400 pt-1 border-t border-white/5">
          <div className="flex items-center gap-1.5">
            <span>Mã đơn:</span>
            <button
              type="button"
              onClick={copyOrderNo}
              className="inline-flex items-center gap-1 text-[11px] font-mono text-gray-300 hover:text-white bg-[#10131a] px-2 py-0.5 rounded border border-[#272e3d] transition-colors"
              title="Nhấn để sao chép mã đơn"
            >
              <span>{order.orderNumber.length > 14 ? `#${order.orderNumber.slice(-8)}` : `#${order.orderNumber}`}</span>
              {copied ? (
                <CheckCheck size={11} className="text-emerald-400" />
              ) : (
                <Copy size={11} className="opacity-50" />
              )}
            </button>
          </div>

          <div className="flex items-center gap-1 text-[11px] text-gray-400">
            <Clock size={12} className="text-gray-500" />
            <span>{new Date(order.createdAt).toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}</span>
          </div>
        </div>

        {order.notes && (
          <div className="text-xs text-amber-300/90 bg-amber-500/10 px-2.5 py-1.5 rounded-lg border border-amber-500/20 flex items-start gap-1.5">
            <span className="text-amber-400">📌</span>
            <span className="italic">{order.notes}</span>
          </div>
        )}
      </div>

      {/* Ticket Items List */}
      <div className="p-3.5 flex-1 flex flex-col gap-2.5 overflow-y-auto max-h-[380px] bg-[#12151e]/80">
        {order.items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
            <div className="w-12 h-12 rounded-xl bg-[#1a202c] border border-[#2b3345] flex items-center justify-center text-gray-500 mb-2">
              <Receipt size={22} className="opacity-60" />
            </div>
            <p className="text-xs font-bold text-gray-300">Chưa có món nào trong đơn</p>
            <p className="text-[11px] text-gray-500 mt-1 max-w-[200px]">
              Chọn món ăn từ thực đơn bên trái để thêm vào hóa đơn bàn này.
            </p>
          </div>
        ) : (
          order.items.map((item) => (
            <div
              key={item.id}
              className="p-3 rounded-xl bg-[#1b202c] hover:bg-[#202635] border border-[#2a3244] transition-all flex flex-col gap-2"
            >
              {/* Item Top: Name & Total Line Price */}
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-1.5 flex-wrap">
                    <span className="font-bold text-gray-100 text-sm leading-snug">
                      {item.productNameSnapshot}
                    </span>
                    {item.variantNameSnapshot && (
                      <span className="text-[11px] font-medium text-sky-400 bg-sky-500/10 px-1.5 py-0.2 rounded border border-sky-500/20">
                        {item.variantNameSnapshot}
                      </span>
                    )}
                  </div>

                  {item.modifiers && item.modifiers.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {item.modifiers.map((m) => (
                        <span
                          key={m.id}
                          className="text-[10px] font-medium text-gray-300 bg-[#262d3e] px-1.5 py-0.5 rounded border border-white/5"
                        >
                          + {m.modifierNameSnapshot}{" "}
                          {m.totalPrice > 0 && `(${m.totalPrice.toLocaleString("vi-VN")} ₫)`}
                        </span>
                      ))}
                    </div>
                  )}

                  {item.notes && (
                    <div className="text-[11px] text-amber-300/80 italic mt-0.5">
                      Ghi chú: {item.notes}
                    </div>
                  )}
                </div>

                <div className="text-right shrink-0">
                  <span className="font-mono font-bold text-sm text-amber-300">
                    {item.lineTotal.toLocaleString("vi-VN")} ₫
                  </span>
                </div>
              </div>

              {/* Item Bottom: Unit Price & Stepper / Quantity */}
              <div className="flex items-center justify-between gap-2 pt-2 border-t border-white/5 text-xs text-gray-400">
                <span className="text-[11px]">
                  {item.unitPrice.toLocaleString("vi-VN")} ₫ / phần
                </span>

                <div className="flex items-center gap-2">
                  {isOpenOrDraft ? (
                    <>
                      {/* Quantity Stepper */}
                      <div className="flex items-center rounded-lg bg-[#12151e] border border-[#2e374a] overflow-hidden">
                        <button
                          type="button"
                          disabled={isProcessing}
                          onClick={() => onUpdateItemQuantity(item.id, item.quantity, -1)}
                          className="p-1 hover:bg-[#262e3e] text-gray-300 hover:text-white transition-colors cursor-pointer disabled:opacity-50"
                          title="Giảm 1"
                        >
                          <Minus size={13} />
                        </button>
                        <span className="font-mono font-bold text-xs px-2.5 text-white min-w-[24px] text-center">
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          disabled={isProcessing}
                          onClick={() => onUpdateItemQuantity(item.id, item.quantity, 1)}
                          className="p-1 hover:bg-[#262e3e] text-gray-300 hover:text-white transition-colors cursor-pointer disabled:opacity-50"
                          title="Tăng 1"
                        >
                          <Plus size={13} />
                        </button>
                      </div>

                      {/* Delete button */}
                      <button
                        type="button"
                        disabled={isProcessing}
                        onClick={() => onRemoveItem(item.id)}
                        className="p-1.5 rounded-lg text-rose-400 hover:text-rose-300 hover:bg-rose-500/15 border border-rose-500/20 transition-all cursor-pointer disabled:opacity-50"
                        title="Xóa món khỏi đơn"
                      >
                        <Trash2 size={13} />
                      </button>
                    </>
                  ) : (
                    <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-[#12151e] border border-[#2b3345]">
                      <span className="text-[11px] text-gray-400">Số lượng:</span>
                      <strong className="font-mono text-white text-xs">{item.quantity}</strong>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Ticket Calculation & Checkout Footer */}
      <div className="p-4 bg-[#141822] border-t border-[#262c3e] flex flex-col gap-3">
        {/* Calc Details */}
        <div className="flex flex-col gap-1.5 text-xs text-gray-300">
          <div className="flex items-center justify-between">
            <span className="text-gray-400">Tạm tính ({order.items.reduce((s, i) => s + i.quantity, 0)} món)</span>
            <span className="font-mono font-semibold text-gray-200">
              {order.subtotal.toLocaleString("vi-VN")} ₫
            </span>
          </div>

          {order.discountAmount > 0 && (
            <div className="flex items-center justify-between text-emerald-400">
              <span>Giảm giá khuyến mãi</span>
              <span className="font-mono font-semibold">
                -{order.discountAmount.toLocaleString("vi-VN")} ₫
              </span>
            </div>
          )}

          {order.taxAmount > 0 && (
            <div className="flex items-center justify-between text-gray-400">
              <span>Thuế VAT (8%)</span>
              <span className="font-mono font-semibold">
                {order.taxAmount.toLocaleString("vi-VN")} ₫
              </span>
            </div>
          )}

          {/* Total Row */}
          <div className="flex items-center justify-between pt-2.5 border-t border-[#252c3c] mt-0.5">
            <div>
              <span className="text-xs uppercase tracking-wider text-gray-300 font-bold block">
                Tổng thanh toán
              </span>
              <span className="text-[10px] text-gray-500">Đã gồm thuế &amp; phí dịch vụ</span>
            </div>
            <div className="text-right">
              <span className="text-2xl font-black font-mono text-amber-400 tracking-tight">
                {order.totalAmount.toLocaleString("vi-VN")} ₫
              </span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col gap-2 pt-1">
          {isOpenOrDraft && (
            <button
              type="button"
              disabled={isSendingToKitchen || order.items.length === 0}
              onClick={onSendToKitchen}
              className="w-full flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl font-bold text-sm text-white bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600 hover:from-orange-400 hover:to-amber-500 shadow-lg shadow-orange-500/25 active:scale-[0.98] transition-all disabled:opacity-50 cursor-pointer"
            >
              <ChefHat size={18} />
              <span>{isSendingToKitchen ? "Đang gửi sang bếp..." : "Gửi bếp ngay (Xác nhận đơn)"}</span>
            </button>
          )}

          {(isConfirmed || isPreparing || isReady) && (
            <div className="flex flex-col gap-2">
              {onPayWithSepay && (
                <button
                  type="button"
                  disabled={isProcessing}
                  onClick={onPayWithSepay}
                  className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-bold text-xs text-amber-300 bg-[#1e2538] hover:bg-[#28324a] border border-amber-500/40 hover:border-amber-400 transition-all cursor-pointer shadow-md"
                >
                  <QrCode size={16} className="text-amber-400" />
                  <span>Thanh toán SePay (VietQR / Thẻ)</span>
                </button>
              )}

              <button
                type="button"
                disabled={isProcessing}
                onClick={onCompleteOrder}
                className="w-full flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl font-black text-sm text-white bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 shadow-lg shadow-emerald-500/25 active:scale-[0.98] transition-all disabled:opacity-50 cursor-pointer"
              >
                <CreditCard size={18} />
                <span>Thanh toán Tiền mặt &amp; Trả bàn</span>
              </button>
            </div>
          )}

          {!isCompleted && !isCancelled && (
            <button
              type="button"
              onClick={() => setCancelModalOpen(true)}
              className="w-full py-2 text-xs font-semibold text-rose-400/80 hover:text-rose-300 hover:bg-rose-500/10 rounded-lg transition-colors cursor-pointer"
            >
              Hủy đơn hàng này
            </button>
          )}
        </div>
      </div>

      {/* Cancel Order Modal */}
      {cancelModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in"
          onClick={() => setCancelModalOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl bg-[#181c26] border border-[#2e374a] shadow-2xl p-5 flex flex-col gap-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-rose-500/20 text-rose-400 border border-rose-500/30">
                <XCircle size={22} />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Xác nhận hủy đơn hàng</h3>
                <p className="text-xs text-gray-400">Đơn #{order.orderNumber}</p>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-gray-300">Lý do hủy đơn *</label>
              <input
                type="text"
                className="bg-[#12151e] border border-[#2b3345] text-sm text-white rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-rose-500"
                placeholder="VD: Khách đổi ý, khách về đột xuất..."
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                autoFocus
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-white/5">
              <button
                type="button"
                className="px-4 py-2 rounded-xl text-xs font-bold text-gray-300 hover:bg-[#252c3c] transition-colors cursor-pointer"
                onClick={() => setCancelModalOpen(false)}
              >
                Đóng
              </button>
              <button
                type="button"
                disabled={!cancelReason.trim()}
                onClick={handleConfirmCancel}
                className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 disabled:opacity-50 transition-colors cursor-pointer shadow-md shadow-rose-600/30"
              >
                Xác nhận hủy đơn
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
