"use client";

import { useState } from "react";
import type { KitchenStation } from "@/types/kitchen";
import type { MenuResponse } from "@/types/pos";
import { Plus, X, Check, Utensils, Layers, ListChecks, Trash2, ShieldAlert } from "lucide-react";

type Props = {
  stations: KitchenStation[];
  menu: MenuResponse | null;
  onClose: () => void;
  onCreateStation: (payload: { code: string; name: string; description?: string }) => Promise<void>;
  onAssignProducts: (stationId: string, productIds: string[]) => Promise<void>;
  onDeleteStation?: (stationId: string) => Promise<void>;
};

export function KitchenStationModal({
  stations,
  menu,
  onClose,
  onCreateStation,
  onAssignProducts,
  onDeleteStation,
}: Props) {
  const [activeTab, setActiveTab] = useState<"list" | "create" | "assign">(
    stations.length > 0 ? "list" : "create"
  );

  // Create station form state
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  // Assign products state
  const [selectedStationId, setSelectedStationId] = useState<string>(
    stations.length > 0 ? stations[0].id : ""
  );
  const [selectedProductIds, setSelectedProductIds] = useState<string[]>([]);
  const [isAssigning, setIsAssigning] = useState(false);

  // Flatten menu products
  const allProducts = menu
    ? menu.categories.flatMap((cat) =>
        cat.products.map((p) => ({ ...p, categoryName: cat.name }))
      )
    : [];

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim() || !name.trim()) return;
    setIsSubmitting(true);
    try {
      await onCreateStation({
        code: code.trim().toUpperCase(),
        name: name.trim(),
        description: description.trim() || undefined,
      });
      setCode("");
      setName("");
      setDescription("");
      setActiveTab("list");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteStation = async (station: KitchenStation) => {
    if (!onDeleteStation) return;
    if (
      !confirm(
        `Bạn có chắc chắn muốn xóa trạm '${station.name}' (${station.code})? Mọi món ăn phân bổ vào trạm này sẽ được giải phóng.`
      )
    ) {
      return;
    }

    setDeletingId(station.id);
    setDeleteError(null);
    try {
      await onDeleteStation(station.id);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Không thể xóa trạm bếp.";
      setDeleteError(msg);
    } finally {
      setDeletingId(null);
    }
  };

  const toggleProduct = (productId: string) => {
    setSelectedProductIds((prev) =>
      prev.includes(productId) ? prev.filter((id) => id !== productId) : [...prev, productId]
    );
  };

  const handleSelectAll = () => {
    if (selectedProductIds.length === allProducts.length) {
      setSelectedProductIds([]);
    } else {
      setSelectedProductIds(allProducts.map((p) => p.id));
    }
  };

  const handleSaveAssignments = async () => {
    if (!selectedStationId) return;
    setIsAssigning(true);
    try {
      await onAssignProducts(selectedStationId, selectedProductIds);
      onClose();
    } finally {
      setIsAssigning(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl rounded-2xl bg-[#161a24] border border-[#2b3345] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-center justify-between p-5 bg-[#1c2230] border-b border-[#283042]">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-orange-500/15 text-orange-400 border border-orange-500/25">
              <Layers size={20} />
            </div>
            <div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-orange-400">
                Thiết lập Điều Phối Bếp
              </span>
              <h3 className="text-lg font-black text-white">Quản lý trạm bếp (Kitchen Stations)</h3>
            </div>
          </div>
          <button
            type="button"
            className="p-2 rounded-xl text-gray-400 hover:text-white bg-[#242b3b] hover:bg-[#2e374b] border border-[#343e54] transition-all cursor-pointer"
            onClick={onClose}
            aria-label="Đóng"
          >
            <X size={18} />
          </button>
        </div>

        {/* Tab switcher */}
        <div className="flex border-b border-[#262d3d] bg-[#12151e]">
          <button
            type="button"
            className={`flex-1 flex items-center justify-center gap-2 py-3 px-3 text-xs font-bold transition-all cursor-pointer border-b-2 ${
              activeTab === "list"
                ? "text-orange-400 border-orange-500 bg-[#191e2b]"
                : "text-gray-400 border-transparent hover:text-gray-200 hover:bg-[#151924]"
            }`}
            onClick={() => setActiveTab("list")}
          >
            <Layers size={14} />
            <span>Trạm hiện có ({stations.length})</span>
          </button>
          <button
            type="button"
            className={`flex-1 flex items-center justify-center gap-2 py-3 px-3 text-xs font-bold transition-all cursor-pointer border-b-2 ${
              activeTab === "create"
                ? "text-orange-400 border-orange-500 bg-[#191e2b]"
                : "text-gray-400 border-transparent hover:text-gray-200 hover:bg-[#151924]"
            }`}
            onClick={() => setActiveTab("create")}
          >
            <Plus size={14} />
            <span>Thêm trạm mới</span>
          </button>
          <button
            type="button"
            className={`flex-1 flex items-center justify-center gap-2 py-3 px-3 text-xs font-bold transition-all cursor-pointer border-b-2 ${
              activeTab === "assign"
                ? "text-orange-400 border-orange-500 bg-[#191e2b]"
                : "text-gray-400 border-transparent hover:text-gray-200 hover:bg-[#151924]"
            }`}
            onClick={() => setActiveTab("assign")}
          >
            <ListChecks size={14} />
            <span>Phân bổ món vào trạm</span>
          </button>
        </div>

        {/* Delete Error Notification */}
        {deleteError && (
          <div className="mx-5 mt-4 p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
            <ShieldAlert size={16} className="text-rose-400 shrink-0" />
            <span>{deleteError}</span>
          </div>
        )}

        {/* Modal Body */}
        <div className="p-5 flex-1 overflow-y-auto">
          {activeTab === "list" ? (
            <div className="flex flex-col gap-3">
              {stations.length === 0 ? (
                <div className="text-center py-10 text-gray-400 text-sm">
                  Chưa có trạm bếp nào. Hãy bấm &quot;Thêm trạm mới&quot; để thiết lập.
                </div>
              ) : (
                stations.map((st) => (
                  <div
                    key={st.id}
                    className="flex items-center justify-between p-3.5 rounded-xl bg-[#141720] border border-[#262c3c] hover:border-[#38435c] transition-all"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <span className="font-mono text-xs font-bold text-orange-400 bg-orange-500/15 px-2.5 py-1 rounded-lg border border-orange-500/30">
                        {st.code}
                      </span>
                      <div className="min-w-0">
                        <h4 className="font-bold text-sm text-gray-100 truncate">{st.name}</h4>
                        {st.description && (
                          <p className="text-xs text-gray-400 truncate mt-0.5">{st.description}</p>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {onDeleteStation && (
                        <button
                          type="button"
                          disabled={deletingId === st.id}
                          onClick={() => handleDeleteStation(st)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-rose-400 hover:text-rose-300 hover:bg-rose-500/15 border border-rose-500/25 transition-all cursor-pointer disabled:opacity-50"
                          title="Xóa trạm bếp này"
                        >
                          <Trash2 size={13} />
                          <span>{deletingId === st.id ? "Đang xóa..." : "Xóa"}</span>
                        </button>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          ) : activeTab === "create" ? (
            <form onSubmit={handleCreate} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-gray-300">
                  Mã trạm (Code) <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  className="bg-[#12151e] border border-[#2c3447] text-sm text-white font-mono uppercase rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-orange-500 transition-colors"
                  placeholder="VD: HOT, COLD, BAR, GRILL"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  required
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-gray-300">
                  Tên trạm bếp <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  className="bg-[#12151e] border border-[#2c3447] text-sm text-white rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-orange-500 transition-colors"
                  placeholder="VD: Bếp Nóng, Bếp Lạnh, Quầy Pha Chế..."
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-gray-300">Mô tả / Ghi chú</label>
                <textarea
                  rows={2}
                  className="bg-[#12151e] border border-[#2c3447] text-sm text-white rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-orange-500 transition-colors resize-none"
                  placeholder="VD: Chuyên các món chiên xào, món súp, đồ nướng..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
              </div>

              <div className="flex justify-end pt-3 border-t border-[#262d3d] mt-2">
                <button
                  type="submit"
                  disabled={isSubmitting || !code.trim() || !name.trim()}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm text-white bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-400 hover:to-amber-400 shadow-md shadow-orange-500/25 active:scale-95 transition-all disabled:opacity-50 cursor-pointer"
                >
                  <Plus size={16} />
                  <span>{isSubmitting ? "Đang tạo..." : "Tạo trạm bếp"}</span>
                </button>
              </div>
            </form>
          ) : (
            <div className="flex flex-col gap-4">
              {stations.length === 0 ? (
                <div className="text-center py-10 text-gray-400 text-sm">
                  Chưa có trạm bếp nào. Vui lòng tạo trạm bếp trước.
                </div>
              ) : (
                <>
                  <div className="flex flex-col gap-1.5">
                    <label className="text-xs font-bold text-gray-300">
                      Chọn trạm cần phân bổ món
                    </label>
                    <select
                      className="bg-[#12151e] border border-[#2c3447] text-sm text-white rounded-xl px-3.5 py-2.5 focus:outline-none focus:border-orange-500 cursor-pointer"
                      value={selectedStationId}
                      onChange={(e) => setSelectedStationId(e.target.value)}
                    >
                      {stations.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name} ({s.code})
                        </option>
                      ))}
                    </select>
                    <span className="text-[11px] text-gray-500">
                      Lưu ý: Mỗi món ăn chỉ thuộc về 1 trạm duy nhất. Khi phân bổ vào trạm này, món sẽ tự động rời khỏi trạm cũ.
                    </span>
                  </div>

                  <div className="flex justify-between items-center mt-2">
                    <label className="text-xs font-bold text-gray-300">
                      Danh sách món ăn từ thực đơn ({allProducts.length})
                    </label>
                    <button
                      type="button"
                      className="text-xs font-bold text-orange-400 hover:text-orange-300 cursor-pointer"
                      onClick={handleSelectAll}
                    >
                      {selectedProductIds.length === allProducts.length
                        ? "Bỏ chọn tất cả"
                        : "Chọn tất cả món"}
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-[320px] overflow-y-auto p-1">
                    {allProducts.map((p) => {
                      const isChecked = selectedProductIds.includes(p.id);
                      return (
                        <div
                          key={p.id}
                          className={`flex items-center gap-3 p-2.5 rounded-xl border transition-all cursor-pointer ${
                            isChecked
                              ? "bg-orange-500/10 border-orange-500/40 text-white"
                              : "bg-[#141720] border-[#262c3c] text-gray-300 hover:bg-[#1a1f2b]"
                          }`}
                          onClick={() => toggleProduct(p.id)}
                        >
                          <div
                            className={`w-5 h-5 rounded-md flex items-center justify-center border transition-colors ${
                              isChecked
                                ? "bg-orange-500 border-orange-500 text-white"
                                : "border-[#384257] bg-[#1d222e]"
                            }`}
                          >
                            {isChecked && <Check size={13} className="stroke-[3]" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <span className="block font-semibold text-xs truncate">{p.name}</span>
                            <small className="block text-[11px] text-gray-400">
                              {p.categoryName} • {p.price.toLocaleString("vi-VN")} ₫
                            </small>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  <div className="flex justify-end pt-3 border-t border-[#262d3d] mt-2">
                    <button
                      type="button"
                      disabled={isAssigning}
                      onClick={handleSaveAssignments}
                      className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm text-white bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-400 hover:to-amber-400 shadow-md shadow-orange-500/25 active:scale-95 transition-all disabled:opacity-50 cursor-pointer"
                    >
                      <Utensils size={16} />
                      <span>
                        {isAssigning
                          ? "Đang lưu..."
                          : `Lưu phân bổ (${selectedProductIds.length} món)`}
                      </span>
                    </button>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
