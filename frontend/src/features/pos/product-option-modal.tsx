"use client";

import { useState } from "react";
import type { MenuProduct, MenuVariant } from "@/types/pos";
import { Plus, Minus, X, Sparkles, Check } from "lucide-react";

type Props = {
  product: MenuProduct;
  onClose: () => void;
  onAdd: (params: {
    productId: string;
    variantId?: string | null;
    modifierIds: string[];
    quantity: number;
    notes?: string;
  }) => void;
};

export function ProductOptionModal({ product, onClose, onAdd }: Props) {
  const [selectedVariant, setSelectedVariant] = useState<MenuVariant | null>(
    product.variants.length > 0 ? product.variants[0] : null
  );
  const [selectedModifierIds, setSelectedModifierIds] = useState<string[]>([]);
  const [quantity, setQuantity] = useState(1);
  const [notes, setNotes] = useState("");

  const toggleModifier = (modifierId: string, groupMax: number) => {
    setSelectedModifierIds((prev) => {
      const exists = prev.includes(modifierId);
      if (exists) {
        return prev.filter((id) => id !== modifierId);
      }
      if (groupMax === 1) {
        return [modifierId];
      }
      return [...prev, modifierId];
    });
  };

  const basePrice = selectedVariant ? selectedVariant.price : product.price;
  const modifiersPrice = selectedModifierIds.reduce((sum, modId) => {
    for (const group of product.modifierGroups) {
      const found = group.modifiers.find((m) => m.id === modId);
      if (found) return sum + found.price;
    }
    return sum;
  }, 0);
  const unitPrice = basePrice + modifiersPrice;
  const totalPrice = unitPrice * quantity;

  const handleConfirm = () => {
    onAdd({
      productId: product.id,
      variantId: selectedVariant?.id ?? null,
      modifierIds: selectedModifierIds,
      quantity,
      notes: notes.trim() ? notes.trim() : undefined,
    });
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg rounded-2xl bg-[#161a25] border border-[#2b3347] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between p-5 bg-[#1c2231] border-b border-[#293245]">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[11px] font-mono text-gray-400 bg-[#11141c] px-2 py-0.5 rounded border border-white/5 font-semibold">
                {product.sku}
              </span>
              <span className="text-xs font-bold text-orange-400 flex items-center gap-1">
                <Sparkles size={12} /> Tùy chỉnh món
              </span>
            </div>
            <h3 className="text-lg font-black text-white">{product.name}</h3>
            {product.description && (
              <p className="text-xs text-gray-400 mt-0.5">{product.description}</p>
            )}
          </div>
          <button
            type="button"
            className="p-2 rounded-xl text-gray-400 hover:text-white bg-[#252c3c] hover:bg-[#2f384d] border border-[#374259] transition-all cursor-pointer"
            onClick={onClose}
            aria-label="Đóng"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 flex-1 overflow-y-auto flex flex-col gap-4">
          {/* Variants */}
          {product.variants.length > 0 && (
            <div className="flex flex-col gap-2">
              <label className="text-xs font-bold text-gray-300 uppercase tracking-wider">
                Chọn kích cỡ / Phân loại
              </label>
              <div className="grid grid-cols-2 gap-2">
                {product.variants.map((v) => {
                  const isSelected = selectedVariant?.id === v.id;
                  return (
                    <button
                      key={v.id}
                      type="button"
                      className={`flex items-center justify-between p-3 rounded-xl border text-xs font-bold transition-all cursor-pointer ${
                        isSelected
                          ? "bg-orange-500/15 border-orange-500 text-white shadow-sm"
                          : "bg-[#131620] border-[#293042] text-gray-300 hover:bg-[#1a1f2b]"
                      }`}
                      onClick={() => setSelectedVariant(v)}
                    >
                      <span>{v.name}</span>
                      <span className="font-mono text-amber-400 font-extrabold">
                        {v.price.toLocaleString("vi-VN")} ₫
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Modifier Groups */}
          {product.modifierGroups.map((group) => (
            <div key={group.id} className="flex flex-col gap-2">
              <div className="flex justify-between items-center">
                <label className="text-xs font-bold text-gray-300 uppercase tracking-wider flex items-center gap-1.5">
                  <span>{group.name}</span>
                  {group.isRequired && (
                    <span className="text-[10px] text-rose-400 bg-rose-500/10 px-1.5 py-0.2 rounded border border-rose-500/20 font-bold">
                      Bắt buộc
                    </span>
                  )}
                </label>
                <small className="text-[11px] text-gray-500">
                  {group.maxSelections > 1 ? `Tối đa ${group.maxSelections}` : "Chọn 1"}
                </small>
              </div>

              <div className="grid grid-cols-2 gap-2">
                {group.modifiers.map((mod) => {
                  const isChecked = selectedModifierIds.includes(mod.id);
                  return (
                    <button
                      key={mod.id}
                      type="button"
                      className={`flex items-center justify-between p-3 rounded-xl border text-xs font-medium transition-all cursor-pointer ${
                        isChecked
                          ? "bg-orange-500/15 border-orange-500 text-white shadow-sm font-bold"
                          : "bg-[#131620] border-[#293042] text-gray-300 hover:bg-[#1a1f2b]"
                      }`}
                      onClick={() => toggleModifier(mod.id, group.maxSelections)}
                    >
                      <div className="flex items-center gap-2">
                        <div
                          className={`w-4 h-4 rounded flex items-center justify-center border ${
                            isChecked
                              ? "bg-orange-500 border-orange-500 text-white"
                              : "border-[#3b455b] bg-[#1a1f2c]"
                          }`}
                        >
                          {isChecked && <Check size={11} className="stroke-[3]" />}
                        </div>
                        <span>{mod.name}</span>
                      </div>
                      {mod.price > 0 && (
                        <span className="font-mono text-amber-400 font-bold text-[11px]">
                          +{mod.price.toLocaleString("vi-VN")} ₫
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}

          {/* Notes */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-gray-300 uppercase tracking-wider">
              Ghi chú cho bếp
            </label>
            <input
              type="text"
              className="bg-[#12151e] border border-[#2b3345] text-xs text-white placeholder:text-gray-500 rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-orange-500"
              placeholder="VD: Không cay, ít đá, nhiều hành, vắt chanh riêng..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>

          {/* Quantity Row */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-[#12151e] border border-[#272e3e]">
            <span className="text-xs font-bold text-gray-300 uppercase tracking-wider">
              Số lượng
            </span>
            <div className="flex items-center rounded-lg bg-[#181c26] border border-[#2f374a] overflow-hidden">
              <button
                type="button"
                disabled={quantity <= 1}
                onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                className="p-2 hover:bg-[#283042] text-gray-300 hover:text-white transition-colors cursor-pointer disabled:opacity-40"
              >
                <Minus size={14} />
              </button>
              <span className="font-mono font-bold text-sm px-4 text-white min-w-[36px] text-center">
                {quantity}
              </span>
              <button
                type="button"
                onClick={() => setQuantity((q) => q + 1)}
                className="p-2 hover:bg-[#283042] text-gray-300 hover:text-white transition-colors cursor-pointer"
              >
                <Plus size={14} />
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-4 bg-[#141822] border-t border-[#262c3e]">
          <div>
            <span className="text-[11px] text-gray-400 block uppercase tracking-wider font-semibold">
              Tạm tính
            </span>
            <strong className="text-xl font-mono font-black text-amber-400">
              {totalPrice.toLocaleString("vi-VN")} ₫
            </strong>
          </div>
          <button
            type="button"
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm text-white bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-400 hover:to-amber-400 shadow-md shadow-orange-500/25 active:scale-95 transition-all cursor-pointer"
            onClick={handleConfirm}
          >
            <Plus size={16} />
            <span>Thêm vào đơn hàng</span>
          </button>
        </div>
      </div>
    </div>
  );
}
