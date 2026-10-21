"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { recipeApi } from "@/lib/api/recipe-api";
import { inventoryApi } from "@/lib/api/inventory-api";
import {
  X,
  Plus,
  Trash2,
  Save,
  AlertTriangle,
  CheckCircle2,
  Scale,
  Sparkles,
  Calculator,
  RefreshCw,
  Info,
} from "lucide-react";
import type { RecipeDto, SaveRecipeItemRequest } from "@/types/recipe";

interface Props {
  open: boolean;
  onClose: () => void;
  productId: string;
  productName: string;
  branchId: string;
  variants?: { id: string; name: string; price: number }[];
}

interface FormRecipeItem {
  ingredientId: string;
  unitName: string;
  quantity: number;
  wastePercentage: number;
}

export function ProductRecipeModal({
  open,
  onClose,
  productId,
  productName,
  branchId,
  variants = [],
}: Props) {
  const queryClient = useQueryClient();
  const [selectedVariantId, setSelectedVariantId] = useState<string>("");
  const [items, setItems] = useState<FormRecipeItem[]>([]);
  const [recipeName, setRecipeName] = useState("");
  const [plannedDishes, setPlannedDishes] = useState<number>(10);
  const [notice, setNotice] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const showToast = (type: "success" | "error", text: string) => {
    setNotice({ type, text });
    setTimeout(() => setNotice(null), 3500);
  };

  // Lấy danh mục nguyên liệu từ kho
  const { data: inventoryItems = [] } = useQuery({
    queryKey: ["inventory-items-for-recipe", branchId],
    queryFn: () => (branchId ? inventoryApi.getItems({ branchId }) : Promise.resolve([])),
    enabled: Boolean(branchId) && open,
  });

  // Lấy công thức hiện tại của món
  const { data: currentRecipe, isLoading: isRecipeLoading } = useQuery<RecipeDto | null>({
    queryKey: ["recipe-by-product", productId, selectedVariantId],
    queryFn: async () => {
      try {
        return await recipeApi.getByProduct(productId, selectedVariantId || undefined);
      } catch {
        return null;
      }
    },
    enabled: Boolean(productId) && open,
  });

  // Điền dữ liệu khi load xong công thức
  useEffect(() => {
    if (currentRecipe) {
      setRecipeName(currentRecipe.name || `Công thức - ${productName}`);
      setItems(
        currentRecipe.items.map((i) => ({
          ingredientId: i.ingredientId,
          unitName: i.unitName,
          quantity: i.quantity,
          wastePercentage: i.wastePercentage || 0,
        }))
      );
    } else {
      setRecipeName(`Công thức - ${productName}`);
      setItems([]);
    }
  }, [currentRecipe, productName]);

  // Kiểm tra tồn kho dự kiến
  const { data: stockCheck, isLoading: isCheckingStock } = useQuery({
    queryKey: ["check-stock-for-recipe", branchId, productId, selectedVariantId, plannedDishes],
    queryFn: () =>
      recipeApi.checkStock({
        branchId,
        productId,
        variantId: selectedVariantId || undefined,
        quantity: plannedDishes,
      }),
    enabled: Boolean(branchId) && Boolean(productId) && open && items.length > 0 && plannedDishes > 0,
  });

  // Mutation Lưu công thức
  const saveMutation = useMutation({
    mutationFn: (payload: {
      productId: string;
      productVariantId?: string | null;
      name?: string;
      items: SaveRecipeItemRequest[];
    }) => recipeApi.saveRecipe(payload),
    onSuccess: () => {
      showToast("success", "Đã lưu công thức định lượng thành công!");
      queryClient.invalidateQueries({ queryKey: ["recipe-by-product", productId] });
      queryClient.invalidateQueries({ queryKey: ["recipes-all"] });
    },
    onError: (err: any) => {
      showToast("error", err?.message || "Lỗi lưu công thức định lượng.");
    },
  });

  // Mutation Xóa công thức
  const deleteMutation = useMutation({
    mutationFn: (recipeId: string) => recipeApi.deleteRecipe(recipeId),
    onSuccess: () => {
      showToast("success", "Đã gỡ công thức nguyên liệu.");
      setItems([]);
      queryClient.invalidateQueries({ queryKey: ["recipe-by-product", productId] });
      queryClient.invalidateQueries({ queryKey: ["recipes-all"] });
    },
    onError: (err: any) => {
      showToast("error", err?.message || "Lỗi khi gỡ công thức.");
    },
  });

  if (!open) return null;

  const handleAddItem = () => {
    if (inventoryItems.length === 0) {
      showToast("error", "Kho chưa có nguyên liệu nào. Hãy thêm nguyên liệu vào kho trước.");
      return;
    }
    const defaultIng = inventoryItems[0];
    setItems((prev) => [
      ...prev,
      {
        ingredientId: defaultIng.ingredientId,
        unitName: defaultIng.unitName,
        quantity: 1,
        wastePercentage: 0,
      },
    ]);
  };

  const handleRemoveItem = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  };

  const handleItemChange = (index: number, field: keyof FormRecipeItem, value: any) => {
    setItems((prev) =>
      prev.map((item, i) => {
        if (i !== index) return item;
        if (field === "ingredientId") {
          const matched = inventoryItems.find((inv) => inv.ingredientId === value);
          return {
            ...item,
            ingredientId: value,
            unitName: matched?.unitName || item.unitName,
          };
        }
        return { ...item, [field]: value };
      })
    );
  };

  const handleSave = () => {
    if (items.length === 0) {
      showToast("error", "Vui lòng thêm ít nhất một nguyên liệu vào công thức.");
      return;
    }

    for (const it of items) {
      if (it.quantity <= 0) {
        showToast("error", "Định lượng nguyên liệu phải lớn hơn 0.");
        return;
      }
    }

    saveMutation.mutate({
      productId,
      productVariantId: selectedVariantId || null,
      name: recipeName.trim(),
      items: items.map((i) => ({
        ingredientId: i.ingredientId,
        unitName: i.unitName,
        quantity: Number(i.quantity),
        wastePercentage: Number(i.wastePercentage) || 0,
      })),
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-4xl bg-surface border border-line-strong rounded-3xl shadow-2xl flex flex-col max-h-[92vh] overflow-hidden">
        {/* Header */}
        <div className="px-6 py-5 bg-surface-raised border-b border-line flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/15 text-amber-400 flex items-center justify-center border border-amber-500/30">
              <Scale size={20} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-ink">Định lượng nguyên liệu</h3>
                {currentRecipe && (
                  <span className="px-2 py-0.5 rounded-full text-[11px] font-mono font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                    Phiên bản v{currentRecipe.versionNumber}
                  </span>
                )}
              </div>
              <p className="text-xs text-ink-secondary">
                Món: <span className="font-semibold text-amber-400">{productName}</span> &bull; Tự
                động trừ tồn kho khi bếp chế biến hoàn tất
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-subtle hover:text-ink hover:bg-surface-hover transition-colors"
          >
            <X size={18} />
          </button>
        </div>

        {/* Toast */}
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

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Top Options: Variant selector + Recipe name */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-surface-raised p-4 rounded-2xl border border-line">
            {variants.length > 0 && (
              <div>
                <label className="block text-xs font-bold text-ink-secondary mb-1">
                  Biến thể áp dụng
                </label>
                <select
                  value={selectedVariantId}
                  onChange={(e) => setSelectedVariantId(e.target.value)}
                  className="w-full text-xs px-3 py-2 rounded-xl bg-surface border border-line text-ink focus:border-amber-500 outline-none"
                >
                  <option value="">Công thức chung (Áp dụng tất cả biến thể)</option>
                  {variants.map((v) => (
                    <option key={v.id} value={v.id}>
                      Biến thể: {v.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className={variants.length === 0 ? "md:col-span-2" : ""}>
              <label className="block text-xs font-bold text-ink-secondary mb-1">
                Tên công thức
              </label>
              <input
                type="text"
                value={recipeName}
                onChange={(e) => setRecipeName(e.target.value)}
                placeholder="VD: Công thức Bò Lúc Lắc chuẩn"
                className="w-full text-xs px-3 py-2 rounded-xl bg-surface border border-line text-ink focus:border-amber-500 outline-none"
              />
            </div>
          </div>

          {/* Recipe Items Table */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-sm font-bold text-ink flex items-center gap-1.5">
                  <span>Nguyên liệu cấu thành 1 đơn vị món</span>
                  <span className="text-xs text-subtle font-normal">({items.length} thành phần)</span>
                </h4>
                <p className="text-[11px] text-subtle">
                  Định lượng tính cho 1 đĩa/phần ăn. Tự động quy đổi đơn vị với tồn kho (g &harr; kg, ml &harr; lít).
                </p>
              </div>

              <button
                type="button"
                onClick={handleAddItem}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500 text-black text-xs font-bold hover:bg-amber-400 active:scale-95 transition-all shadow-md shadow-amber-500/20"
              >
                <Plus size={14} />
                <span>Thêm nguyên liệu</span>
              </button>
            </div>

            {items.length === 0 ? (
              <div className="py-12 border-2 border-dashed border-line rounded-2xl flex flex-col items-center justify-center text-subtle text-xs gap-2">
                <Scale size={32} className="opacity-30 text-amber-500" />
                <span className="font-medium text-ink-secondary">Món này chưa có định lượng nguyên liệu</span>
                <span className="text-[11px]">Nhấn nút &ldquo;Thêm nguyên liệu&rdquo; để bắt đầu xây dựng công thức</span>
              </div>
            ) : (
              <div className="overflow-x-auto border border-line rounded-2xl">
                <table className="w-full text-xs text-left border-collapse">
                  <thead>
                    <tr className="bg-surface-raised border-b border-line text-muted font-bold text-[11px] uppercase tracking-wider">
                      <th className="py-3 px-4">Nguyên liệu từ kho</th>
                      <th className="py-3 px-3 w-32">Định lượng / 1 món</th>
                      <th className="py-3 px-3 w-28">Đơn vị</th>
                      <th className="py-3 px-3 w-28">Hao hụt (%)</th>
                      <th className="py-3 px-3 w-32">Tiêu hao thực tế</th>
                      <th className="py-3 px-2 w-12 text-center">Xóa</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {items.map((item, idx) => {
                      const effQty = Number(
                        (item.quantity * (1 + (item.wastePercentage || 0) / 100)).toFixed(4)
                      );

                      return (
                        <tr key={idx} className="hover:bg-surface-hover/50 transition-colors">
                          {/* Ingredient Selector */}
                          <td className="py-3 px-4">
                            <select
                              value={item.ingredientId}
                              onChange={(e) => handleItemChange(idx, "ingredientId", e.target.value)}
                              className="w-full text-xs px-2.5 py-1.5 rounded-lg bg-surface border border-line text-ink font-medium focus:border-amber-500 outline-none"
                            >
                              {inventoryItems.map((inv) => (
                                <option key={inv.id} value={inv.ingredientId}>
                                  {inv.ingredientName} ({inv.ingredientCode}) &bull; Tồn:{" "}
                                  {inv.currentQuantity} {inv.unitName}
                                </option>
                              ))}
                            </select>
                          </td>

                          {/* Quantity */}
                          <td className="py-3 px-3">
                            <input
                              type="number"
                              min="0.001"
                              step="any"
                              value={item.quantity}
                              onChange={(e) =>
                                handleItemChange(idx, "quantity", parseFloat(e.target.value) || 0)
                              }
                              className="w-full text-xs px-2.5 py-1.5 rounded-lg bg-surface border border-line text-ink font-mono font-bold focus:border-amber-500 outline-none"
                            />
                          </td>

                          {/* Unit */}
                          <td className="py-3 px-3">
                            <input
                              type="text"
                              value={item.unitName}
                              onChange={(e) => handleItemChange(idx, "unitName", e.target.value)}
                              placeholder="g, kg, ml..."
                              className="w-full text-xs px-2.5 py-1.5 rounded-lg bg-surface border border-line text-ink focus:border-amber-500 outline-none font-medium"
                            />
                          </td>

                          {/* Waste % */}
                          <td className="py-3 px-3">
                            <div className="flex items-center gap-1">
                              <input
                                type="number"
                                min="0"
                                max="100"
                                value={item.wastePercentage}
                                onChange={(e) =>
                                  handleItemChange(
                                    idx,
                                    "wastePercentage",
                                    parseFloat(e.target.value) || 0
                                  )
                                }
                                className="w-full text-xs px-2.5 py-1.5 rounded-lg bg-surface border border-line text-ink font-mono focus:border-amber-500 outline-none"
                              />
                              <span className="text-muted text-[11px]">%</span>
                            </div>
                          </td>

                          {/* Effective Quantity */}
                          <td className="py-3 px-3">
                            <span className="font-mono font-bold text-amber-400">
                              {effQty} {item.unitName}
                            </span>
                          </td>

                          {/* Remove */}
                          <td className="py-3 px-2 text-center">
                            <button
                              type="button"
                              onClick={() => handleRemoveItem(idx)}
                              className="p-1 rounded-lg text-subtle hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                              title="Xóa nguyên liệu này"
                            >
                              <Trash2 size={14} />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Stock Simulation Calculator */}
          {items.length > 0 && (
            <div className="p-4 bg-surface-raised border border-line-strong rounded-2xl space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2">
                  <Calculator size={16} className="text-amber-400" />
                  <span className="text-xs font-bold text-ink">
                    Tính toán & Kiểm tra tồn kho dự kiến
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted">Số lượng món dự kiến làm:</span>
                  <input
                    type="number"
                    min="1"
                    value={plannedDishes}
                    onChange={(e) => setPlannedDishes(Math.max(1, parseInt(e.target.value) || 1))}
                    className="w-20 text-xs px-2.5 py-1 rounded-lg bg-surface border border-line text-ink font-bold font-mono focus:border-amber-500 outline-none"
                  />
                  <span className="text-xs text-muted">món</span>
                </div>
              </div>

              {stockCheck && (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 pt-1">
                  {stockCheck.ingredients.map((ing) => (
                    <div
                      key={ing.ingredientId}
                      className={`p-2.5 rounded-xl border flex flex-col gap-1 text-xs ${
                        ing.isSufficient
                          ? "bg-surface border-line"
                          : "bg-rose-950/30 border-rose-500/40"
                      }`}
                    >
                      <div className="flex items-center justify-between font-bold">
                        <span className="text-ink truncate">{ing.ingredientName}</span>
                        {ing.isSufficient ? (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-emerald-500/15 text-emerald-400 font-semibold flex items-center gap-1">
                            <CheckCircle2 size={10} /> Đủ
                          </span>
                        ) : (
                          <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-rose-500/20 text-rose-300 font-semibold flex items-center gap-1">
                            <AlertTriangle size={10} /> Thiếu
                          </span>
                        )}
                      </div>

                      <div className="text-[11px] text-muted flex justify-between">
                        <span>Cần dùng ({plannedDishes} đĩa):</span>
                        <span className="font-mono font-semibold text-ink">
                          {ing.requiredQuantity} {ing.requiredUnitName}
                        </span>
                      </div>

                      <div className="text-[11px] text-muted flex justify-between">
                        <span>Tồn kho hiện tại:</span>
                        <span
                          className={`font-mono font-bold ${
                            ing.isSufficient ? "text-emerald-400" : "text-rose-400"
                          }`}
                        >
                          {ing.currentStock} {ing.stockUnitName}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-4 bg-surface-raised border-t border-line flex items-center justify-between shrink-0">
          <div>
            {currentRecipe && (
              <button
                type="button"
                onClick={() => {
                  if (confirm("Bạn có chắc chắn muốn gỡ bỏ công thức nguyên liệu này?")) {
                    deleteMutation.mutate(currentRecipe.id);
                  }
                }}
                disabled={deleteMutation.isPending}
                className="text-xs text-rose-400 hover:text-rose-300 hover:underline flex items-center gap-1"
              >
                <Trash2 size={13} />
                <span>Gỡ công thức</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-bold text-muted hover:text-ink hover:bg-surface-hover border border-line transition-all"
            >
              Đóng
            </button>

            <button
              type="button"
              onClick={handleSave}
              disabled={saveMutation.isPending}
              className="inline-flex items-center gap-2 px-5 py-2 rounded-xl text-xs font-bold text-black bg-amber-500 hover:bg-amber-400 active:scale-95 transition-all shadow-lg shadow-amber-500/25 disabled:opacity-50"
            >
              {saveMutation.isPending ? (
                <>
                  <RefreshCw size={14} className="animate-spin" />
                  <span>Đang lưu...</span>
                </>
              ) : (
                <>
                  <Save size={14} />
                  <span>Lưu công thức định lượng</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
