"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { recipeApi } from "@/lib/api/recipe-api";
import {
  X,
  RefreshCw,
  AlertTriangle,
  Flame,
  CheckCircle2,
  UtensilsCrossed,
} from "lucide-react";
import type { KitchenOrderItem } from "@/types/kitchen";

interface Props {
  open: boolean;
  onClose: () => void;
  branchId: string;
  kitchenOrderId: string;
  orderNumber: string;
  tableNumber?: string | null;
  items: KitchenOrderItem[];
}

export function KitchenReCookModal({
  open,
  onClose,
  branchId,
  kitchenOrderId,
  orderNumber,
  tableNumber,
  items,
}: Props) {
  const queryClient = useQueryClient();
  const [selectedItemId, setSelectedItemId] = useState<string>(items[0]?.id || "");
  const [actionType, setActionType] = useState<"RECOOK" | "WASTE">("RECOOK");
  const [reason, setReason] = useState("");
  const [wasteQuantity, setWasteQuantity] = useState("1");
  const [notice, setNotice] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const selectedItem = items.find((i) => i.id === selectedItemId) || items[0];

  const reCookMutation = useMutation({
    mutationFn: () =>
      recipeApi.recordReCook({
        kitchenOrderId,
        kitchenOrderItemId: selectedItemId,
        reason: reason.trim() || "Bếp làm lại món",
      }),
    onSuccess: (res) => {
      setNotice({
        type: "success",
        text: `Đã ghi nhận làm lại món thành công! Đã trừ bổ sung ${res.transactionsCreated} nguyên liệu kho.`,
      });
      queryClient.invalidateQueries({ queryKey: ["inventory-transactions"] });
      queryClient.invalidateQueries({ queryKey: ["inventory-items"] });
      setTimeout(() => {
        onClose();
      }, 1800);
    },
    onError: (err: any) => {
      setNotice({ type: "error", text: err?.message || "Lỗi khi ghi nhận làm lại món." });
    },
  });

  const wasteMutation = useMutation({
    mutationFn: () =>
      recipeApi.recordWaste({
        branchId,
        kitchenOrderId,
        productId: selectedItem?.productId,
        quantity: parseFloat(wasteQuantity) || 1,
        reason: reason.trim() || "Bếp làm hỏng món",
      }),
    onSuccess: (res) => {
      setNotice({
        type: "success",
        text: `Đã ghi nhận hao hụt hỏng món thành công! (${res.transactionsCreated} nguyên liệu tiêu hao).`,
      });
      queryClient.invalidateQueries({ queryKey: ["inventory-transactions"] });
      queryClient.invalidateQueries({ queryKey: ["inventory-items"] });
      setTimeout(() => {
        onClose();
      }, 1800);
    },
    onError: (err: any) => {
      setNotice({ type: "error", text: err?.message || "Lỗi khi ghi nhận hao hụt món." });
    },
  });

  if (!open) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!reason.trim()) {
      setNotice({ type: "error", text: "Vui lòng nhập lý do làm lại hoặc hao hụt." });
      return;
    }

    if (actionType === "RECOOK") {
      reCookMutation.mutate();
    } else {
      wasteMutation.mutate();
    }
  };

  const isPending = reCookMutation.isPending || wasteMutation.isPending;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-surface border border-line-strong rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 bg-surface-raised border-b border-line flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-amber-500/15 text-amber-400 flex items-center justify-center border border-amber-500/30">
              <RefreshCw size={18} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-ink">Báo hỏng / Làm lại món</h3>
              <p className="text-[11px] text-ink-secondary">
                {tableNumber ? `Bàn ${tableNumber}` : "Tại bàn"} &bull; Đơn: #{orderNumber}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-subtle hover:text-ink hover:bg-surface-hover"
          >
            <X size={18} />
          </button>
        </div>

        {notice && (
          <div
            className={`mx-6 mt-4 p-3 rounded-xl text-xs flex items-center gap-2 border font-medium ${
              notice.type === "success"
                ? "bg-emerald-950/60 text-emerald-300 border-emerald-500/40"
                : "bg-rose-950/60 text-rose-300 border-rose-500/40"
            }`}
          >
            {notice.type === "success" ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
            <span>{notice.text}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          {/* Action Type Tabs */}
          <div className="grid grid-cols-2 gap-2 p-1 bg-surface-raised rounded-xl border border-line">
            <button
              type="button"
              onClick={() => setActionType("RECOOK")}
              className={`py-2 px-3 rounded-lg font-bold transition-all flex items-center justify-center gap-1.5 ${
                actionType === "RECOOK"
                  ? "bg-amber-500 text-black shadow-sm"
                  : "text-ink-secondary hover:text-ink"
              }`}
            >
              <RefreshCw size={13} />
              <span>Làm lại món ăn</span>
            </button>

            <button
              type="button"
              onClick={() => setActionType("WASTE")}
              className={`py-2 px-3 rounded-lg font-bold transition-all flex items-center justify-center gap-1.5 ${
                actionType === "WASTE"
                  ? "bg-rose-600 text-white shadow-sm"
                  : "text-ink-secondary hover:text-ink"
              }`}
            >
              <Flame size={13} />
              <span>Ghi nhận hao hụt</span>
            </button>
          </div>

          {/* Select Dish */}
          <div>
            <label className="block text-xs font-bold text-ink-secondary mb-1">
              Chọn món cần xử lý
            </label>
            <select
              value={selectedItemId}
              onChange={(e) => setSelectedItemId(e.target.value)}
              className="w-full text-xs px-3 py-2 rounded-xl bg-surface border border-line text-ink font-medium focus:border-amber-500 outline-none"
            >
              {items.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.quantity}x {item.productName}{" "}
                  {item.variantName ? `(${item.variantName})` : ""}
                </option>
              ))}
            </select>
          </div>

          {actionType === "WASTE" && (
            <div>
              <label className="block text-xs font-bold text-ink-secondary mb-1">
                Số lượng đĩa / phần bị hỏng
              </label>
              <input
                type="number"
                min="0.5"
                step="any"
                value={wasteQuantity}
                onChange={(e) => setWasteQuantity(e.target.value)}
                className="w-full text-xs px-3 py-2 rounded-xl bg-surface border border-line text-ink font-mono font-bold focus:border-amber-500 outline-none"
              />
            </div>
          )}

          {/* Reason */}
          <div>
            <label className="block text-xs font-bold text-ink-secondary mb-1">
              Lý do thực tế <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="VD: Cháy khét, đổ vỡ, khách đổi ý không ớt..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full text-xs px-3 py-2 rounded-xl bg-surface border border-line text-ink focus:border-amber-500 outline-none"
            />
            <p className="text-[11px] text-subtle mt-1">
              Lý do và lượng nguyên liệu tiêu hao sẽ được lưu vào lịch sử kho minh bạch.
            </p>
          </div>

          {/* Submit */}
          <div className="flex items-center justify-end gap-2.5 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-bold text-muted hover:text-ink hover:bg-surface-hover border border-line"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={isPending}
              className={`px-5 py-2 rounded-xl text-xs font-bold transition-all shadow-md active:scale-95 disabled:opacity-50 flex items-center gap-1.5 ${
                actionType === "RECOOK"
                  ? "bg-amber-500 text-black hover:bg-amber-400 shadow-amber-500/20"
                  : "bg-rose-600 text-white hover:bg-rose-500 shadow-rose-600/20"
              }`}
            >
              {isPending ? (
                <>
                  <RefreshCw size={13} className="animate-spin" />
                  <span>Đang xử lý...</span>
                </>
              ) : (
                <>
                  {actionType === "RECOOK" ? <RefreshCw size={13} /> : <Flame size={13} />}
                  <span>{actionType === "RECOOK" ? "Xác nhận làm lại" : "Ghi nhận hao hụt"}</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
