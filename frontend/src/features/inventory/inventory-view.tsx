"use client";

import { useMemo, useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { inventoryApi } from "@/lib/api/inventory-api";
import { Pagination } from "@/components/common/pagination";
import { useBranch } from "@/features/branches/branch-provider";
import type { InventoryItem, CreateInventoryItemPayload, AdjustInventoryPayload } from "@/types/inventory";
import {
  Boxes,
  PackagePlus,
  ArrowUpDown,
  Search,
  Plus,
  Minus,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  History,
  X,
  Coins,
  Warehouse,
  TrendingDown,
  TrendingUp,
  Scale,
  RefreshCw,
  Clock,
  Sparkles,
  UtensilsCrossed,
} from "lucide-react";

function formatVnd(amount: number) {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
  }).format(amount);
}

function formatDate(iso: string) {
  try {
    const d = new Date(iso);
    return d.toLocaleString("vi-VN", {
      hour: "2-digit",
      minute: "2-digit",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

export function InventoryView() {
  const queryClient = useQueryClient();
  const { branches, branchId: currentBranchId } = useBranch();
  const branchId = currentBranchId || branches[0]?.id || "";

  // State
  const [activeTab, setActiveTab] = useState<"items" | "history">("items");
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [itemsPage, setItemsPage] = useState(1);
  const [historyPage, setHistoryPage] = useState(1);
  const [historySearch, setHistorySearch] = useState("");
  const [historyTypeFilter, setHistoryTypeFilter] = useState("ALL");
  const [notice, setNotice] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Reset về trang 1 khi đổi bộ lọc hoặc tìm kiếm
  useEffect(() => {
    setItemsPage(1);
  }, [search, statusFilter]);

  useEffect(() => {
    setHistoryPage(1);
  }, [historySearch, historyTypeFilter]);

  // Modals
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [adjustModalOpen, setAdjustModalOpen] = useState(false);
  const [selectedItemForAdjust, setSelectedItemForAdjust] = useState<InventoryItem | null>(null);

  // Form: Create Item
  const [createName, setCreateName] = useState("");
  const [createCode, setCreateCode] = useState("");
  const [createUnitName, setCreateUnitName] = useState("kg");
  const [createInitialQty, setCreateInitialQty] = useState("0");
  const [createInitialCost, setCreateInitialCost] = useState("0");
  const [createMinThreshold, setCreateMinThreshold] = useState("10");

  // Form: Adjust
  const [adjustItemId, setAdjustItemId] = useState("");
  const [adjustType, setAdjustType] = useState<"RECEIPT" | "ISSUE" | "COUNT">("RECEIPT");
  const [adjustQty, setAdjustQty] = useState("1");
  const [adjustUnitCost, setAdjustUnitCost] = useState("");
  const [adjustReason, setAdjustReason] = useState("");

  const showNotice = (type: "success" | "error", message: string) => {
    setNotice({ type, message });
    setTimeout(() => setNotice(null), 4000);
  };

  // Queries
  const { data: summary, isLoading: isSummaryLoading, refetch: refetchSummary } = useQuery({
    queryKey: ["inventory-summary", branchId],
    enabled: Boolean(branchId),
    queryFn: () => inventoryApi.getSummary(branchId),
  });

  const { data: items = [], isLoading: isItemsLoading, refetch: refetchItems } = useQuery({
    queryKey: ["inventory-items", branchId, search, statusFilter],
    enabled: Boolean(branchId),
    queryFn: () =>
      inventoryApi.getItems({
        branchId,
        search: search || undefined,
        status: statusFilter === "ALL" ? undefined : statusFilter,
      }),
  });

  const { data: transactions = [], isLoading: isTxLoading, refetch: refetchTx } = useQuery({
    queryKey: ["inventory-transactions", branchId],
    enabled: Boolean(branchId) && activeTab === "history",
    queryFn: () => inventoryApi.getTransactions({ branchId, limit: 100 }),
  });

  const { data: commonUnits = [] } = useQuery({
    queryKey: ["inventory-units"],
    queryFn: () => inventoryApi.getUnits(),
  });

  const PAGE_SIZE = 10;
  const paginatedItems = useMemo(() => {
    const start = (itemsPage - 1) * PAGE_SIZE;
    return items.slice(start, start + PAGE_SIZE);
  }, [items, itemsPage]);

  const filteredHistory = useMemo(() => {
    return transactions.filter((tx) => {
      const s = historySearch.trim().toLowerCase();
      const matchSearch =
        !s ||
        tx.ingredientName.toLowerCase().includes(s) ||
        (tx.reason && tx.reason.toLowerCase().includes(s)) ||
        tx.performedBy.toLowerCase().includes(s);

      if (!matchSearch) return false;

      if (historyTypeFilter === "ALL") return true;
      if (historyTypeFilter === "RECEIPT") return tx.transactionType.toLowerCase() === "receipt";
      if (historyTypeFilter === "COOKING") return tx.reason?.toLowerCase().includes("tiêu hao chế biến");
      if (historyTypeFilter === "WASTE")
        return (
          tx.reason?.toLowerCase().includes("hao hụt") ||
          tx.reason?.toLowerCase().includes("hỏng") ||
          tx.reason?.toLowerCase().includes("làm lại")
        );
      if (historyTypeFilter === "COUNT") return tx.transactionType.toLowerCase() === "count";
      return true;
    });
  }, [transactions, historySearch, historyTypeFilter]);

  const paginatedHistory = useMemo(() => {
    const start = (historyPage - 1) * PAGE_SIZE;
    return filteredHistory.slice(start, start + PAGE_SIZE);
  }, [filteredHistory, historyPage]);

  // Mutations
  const createMutation = useMutation({
    mutationFn: (payload: CreateInventoryItemPayload) => inventoryApi.createItem(payload),
    onSuccess: (newItem) => {
      showNotice("success", `Đã thêm thành công mặt hàng "${newItem.ingredientName}".`);
      setCreateModalOpen(false);
      resetCreateForm();
      queryClient.invalidateQueries({ queryKey: ["inventory-items", branchId] });
      queryClient.invalidateQueries({ queryKey: ["inventory-summary", branchId] });
    },
    onError: (err: any) => {
      showNotice("error", err?.message || "Không thể thêm mặt hàng vào kho.");
    },
  });

  const adjustMutation = useMutation({
    mutationFn: (payload: AdjustInventoryPayload) => inventoryApi.adjustStock(payload),
    onSuccess: (updated) => {
      const typeLabel =
        adjustType === "RECEIPT" ? "Nhập kho" : adjustType === "ISSUE" ? "Xuất kho" : "Kiểm kê";
      showNotice("success", `Đã thực hiện ${typeLabel} cho mặt hàng "${updated.ingredientName}".`);
      setAdjustModalOpen(false);
      resetAdjustForm();
      queryClient.invalidateQueries({ queryKey: ["inventory-items", branchId] });
      queryClient.invalidateQueries({ queryKey: ["inventory-summary", branchId] });
      queryClient.invalidateQueries({ queryKey: ["inventory-transactions", branchId] });
    },
    onError: (err: any) => {
      showNotice("error", err?.message || "Không thể điều chỉnh tồn kho.");
    },
  });

  const resetCreateForm = () => {
    setCreateName("");
    setCreateCode("");
    setCreateUnitName("kg");
    setCreateInitialQty("0");
    setCreateInitialCost("0");
    setCreateMinThreshold("10");
  };

  const resetAdjustForm = () => {
    setAdjustItemId("");
    setAdjustType("RECEIPT");
    setAdjustQty("1");
    setAdjustUnitCost("");
    setAdjustReason("");
    setSelectedItemForAdjust(null);
  };

  const openAdjustModalForItem = (
    item: InventoryItem,
    type: "RECEIPT" | "ISSUE" | "COUNT" = "RECEIPT"
  ) => {
    setSelectedItemForAdjust(item);
    setAdjustItemId(item.id);
    setAdjustType(type);
    setAdjustQty(type === "COUNT" ? String(item.currentQuantity) : "1");
    setAdjustUnitCost(type === "RECEIPT" ? String(item.averageUnitCost) : "");
    setAdjustReason(
      type === "RECEIPT"
        ? "Nhập thêm hàng từ nhà cung cấp"
        : type === "ISSUE"
        ? "Xuất kho sử dụng / hao hụt"
        : "Kiểm kê cân chỉnh số lượng thực tế"
    );
    setAdjustModalOpen(true);
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!createName.trim()) {
      showNotice("error", "Vui lòng nhập tên mặt hàng/nguyên liệu.");
      return;
    }
    if (!branchId) {
      showNotice("error", "Vui lòng chọn chi nhánh.");
      return;
    }

    createMutation.mutate({
      branchId,
      name: createName.trim(),
      code: createCode.trim() || undefined,
      unitName: createUnitName.trim() || "kg",
      initialQuantity: Math.max(0, Number(createInitialQty) || 0),
      initialCost: Math.max(0, Number(createInitialCost) || 0),
      minStockThreshold: Math.max(0, Number(createMinThreshold) || 10),
    });
  };

  const handleAdjustSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustItemId) {
      showNotice("error", "Vui lòng chọn mặt hàng cần điều chỉnh.");
      return;
    }
    const qty = Number(adjustQty);
    if (isNaN(qty) || qty < 0) {
      showNotice("error", "Số lượng không hợp lệ.");
      return;
    }
    if (adjustType !== "COUNT" && qty <= 0) {
      showNotice("error", "Số lượng nhập/xuất phải lớn hơn 0.");
      return;
    }

    adjustMutation.mutate({
      inventoryItemId: adjustItemId,
      type: adjustType,
      quantity: qty,
      unitCost: adjustType === "RECEIPT" && adjustUnitCost ? Number(adjustUnitCost) : undefined,
      reason: adjustReason.trim() || undefined,
    });
  };

  const refreshAll = () => {
    refetchSummary();
    refetchItems();
    if (activeTab === "history") refetchTx();
  };

  return (
    <div className="space-y-6">
      {/* Toast Notice */}
      {notice && (
        <div
          className={`fixed top-5 right-5 z-50 flex items-center gap-3 p-4 rounded-2xl shadow-2xl border text-sm font-bold backdrop-blur-xl animate-in slide-in-from-top-4 ${
            notice.type === "success"
              ? "bg-emerald-950/90 border-emerald-500/50 text-emerald-200"
              : "bg-rose-950/90 border-rose-500/50 text-rose-200"
          }`}
        >
          {notice.type === "success" ? (
            <CheckCircle2 size={18} className="text-emerald-400 shrink-0" />
          ) : (
            <AlertCircle size={18} className="text-rose-400 shrink-0" />
          )}
          <span>{notice.message}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-gradient-to-r from-surface via-raised to-surface p-6 rounded-3xl border border-line-strong shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 -mt-8 -mr-8 w-48 h-48 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500/20 text-amber-400 border border-amber-500/30">
              Quản trị Kho &amp; Tồn kho
            </span>
            <span className="text-xs text-muted font-mono">Quán Bếp Nhậu</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-ink font-heading tracking-tight flex items-center gap-2">
            <Boxes className="text-amber-500" size={30} /> Quản lý Tồn kho
          </h1>
          <p className="text-xs sm:text-sm text-muted mt-1 max-w-xl">
            Theo dõi nguyên vật liệu, giá trị vốn tồn kho, định mức an toàn và lịch sử biến động nhập xuất thực phẩm.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={refreshAll}
            className="p-2.5 rounded-2xl bg-raised hover:bg-surface-hover text-ink-secondary hover:text-ink border border-line-strong transition-all cursor-pointer"
            title="Làm mới dữ liệu"
          >
            <RefreshCw size={16} />
          </button>

          <button
            type="button"
            onClick={() => {
              resetAdjustForm();
              setAdjustModalOpen(true);
            }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-surface-hover hover:bg-surface-hover text-amber-300 font-bold text-xs border border-amber-500/30 transition-all cursor-pointer"
          >
            <ArrowUpDown size={15} />
            <span>Nhập / Xuất / Kiểm kê</span>
          </button>

          <button
            type="button"
            onClick={() => {
              resetCreateForm();
              setCreateModalOpen(true);
            }}
            className="flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-extrabold text-xs shadow-lg shadow-amber-950/40 active:scale-95 transition-all cursor-pointer"
          >
            <PackagePlus size={16} />
            <span>Thêm mặt hàng mới</span>
          </button>
        </div>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Items */}
        <div className="bg-surface p-5 rounded-2xl border border-line shadow-sm relative overflow-hidden group hover:border-line-strong transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-muted uppercase tracking-wider">
              Tổng mặt hàng
            </span>
            <div className="p-2.5 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <Boxes size={18} />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-black text-ink font-mono">
              {summary ? summary.totalItems : isSummaryLoading ? "..." : 0}
            </div>
            <p className="text-[11px] text-subtle mt-1">Mặt hàng &amp; nguyên liệu trong kho</p>
          </div>
        </div>

        {/* Total Stock Value */}
        <div className="bg-surface p-5 rounded-2xl border border-line shadow-sm relative overflow-hidden group hover:border-line-strong transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-muted uppercase tracking-wider">
              Tổng giá trị tồn
            </span>
            <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Coins size={18} />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-xl sm:text-2xl font-black text-emerald-400 font-mono truncate">
              {summary ? formatVnd(summary.totalInventoryValue) : isSummaryLoading ? "..." : "0 ₫"}
            </div>
            <p className="text-[11px] text-subtle mt-1">Tổng vốn lưu trữ tại kho quán</p>
          </div>
        </div>

        {/* Low Stock Alert */}
        <div className="bg-surface p-5 rounded-2xl border border-line shadow-sm relative overflow-hidden group hover:border-line-strong transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-muted uppercase tracking-wider">
              Cảnh báo sắp hết
            </span>
            <div className="p-2.5 rounded-xl bg-yellow-500/10 text-yellow-400 border border-yellow-500/20">
              <AlertTriangle size={18} />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-black text-yellow-400 font-mono">
              {summary ? summary.lowStockCount : isSummaryLoading ? "..." : 0}
            </div>
            <p className="text-[11px] text-subtle mt-1">Dưới định mức tồn an toàn</p>
          </div>
        </div>

        {/* Out of Stock */}
        <div className="bg-surface p-5 rounded-2xl border border-line shadow-sm relative overflow-hidden group hover:border-line-strong transition-all">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-muted uppercase tracking-wider">
              Hết hàng trong kho
            </span>
            <div className="p-2.5 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20">
              <AlertCircle size={18} />
            </div>
          </div>
          <div className="mt-3">
            <div className="text-2xl sm:text-3xl font-black text-rose-400 font-mono">
              {summary ? summary.outOfStockCount : isSummaryLoading ? "..." : 0}
            </div>
            <p className="text-[11px] text-subtle mt-1">Cần nhập hàng bổ sung ngay</p>
          </div>
        </div>
      </div>

      {/* Main Tabs & Filters Toolbar */}
      <div className="bg-surface p-4 rounded-3xl border border-line shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Tabs */}
        <div className="flex items-center gap-1.5 p-1 bg-well rounded-2xl border border-line shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab("items")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
              activeTab === "items"
                ? "bg-amber-500 text-white shadow-md shadow-amber-950/30"
                : "text-muted hover:text-ink"
            }`}
          >
            <Boxes size={15} />
            <span>Danh sách tồn kho</span>
            <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-black/30 font-mono">
              {items.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab("history")}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black transition-all cursor-pointer ${
              activeTab === "history"
                ? "bg-amber-500 text-white shadow-md shadow-amber-950/30"
                : "text-muted hover:text-ink"
            }`}
          >
            <History size={15} />
            <span>Lịch sử Nhập / Xuất</span>
          </button>
        </div>

        {/* Filters (only for items tab) */}
        {activeTab === "items" && (
          <div className="flex flex-wrap items-center gap-3">
            {/* Search */}
            <div className="relative min-w-[240px] flex-1 sm:flex-initial">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-subtle" size={15} />
              <input
                type="text"
                placeholder="Tìm tên mặt hàng, mã hàng..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-well text-ink text-xs pl-9 pr-4 py-2.5 rounded-2xl border border-line focus:outline-none focus:border-amber-500 transition-colors"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted hover:text-ink"
                >
                  <X size={13} />
                </button>
              )}
            </div>

            {/* Status Filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="bg-well text-ink text-xs px-3 py-2.5 rounded-2xl border border-line focus:outline-none focus:border-amber-500 cursor-pointer"
            >
              <option value="ALL">Mọi trạng thái</option>
              <option value="InStock">Còn hàng (Dồi dào)</option>
              <option value="LowStock">Cảnh báo sắp hết</option>
              <option value="OutOfStock">Hết hàng</option>
            </select>
          </div>
        )}
      </div>

      {/* Tab 1: Danh sách tồn kho */}
      {activeTab === "items" && (
        <div className="bg-surface rounded-3xl border border-line shadow-sm overflow-hidden">
          {isItemsLoading ? (
            <div className="p-12 text-center text-muted flex flex-col items-center justify-center gap-3">
              <RefreshCw className="animate-spin text-amber-500" size={24} />
              <span className="text-xs">Đang tải dữ liệu tồn kho...</span>
            </div>
          ) : items.length === 0 ? (
            <div className="p-16 text-center text-subtle flex flex-col items-center justify-center gap-3">
              <div className="p-4 rounded-3xl bg-well border border-line text-muted">
                <Boxes size={36} />
              </div>
              <div className="text-sm font-bold text-ink-secondary">Chưa có mặt hàng nào trong kho</div>
              <p className="text-xs text-subtle max-w-sm">
                Bấm nút &ldquo;Thêm mặt hàng mới&rdquo; bên trên để bắt đầu quản lý nguyên vật liệu và đồ uống của quán.
              </p>
              <button
                type="button"
                onClick={() => setCreateModalOpen(true)}
                className="mt-2 px-4 py-2 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 text-xs font-bold hover:bg-amber-500/30 transition-all cursor-pointer"
              >
                + Thêm mặt hàng đầu tiên
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-line bg-well text-muted font-bold uppercase tracking-wider text-[11px]">
                    <th className="py-4 px-5">Mã hàng</th>
                    <th className="py-4 px-5">Tên Mặt hàng / Nguyên liệu</th>
                    <th className="py-4 px-5">Đơn vị</th>
                    <th className="py-4 px-5">Số lượng tồn</th>
                    <th className="py-4 px-5">Đơn giá vốn</th>
                    <th className="py-4 px-5">Tổng giá trị</th>
                    <th className="py-4 px-5">Trạng thái</th>
                    <th className="py-4 px-5 text-right">Thao tác nhanh</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {paginatedItems.map((item) => {
                    const isOutOfStock = item.currentQuantity <= 0;
                    const isLowStock = !isOutOfStock && item.currentQuantity <= item.minStockThreshold;

                    return (
                      <tr
                        key={item.id}
                        className="hover:bg-raised transition-colors group"
                      >
                        {/* SKU */}
                        <td className="py-4 px-5">
                          <span className="font-mono font-bold px-2 py-1 rounded-md bg-raised text-amber-400 border border-line">
                            {item.ingredientCode}
                          </span>
                        </td>

                        {/* Name */}
                        <td className="py-4 px-5">
                          <div className="font-bold text-ink text-sm">
                            {item.ingredientName}
                          </div>
                          <div className="text-[11px] text-subtle flex items-center gap-1.5 mt-0.5">
                            <Warehouse size={11} />
                            <span>{item.warehouseName}</span>
                          </div>
                        </td>

                        {/* Unit */}
                        <td className="py-4 px-5">
                          <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-raised text-ink-secondary border border-line">
                            {item.unitName}
                          </span>
                        </td>

                        {/* Quantity */}
                        <td className="py-4 px-5">
                          <div className="flex items-center gap-2">
                            <span
                              className={`text-base font-black font-mono ${
                                isOutOfStock
                                  ? "text-rose-400"
                                  : isLowStock
                                  ? "text-yellow-400"
                                  : "text-emerald-400"
                              }`}
                            >
                              {item.currentQuantity.toLocaleString("vi-VN")}
                            </span>
                            <span className="text-muted text-xs">{item.unitName}</span>
                          </div>
                          {item.minStockThreshold > 0 && (
                            <div className="text-[10px] text-subtle">
                              Định mức: {item.minStockThreshold} {item.unitName}
                            </div>
                          )}
                        </td>

                        {/* Average Unit Cost */}
                        <td className="py-4 px-5 font-mono text-ink-secondary font-medium">
                          {formatVnd(item.averageUnitCost)}
                        </td>

                        {/* Total Value */}
                        <td className="py-4 px-5 font-mono font-bold text-emerald-400">
                          {formatVnd(item.totalValue)}
                        </td>

                        {/* Status */}
                        <td className="py-4 px-5">
                          {isOutOfStock ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-950/60 text-rose-300 border border-rose-600/40">
                              <AlertCircle size={12} />
                              Hết hàng
                            </span>
                          ) : isLowStock ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-yellow-950/60 text-yellow-300 border border-yellow-600/40">
                              <AlertTriangle size={12} />
                              Sắp hết ({item.currentQuantity}/{item.minStockThreshold})
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-950/60 text-emerald-300 border border-emerald-600/40">
                              <CheckCircle2 size={12} />
                              Còn hàng
                            </span>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="py-4 px-5 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => openAdjustModalForItem(item, "RECEIPT")}
                              className="px-2.5 py-1.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-bold transition-all cursor-pointer flex items-center gap-1"
                              title="Nhập thêm hàng"
                            >
                              <Plus size={12} />
                              <span>Nhập</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => openAdjustModalForItem(item, "ISSUE")}
                              className="px-2.5 py-1.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 text-xs font-bold transition-all cursor-pointer flex items-center gap-1"
                              title="Xuất hao hụt / hỏng"
                            >
                              <Minus size={12} />
                              <span>Xuất</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => openAdjustModalForItem(item, "COUNT")}
                              className="p-1.5 rounded-xl bg-raised hover:bg-surface-hover text-ink-secondary hover:text-ink border border-line-strong text-xs font-bold transition-all cursor-pointer"
                              title="Kiểm kê thực tế"
                            >
                              <Scale size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {items.length > 0 && (
            <Pagination
              currentPage={itemsPage}
              totalItems={items.length}
              pageSize={PAGE_SIZE}
              onPageChange={setItemsPage}
              itemLabel="mặt hàng"
            />
          )}
        </div>
      )}

      {/* Tab 2: Lịch sử Nhập / Xuất kho (Transactions) */}
      {activeTab === "history" && (
        <div className="space-y-4">
          {/* History Filters Toolbar */}
          <div className="bg-surface p-4 rounded-2xl border border-line flex flex-col md:flex-row items-center justify-between gap-3 shadow-xs">
            {/* Search input */}
            <div className="relative w-full md:w-80">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-subtle" size={15} />
              <input
                type="text"
                placeholder="Tìm theo nguyên liệu, món, bàn, đơn..."
                value={historySearch}
                onChange={(e) => setHistorySearch(e.target.value)}
                className="w-full text-xs pl-9 pr-8 py-2 rounded-xl bg-surface-raised border border-line text-ink placeholder:text-subtle focus:border-amber-500 outline-none"
              />
              {historySearch && (
                <button
                  type="button"
                  onClick={() => setHistorySearch("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-subtle hover:text-ink"
                >
                  <X size={14} />
                </button>
              )}
            </div>

            {/* Filter Pills */}
            <div className="flex items-center gap-1.5 flex-wrap w-full md:w-auto">
              {[
                { key: "ALL", label: "Tất cả" },
                { key: "COOKING", label: "🍳 Tiêu hao chế biến" },
                { key: "RECEIPT", label: "📦 Nhập kho" },
                { key: "WASTE", label: "⚠️ Hao hụt / Làm lại" },
                { key: "COUNT", label: "⚖️ Kiểm kê" },
              ].map((pill) => (
                <button
                  key={pill.key}
                  type="button"
                  onClick={() => setHistoryTypeFilter(pill.key)}
                  className={`text-xs px-3 py-1.5 rounded-xl font-medium transition-all ${
                    historyTypeFilter === pill.key
                      ? "bg-amber-500 text-black font-bold shadow-sm"
                      : "bg-surface-raised text-ink-secondary hover:text-ink hover:bg-surface-hover border border-line"
                  }`}
                >
                  {pill.label}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-surface rounded-3xl border border-line shadow-sm overflow-hidden">
            {isTxLoading ? (
              <div className="p-12 text-center text-muted flex flex-col items-center justify-center gap-3">
                <RefreshCw className="animate-spin text-amber-500" size={24} />
                <span className="text-xs">Đang tải lịch sử kho...</span>
              </div>
            ) : filteredHistory.length === 0 ? (
              <div className="p-16 text-center text-subtle flex flex-col items-center justify-center gap-3">
                <History size={36} />
                <div className="text-sm font-bold text-ink-secondary">Không tìm thấy biến động kho phù hợp</div>
                <p className="text-xs text-subtle">
                  Hãy thử thay đổi từ khóa tìm kiếm hoặc bỏ chọn bộ lọc để xem đầy đủ lịch sử.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-line bg-well text-muted font-bold uppercase tracking-wider text-[11px]">
                      <th className="py-4 px-5">Thời gian</th>
                      <th className="py-4 px-5">Loại giao dịch</th>
                      <th className="py-4 px-5">Mặt hàng</th>
                      <th className="py-4 px-5">Biến động</th>
                      <th className="py-4 px-5">Đơn giá</th>
                      <th className="py-4 px-5">Tồn Trước &rarr; Sau</th>
                      <th className="py-4 px-5">Người thực hiện</th>
                      <th className="py-4 px-5">Lý do / Món / Bàn</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-line">
                    {paginatedHistory.map((tx) => {
                      const isReceipt = tx.transactionType.toLowerCase() === "receipt";
                      const isCount = tx.transactionType.toLowerCase() === "count";
                      const isCooking = tx.reason?.toLowerCase().includes("tiêu hao chế biến");
                      const isReCook = tx.reason?.toLowerCase().includes("làm lại món");
                      const isWaste = tx.reason?.toLowerCase().includes("hao hụt") || tx.reason?.toLowerCase().includes("hỏng");
                      const isIssue = tx.transactionType.toLowerCase() === "issue" && !isCooking && !isReCook && !isWaste;

                      return (
                        <tr key={tx.id} className="hover:bg-raised transition-colors">
                          {/* Time */}
                          <td className="py-4 px-5 font-mono text-muted flex items-center gap-1.5 whitespace-nowrap">
                            <Clock size={12} className="text-subtle" />
                            <span>{formatDate(tx.createdAt)}</span>
                          </td>

                          {/* Type Badge */}
                          <td className="py-4 px-5 whitespace-nowrap">
                            {isCooking && (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-purple-950/80 text-purple-300 border border-purple-600/40">
                                <UtensilsCrossed size={12} />
                                Tiêu hao chế biến
                              </span>
                            )}
                            {isReCook && (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-950/80 text-amber-300 border border-amber-600/40">
                                <RefreshCw size={12} />
                                Làm lại món
                              </span>
                            )}
                            {isWaste && (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-950/80 text-rose-300 border border-rose-600/40">
                                <AlertTriangle size={12} />
                                Hao hụt / Hỏng
                              </span>
                            )}
                            {isReceipt && (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-950/80 text-emerald-300 border border-emerald-600/40">
                                <TrendingUp size={12} />
                                Nhập kho
                              </span>
                            )}
                            {isIssue && (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-950/80 text-rose-300 border border-rose-600/40">
                                <TrendingDown size={12} />
                                Xuất kho
                              </span>
                            )}
                            {isCount && (
                              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-sky-950/80 text-sky-300 border border-sky-600/40">
                                <Scale size={12} />
                                Kiểm kê
                              </span>
                            )}
                          </td>

                          {/* Ingredient */}
                          <td className="py-4 px-5">
                            <span className="font-bold text-ink">{tx.ingredientName}</span>
                            <span className="text-[11px] text-muted ml-1.5">({tx.unitName})</span>
                          </td>

                          {/* Delta */}
                          <td className="py-4 px-5 font-mono font-bold whitespace-nowrap">
                            <span
                              className={
                                tx.quantityDelta > 0
                                  ? "text-emerald-400"
                                  : tx.quantityDelta < 0
                                  ? "text-rose-400"
                                  : "text-muted"
                              }
                            >
                              {tx.quantityDelta > 0 ? `+${tx.quantityDelta}` : tx.quantityDelta}{" "}
                              {tx.unitName}
                            </span>
                          </td>

                          {/* Cost */}
                          <td className="py-4 px-5 font-mono text-ink-secondary whitespace-nowrap">
                            {formatVnd(tx.unitCost)}
                          </td>

                          {/* Before -> After */}
                          <td className="py-4 px-5 font-mono text-muted whitespace-nowrap">
                            <span>{tx.quantityBefore}</span>
                            <span className="mx-1 text-faint">&rarr;</span>
                            <span className="font-bold text-ink">{tx.quantityAfter}</span>
                          </td>

                          {/* Performed By */}
                          <td className="py-4 px-5 text-ink-secondary font-medium whitespace-nowrap">
                            {tx.performedBy}
                          </td>

                          {/* Reason */}
                          <td className="py-4 px-5 text-ink-secondary text-xs">
                            {tx.reason ? (
                              <span className="break-words font-medium">{tx.reason}</span>
                            ) : (
                              <span className="text-muted italic">—</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {filteredHistory.length > 0 && (
              <Pagination
                currentPage={historyPage}
                totalItems={filteredHistory.length}
                pageSize={PAGE_SIZE}
                onPageChange={setHistoryPage}
                itemLabel="biến động kho"
              />
            )}
          </div>
        </div>
      )}

      {/* Modal 1: Thêm Mặt Hàng Mới */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-surface border border-line rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between p-6 border-b border-line">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  <PackagePlus size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-black text-ink font-heading">Thêm mặt hàng tồn kho</h3>
                  <p className="text-xs text-muted">Tạo mới nguyên vật liệu hoặc đồ uống quản lý kho</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setCreateModalOpen(false)}
                className="p-2 rounded-xl text-muted hover:text-ink hover:bg-surface-hover transition-all cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-ink-secondary mb-1.5">
                  Tên mặt hàng / nguyên liệu <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ví dụ: Thịt bò Wagyu, Bia Tiger lon, Nước mắm..."
                  value={createName}
                  onChange={(e) => setCreateName(e.target.value)}
                  className="w-full bg-well text-ink text-xs px-4 py-3 rounded-2xl border border-line focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-ink-secondary mb-1.5">
                    Mã hàng (SKU)
                  </label>
                  <input
                    type="text"
                    placeholder="Tự sinh (NL001...)"
                    value={createCode}
                    onChange={(e) => setCreateCode(e.target.value)}
                    className="w-full bg-well text-ink text-xs px-4 py-3 rounded-2xl border border-line focus:outline-none focus:border-amber-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-ink-secondary mb-1.5">
                    Đơn vị tính <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="text"
                    list="common-units"
                    required
                    placeholder="kg, lon, chai, đĩa..."
                    value={createUnitName}
                    onChange={(e) => setCreateUnitName(e.target.value)}
                    className="w-full bg-well text-ink text-xs px-4 py-3 rounded-2xl border border-line focus:outline-none focus:border-amber-500"
                  />
                  <datalist id="common-units">
                    {commonUnits.map((u) => (
                      <option key={u} value={u} />
                    ))}
                  </datalist>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-ink-secondary mb-1.5">
                    Số lượng khởi tạo ban đầu
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="any"
                    value={createInitialQty}
                    onChange={(e) => setCreateInitialQty(e.target.value)}
                    className="w-full bg-well text-ink text-xs px-4 py-3 rounded-2xl border border-line focus:outline-none focus:border-amber-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-ink-secondary mb-1.5">
                    Đơn giá vốn ban đầu (₫)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="100"
                    placeholder="0"
                    value={createInitialCost}
                    onChange={(e) => setCreateInitialCost(e.target.value)}
                    className="w-full bg-well text-ink text-xs px-4 py-3 rounded-2xl border border-line focus:outline-none focus:border-amber-500 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-ink-secondary mb-1.5">
                  Định mức tồn tối thiểu cảnh báo
                </label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  value={createMinThreshold}
                  onChange={(e) => setCreateMinThreshold(e.target.value)}
                  className="w-full bg-well text-ink text-xs px-4 py-3 rounded-2xl border border-line focus:outline-none focus:border-amber-500 font-mono"
                />
                <p className="text-[11px] text-subtle mt-1">
                  Khi tồn kho giảm dưới mức này, hệ thống sẽ tự động hiển thị cảnh báo màu vàng.
                </p>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-line">
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(false)}
                  className="px-5 py-2.5 rounded-2xl bg-raised text-ink-secondary hover:text-ink text-xs font-bold transition-all cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending}
                  className="flex items-center gap-2 px-6 py-2.5 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-white font-extrabold text-xs shadow-lg shadow-amber-950/40 active:scale-95 transition-all cursor-pointer disabled:opacity-50"
                >
                  {createMutation.isPending ? (
                    <RefreshCw className="animate-spin" size={14} />
                  ) : (
                    <Sparkles size={14} />
                  )}
                  <span>Lưu mặt hàng</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal 2: Nhập / Xuất / Cân chỉnh Kiểm kê Kho */}
      {adjustModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-surface border border-line rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between p-6 border-b border-line">
              <div className="flex items-center gap-2.5">
                <div className="p-2.5 rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                  <ArrowUpDown size={20} />
                </div>
                <div>
                  <h3 className="text-lg font-black text-ink font-heading">Điều chỉnh kho</h3>
                  <p className="text-xs text-muted">Nhập hàng mới, xuất hao hụt hoặc kiểm kê cân chỉnh</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setAdjustModalOpen(false)}
                className="p-2 rounded-xl text-muted hover:text-ink hover:bg-surface-hover transition-all cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAdjustSubmit} className="p-6 space-y-4">
              {/* Type Switcher */}
              <div>
                <label className="block text-xs font-bold text-ink-secondary mb-1.5">
                  Loại thao tác <span className="text-rose-400">*</span>
                </label>
                <div className="grid grid-cols-3 gap-2 p-1 bg-well rounded-2xl border border-line">
                  <button
                    type="button"
                    onClick={() => {
                      setAdjustType("RECEIPT");
                      if (!adjustReason) setAdjustReason("Nhập thêm hàng từ nhà cung cấp");
                    }}
                    className={`py-2 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                      adjustType === "RECEIPT"
                        ? "bg-emerald-500 text-white shadow-md shadow-emerald-950/40"
                        : "text-muted hover:text-ink"
                    }`}
                  >
                    <Plus size={13} />
                    <span>Nhập kho</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setAdjustType("ISSUE");
                      if (!adjustReason) setAdjustReason("Xuất hao hụt / hỏng / tiêu dùng");
                    }}
                    className={`py-2 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                      adjustType === "ISSUE"
                        ? "bg-rose-500 text-white shadow-md shadow-rose-950/40"
                        : "text-muted hover:text-ink"
                    }`}
                  >
                    <Minus size={13} />
                    <span>Xuất kho</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setAdjustType("COUNT");
                      if (!adjustReason) setAdjustReason("Kiểm kê cân chỉnh số lượng thực tế");
                    }}
                    className={`py-2 rounded-xl text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                      adjustType === "COUNT"
                        ? "bg-sky-500 text-white shadow-md shadow-sky-950/40"
                        : "text-muted hover:text-ink"
                    }`}
                  >
                    <Scale size={13} />
                    <span>Kiểm kê</span>
                  </button>
                </div>
              </div>

              {/* Item Select */}
              <div>
                <label className="block text-xs font-bold text-ink-secondary mb-1.5">
                  Mặt hàng / nguyên liệu <span className="text-rose-400">*</span>
                </label>
                <select
                  required
                  value={adjustItemId}
                  onChange={(e) => {
                    const id = e.target.value;
                    setAdjustItemId(id);
                    const found = items.find((x) => x.id === id);
                    if (found) {
                      setSelectedItemForAdjust(found);
                      if (adjustType === "RECEIPT") {
                        setAdjustUnitCost(String(found.averageUnitCost));
                      } else if (adjustType === "COUNT") {
                        setAdjustQty(String(found.currentQuantity));
                      }
                    }
                  }}
                  className="w-full bg-well text-ink text-xs px-4 py-3 rounded-2xl border border-line focus:outline-none focus:border-amber-500 cursor-pointer"
                >
                  <option value="">-- Chọn mặt hàng --</option>
                  {items.map((it) => (
                    <option key={it.id} value={it.id}>
                      {it.ingredientCode} - {it.ingredientName} (Hiện có: {it.currentQuantity}{" "}
                      {it.unitName})
                    </option>
                  ))}
                </select>
              </div>

              {selectedItemForAdjust && (
                <div className="p-3 bg-well rounded-2xl border border-line text-xs flex items-center justify-between text-muted">
                  <span>
                    Hiện có:{" "}
                    <strong className="text-ink font-mono">
                      {selectedItemForAdjust.currentQuantity} {selectedItemForAdjust.unitName}
                    </strong>
                  </span>
                  <span>
                    Giá vốn hiện tại:{" "}
                    <strong className="text-emerald-400 font-mono">
                      {formatVnd(selectedItemForAdjust.averageUnitCost)}
                    </strong>
                  </span>
                </div>
              )}

              {/* Quantity */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-ink-secondary mb-1.5">
                    {adjustType === "RECEIPT"
                      ? "Số lượng nhập thêm"
                      : adjustType === "ISSUE"
                      ? "Số lượng xuất bớt"
                      : "Số lượng kiểm kê thực tế"}{" "}
                    <span className="text-rose-400">*</span>
                  </label>
                  <input
                    type="number"
                    min={adjustType === "COUNT" ? "0" : "0.01"}
                    step="any"
                    required
                    value={adjustQty}
                    onChange={(e) => setAdjustQty(e.target.value)}
                    className="w-full bg-well text-ink text-xs px-4 py-3 rounded-2xl border border-line focus:outline-none focus:border-amber-500 font-mono"
                  />
                </div>

                {adjustType === "RECEIPT" ? (
                  <div>
                    <label className="block text-xs font-bold text-ink-secondary mb-1.5">
                      Đơn giá nhập mới (₫)
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="100"
                      placeholder="Tự động theo giá cũ"
                      value={adjustUnitCost}
                      onChange={(e) => setAdjustUnitCost(e.target.value)}
                      className="w-full bg-well text-ink text-xs px-4 py-3 rounded-2xl border border-line focus:outline-none focus:border-amber-500 font-mono"
                    />
                  </div>
                ) : (
                  <div>
                    <label className="block text-xs font-bold text-ink-secondary mb-1.5">
                      Tồn dự kiến sau khi lưu
                    </label>
                    <div className="w-full bg-well text-muted text-xs px-4 py-3 rounded-2xl border border-line font-mono">
                      {selectedItemForAdjust
                        ? adjustType === "ISSUE"
                          ? Math.max(
                              0,
                              selectedItemForAdjust.currentQuantity - (Number(adjustQty) || 0)
                            )
                          : Number(adjustQty) || 0
                        : "—"}
                    </div>
                  </div>
                )}
              </div>

              {/* Reason */}
              <div>
                <label className="block text-xs font-bold text-ink-secondary mb-1.5">
                  Lý do / Ghi chú
                </label>
                <input
                  type="text"
                  placeholder="Ghi chú lý do thao tác kho..."
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  className="w-full bg-well text-ink text-xs px-4 py-3 rounded-2xl border border-line focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-4 border-t border-line">
                <button
                  type="button"
                  onClick={() => setAdjustModalOpen(false)}
                  className="px-5 py-2.5 rounded-2xl bg-raised text-ink-secondary hover:text-ink text-xs font-bold transition-all cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={adjustMutation.isPending}
                  className={`flex items-center gap-2 px-6 py-2.5 rounded-2xl text-white font-extrabold text-xs shadow-lg active:scale-95 transition-all cursor-pointer disabled:opacity-50 ${
                    adjustType === "RECEIPT"
                      ? "bg-emerald-600 hover:bg-emerald-700 shadow-emerald-950/40"
                      : adjustType === "ISSUE"
                      ? "bg-rose-600 hover:bg-rose-700 shadow-rose-950/40"
                      : "bg-sky-600 hover:bg-sky-700 shadow-sky-950/40"
                  }`}
                >
                  {adjustMutation.isPending ? (
                    <RefreshCw className="animate-spin" size={14} />
                  ) : (
                    <CheckCircle2 size={14} />
                  )}
                  <span>Xác nhận thực hiện</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
