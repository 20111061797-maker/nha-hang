"use client";

import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useBranch } from "@/features/branches/branch-provider";
import { tableApi } from "@/lib/api/table-api";
import { TableStatus, OrderStatus } from "@/types/pos";
import type { OrderListItem } from "@/types/pos";
import { posApi } from "@/lib/api/pos-api";
import type { TableListItem, AreaListItem } from "@/types/tables";
import { LoadingState, EmptyState } from "@/components/feedback/states";
import {
  Grid3X3,
  Plus,
  Search,
  Users,
  QrCode,
  Edit2,
  Trash2,
  ExternalLink,
  Copy,
  Check,
  X,
  Layers,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";

export function TablesManagementView() {
  const { branchId } = useBranch();
  const queryClient = useQueryClient();

  // Filters & State
  const [selectedAreaId, setSelectedAreaId] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [search, setSearch] = useState("");

  // Modals
  const [tableModal, setTableModal] = useState<{
    open: boolean;
    mode: "create" | "edit";
    table?: TableListItem;
  }>({ open: false, mode: "create" });

  const [deleteModal, setDeleteModal] = useState<{
    open: boolean;
    table?: TableListItem;
  }>({ open: false });

  const [areasModalOpen, setAreasModalOpen] = useState(false);
  const [deleteAreaState, setDeleteAreaState] = useState<{
    open: boolean;
    area?: AreaListItem;
  }>({ open: false });
  const [qrModal, setQrModal] = useState<{
    open: boolean;
    table?: TableListItem;
  }>({ open: false });

  const [copiedLink, setCopiedLink] = useState(false);
  const [toastMsg, setToastMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  const showToast = (type: "success" | "error", text: string) => {
    setToastMsg({ type, text });
    setTimeout(() => setToastMsg(null), 3500);
  };

  // Queries
  const {
    data: tables = [],
    isLoading: tablesLoading,
    refetch: refetchTables,
    isFetching,
  } = useQuery({
    queryKey: ["tables", branchId],
    queryFn: () => (branchId ? tableApi.getTables(branchId) : Promise.resolve([])),
    enabled: Boolean(branchId),
  });

  const { data: areas = [], isLoading: areasLoading } = useQuery({
    queryKey: ["areas", branchId],
    queryFn: () => (branchId ? tableApi.getAreas(branchId) : Promise.resolve([])),
    enabled: Boolean(branchId),
  });

  const { data: branchOrders = [] } = useQuery({
    queryKey: ["branch-orders-tables", branchId],
    queryFn: () => (branchId ? posApi.getBranchOrders(branchId) : Promise.resolve([])),
    enabled: Boolean(branchId),
    refetchInterval: 5000,
  });

  const activeOrdersByTable = useMemo(() => {
    const map = new Map<string, OrderListItem>();
    for (const order of branchOrders) {
      if (
        order.diningTableId &&
        order.status !== OrderStatus.Completed &&
        order.status !== OrderStatus.Cancelled
      ) {
        map.set(order.diningTableId, order);
      }
    }
    return map;
  }, [branchOrders]);

  // Table Mutations
  const createTableMutation = useMutation({
    mutationFn: (payload: {
      areaId: string;
      tableNumber: string;
      name?: string | null;
      capacity: number;
      qrCodeIdentifier?: string | null;
      displayOrder: number;
    }) => tableApi.createTable(branchId!, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tables", branchId] });
      setTableModal({ open: false, mode: "create" });
      showToast("success", "Đã tạo bàn ăn mới thành công!");
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : "Không thể tạo bàn. Vui lòng thử lại.";
      showToast("error", msg);
    },
  });

  const updateTableMutation = useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string;
      payload: {
        areaId: string;
        tableNumber: string;
        name?: string | null;
        capacity: number;
        qrCodeIdentifier?: string | null;
        displayOrder: number;
      };
    }) => tableApi.updateTable(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tables", branchId] });
      setTableModal({ open: false, mode: "create" });
      showToast("success", "Đã cập nhật thông tin bàn ăn thành công!");
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : "Không thể cập nhật bàn. Vui lòng thử lại.";
      showToast("error", msg);
    },
  });

  const deleteTableMutation = useMutation({
    mutationFn: (id: string) => tableApi.deleteTable(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tables", branchId] });
      setDeleteModal({ open: false });
      showToast("success", "Đã xóa bàn ăn thành công!");
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : "Không thể xóa bàn. Vui lòng kiểm tra lại đơn hàng.";
      showToast("error", msg);
    },
  });

  const changeStatusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: TableStatus }) =>
      tableApi.changeStatus(id, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tables", branchId] });
      showToast("success", "Đã thay đổi trạng thái bàn!");
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : "Không thể chuyển trạng thái bàn.";
      showToast("error", msg);
    },
  });

  // Area Mutations
  const createAreaMutation = useMutation({
    mutationFn: (payload: { name: string; description?: string | null; displayOrder: number }) =>
      tableApi.createArea(branchId!, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["areas", branchId] });
      showToast("success", "Đã tạo khu vực mới thành công!");
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : "Không thể tạo khu vực.";
      showToast("error", msg);
    },
  });

  const deleteAreaMutation = useMutation({
    mutationFn: ({
      id,
      options,
    }: {
      id: string;
      options?: { cascade?: boolean; moveToAreaId?: string };
    }) => tableApi.deleteArea(id, options),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["areas", branchId] });
      queryClient.invalidateQueries({ queryKey: ["tables", branchId] });
      if (selectedAreaId === variables.id) {
        setSelectedAreaId("all");
      }
      setDeleteAreaState({ open: false });
      showToast("success", "Đã xóa khu vực thành công!");
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : "Không thể xóa khu vực.";
      showToast("error", msg);
    },
  });

  // Filtered tables
  const filteredTables = useMemo(() => {
    return tables.filter((t) => {
      if (selectedAreaId !== "all" && t.areaId !== selectedAreaId) return false;
      if (statusFilter !== "all" && t.status !== Number(statusFilter)) return false;
      if (search.trim()) {
        const q = search.trim().toLowerCase();
        const matchNumber = t.tableNumber.toLowerCase().includes(q);
        const matchName = t.name ? t.name.toLowerCase().includes(q) : false;
        if (!matchNumber && !matchName) return false;
      }
      return true;
    });
  }, [tables, selectedAreaId, statusFilter, search]);

  // Statistics
  const stats = useMemo(() => {
    let available = 0;
    let occupied = 0;
    let reserved = 0;
    let outOfService = 0;

    for (const t of tables) {
      if (t.status === TableStatus.Available) available++;
      else if (t.status === TableStatus.Occupied) occupied++;
      else if (t.status === TableStatus.Reserved) reserved++;
      else if (t.status === TableStatus.OutOfService) outOfService++;
    }

    return { total: tables.length, available, occupied, reserved, outOfService };
  }, [tables]);

  const areasMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const a of areas) {
      map.set(a.id, a.name);
    }
    return map;
  }, [areas]);

  if (tablesLoading || areasLoading) {
    return <LoadingState fullscreen label="Đang tải dữ liệu Quán Bếp Nhậu..." />;
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-16">
      {/* Toast Notification */}
      {toastMsg && (
        <div
          className={`fixed top-4 right-4 z-[100] flex items-center gap-2 px-4 py-3 rounded-xl border shadow-xl text-sm font-semibold transition-all animate-in fade-in slide-in-from-top-4 ${
            toastMsg.type === "success"
              ? "bg-[#0f2e1b] border-emerald-500/50 text-emerald-200"
              : "bg-[#331111] border-rose-500/50 text-rose-200"
          }`}
        >
          {toastMsg.type === "success" ? <CheckCircle2 size={18} className="text-emerald-400" /> : <AlertTriangle size={18} className="text-rose-400" />}
          <span>{toastMsg.text}</span>
          <button onClick={() => setToastMsg(null)} className="ml-2 text-gray-400 hover:text-white">
            <X size={14} />
          </button>
        </div>
      )}

      {/* Top Banner / Actions Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-[#1a1d24] border border-[#2e333d] p-4 sm:p-6 rounded-2xl shadow-lg">
        <div>
          <div className="flex items-center gap-2.5">
            <span className="p-2 rounded-xl bg-orange-950/60 border border-orange-500/30 text-orange-400">
              <Grid3X3 size={22} />
            </span>
            <div>
              <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight font-heading flex items-center gap-2">
                Sơ Đồ & Quản Lý Bàn Ăn
              </h1>
              <p className="text-xs sm:text-sm text-gray-400">
                Thiết lập số bàn, khu vực và mã QR đặt món trực tiếp tại bàn
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2.5 shrink-0 flex-wrap">
          <button
            onClick={() => refetchTables()}
            disabled={isFetching}
            className="px-3 py-2 bg-[#252a35] hover:bg-[#2e3442] text-gray-300 hover:text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 border border-[#373e4f] transition-all"
            title="Làm mới dữ liệu"
          >
            <RefreshCw size={14} className={isFetching ? "animate-spin text-orange-400" : ""} />
            <span className="hidden sm:inline">Làm mới</span>
          </button>

          <button
            onClick={() => setAreasModalOpen(true)}
            className="px-3.5 py-2 bg-[#252a35] hover:bg-[#2e3442] text-amber-300 hover:text-amber-200 border border-amber-500/30 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-1.5 transition-all shadow-sm"
          >
            <Layers size={16} />
            <span>Khu vực ({areas.length})</span>
          </button>

          <button
            onClick={() => setTableModal({ open: true, mode: "create" })}
            className="px-4 py-2 bg-gradient-to-r from-[#e44d13] to-[#ff6622] hover:brightness-110 text-white rounded-xl text-xs sm:text-sm font-black flex items-center gap-2 shadow-lg shadow-orange-950/50 transition-all cursor-pointer"
          >
            <Plus size={16} />
            <span>Thêm bàn mới</span>
          </button>
        </div>
      </div>

      {/* Stats Counter Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 sm:gap-3">
        <div className="bg-[#1a1d24] border border-[#2e333d] p-3 rounded-xl flex items-center justify-between">
          <div className="text-xs text-gray-400">Tổng số bàn</div>
          <div className="text-lg font-black text-white">{stats.total}</div>
        </div>
        <div className="bg-[#0f2e1b]/40 border border-emerald-500/30 p-3 rounded-xl flex items-center justify-between">
          <div className="text-xs text-emerald-400 flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block" />
            Bàn trống
          </div>
          <div className="text-lg font-black text-emerald-300">{stats.available}</div>
        </div>
        <div className="bg-orange-950/30 border border-orange-500/30 p-3 rounded-xl flex items-center justify-between">
          <div className="text-xs text-orange-400 flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-orange-500 inline-block animate-pulse" />
            Có khách
          </div>
          <div className="text-lg font-black text-orange-300">{stats.occupied}</div>
        </div>
        <div className="bg-purple-950/30 border border-purple-500/30 p-3 rounded-xl flex items-center justify-between">
          <div className="text-xs text-purple-400 flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-purple-400 inline-block" />
            Đã đặt trước
          </div>
          <div className="text-lg font-black text-purple-300">{stats.reserved}</div>
        </div>
        <div className="bg-gray-800/40 border border-gray-700/40 p-3 rounded-xl flex items-center justify-between col-span-2 sm:col-span-1">
          <div className="text-xs text-gray-400 flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-gray-500 inline-block" />
            Tạm ngưng
          </div>
          <div className="text-lg font-black text-gray-300">{stats.outOfService}</div>
        </div>
      </div>

      {/* Filters Bar: Area Tabs & Search */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 bg-[#1a1d24] border border-[#2e333d] p-3 rounded-2xl">
        {/* Area Navigation Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0 scrollbar-none">
          <button
            onClick={() => setSelectedAreaId("all")}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 ${
              selectedAreaId === "all"
                ? "bg-orange-600 text-white shadow-md shadow-orange-900/50"
                : "text-gray-400 hover:text-white hover:bg-[#252a35]"
            }`}
          >
            Tất cả khu vực ({tables.length})
          </button>
          {areas.map((area) => {
            const count = tables.filter((t) => t.areaId === area.id).length;
            const isSelected = selectedAreaId === area.id;
            return (
              <button
                key={area.id}
                onClick={() => setSelectedAreaId(area.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all shrink-0 ${
                  isSelected
                    ? "bg-orange-600 text-white shadow-md shadow-orange-900/50"
                    : "text-gray-400 hover:text-white hover:bg-[#252a35]"
                }`}
              >
                {area.name} ({count})
              </button>
            );
          })}
        </div>

        {/* Right: Search & Status Select */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="relative flex-1 sm:w-48">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" size={14} />
            <input
              type="text"
              placeholder="Tìm số bàn..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-[#13151a] border border-[#2e333d] pl-8 pr-3 py-1.5 rounded-xl text-xs text-white placeholder-gray-500 focus:outline-none focus:border-orange-500"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-[#13151a] border border-[#2e333d] px-2.5 py-1.5 rounded-xl text-xs text-gray-300 focus:outline-none focus:border-orange-500"
          >
            <option value="all">Tất cả trạng thái</option>
            <option value={TableStatus.Available}>Trống (Available)</option>
            <option value={TableStatus.Occupied}>Có khách (Occupied)</option>
            <option value={TableStatus.Reserved}>Đã đặt (Reserved)</option>
            <option value={TableStatus.OutOfService}>Tạm ngưng (Out of Service)</option>
          </select>
        </div>
      </div>

      {/* Tables Grid */}
      {filteredTables.length === 0 ? (
        <EmptyState
          title="Không tìm thấy bàn ăn nào"
          detail={
            tables.length === 0
              ? "Chi nhánh chưa có bàn nào. Nhấn 'Thêm bàn mới' để bắt đầu tạo sơ đồ quán."
              : "Không có bàn ăn nào phù hợp với bộ lọc hiện tại."
          }
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {filteredTables.map((table) => {
            const areaName = areasMap.get(table.areaId) ?? "Chưa phân khu";
            const activeOrder = activeOrdersByTable.get(table.id);
            const hasActiveOrder = Boolean(activeOrder);
            const isOccupied = table.status === TableStatus.Occupied;
            const isReserved = table.status === TableStatus.Reserved;
            const isAvailable = table.status === TableStatus.Available;

            return (
              <div
                key={table.id}
                className={`bg-[#1a1d24] border rounded-2xl p-4 flex flex-col justify-between transition-all duration-200 hover:border-gray-500 hover:shadow-xl relative overflow-hidden group ${
                  isOccupied
                    ? "border-orange-500/50 shadow-orange-950/20 bg-gradient-to-b from-[#231d1a] to-[#1a1d24]"
                    : isAvailable
                    ? "border-emerald-600/30 hover:border-emerald-500"
                    : isReserved
                    ? "border-purple-600/30 hover:border-purple-500"
                    : "border-gray-700/40 opacity-75"
                }`}
              >
                {/* Top Badge & Number */}
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-[#252a35] text-amber-400 border border-amber-500/20">
                      {areaName}
                    </span>

                    <span
                      className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-md flex items-center gap-1 ${
                        isAvailable
                          ? "bg-emerald-950 text-emerald-300 border border-emerald-500/40"
                          : isOccupied
                          ? "bg-orange-950 text-orange-300 border border-orange-500/40 animate-pulse"
                          : isReserved
                          ? "bg-purple-950 text-purple-300 border border-purple-500/40"
                          : "bg-gray-800 text-gray-400 border border-gray-600"
                      }`}
                    >
                      {isAvailable && <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />}
                      {isOccupied && <span className="w-1.5 h-1.5 rounded-full bg-orange-400" />}
                      {isReserved && <span className="w-1.5 h-1.5 rounded-full bg-purple-400" />}
                      {isAvailable
                        ? "Bàn trống"
                        : isOccupied
                        ? "Đang phục vụ"
                        : isReserved
                        ? "Đã đặt trước"
                        : "Tạm ngưng"}
                    </span>
                  </div>

                  {/* Main Table Info */}
                  <div className="flex items-baseline gap-2 mb-1">
                    <h3 className="text-2xl font-black text-white font-heading tracking-tight">
                      BÀN {table.tableNumber}
                    </h3>
                    {table.name && (
                      <span className="text-xs text-gray-400 font-medium truncate">
                        ({table.name})
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-3 text-xs text-gray-400 mb-2">
                    <span className="flex items-center gap-1">
                      <Users size={13} className="text-gray-400" />
                      <span>{table.capacity} chỗ</span>
                    </span>
                    {table.qrCodeIdentifier && (
                      <span className="text-amber-500/80 font-mono text-[11px]">
                        QR: {table.qrCodeIdentifier}
                      </span>
                    )}
                  </div>

                  {/* Active Unpaid Order Warning Pill */}
                  {hasActiveOrder && (
                    <div className="mb-2 flex items-center justify-between px-2.5 py-1.5 rounded-lg bg-orange-950/60 border border-orange-500/40 text-[11px] font-bold text-orange-300">
                      <span className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full bg-orange-400 animate-pulse" />
                        <span>Chưa thanh toán</span>
                      </span>
                      <a
                        href="/pos"
                        className="text-[10px] text-amber-400 hover:text-amber-200 underline font-mono"
                        title="Mở POS để xem và thanh toán hóa đơn"
                      >
                        Đơn #{activeOrder?.orderNumber ? activeOrder.orderNumber : activeOrder?.id.slice(0, 6)} ➔
                      </a>
                    </div>
                  )}
                </div>

                {/* Bottom Action Buttons */}
                <div className="pt-3 border-t border-[#2a2f3a] space-y-2">
                  {/* Status Switcher & QR Preview */}
                  <div className="flex items-center justify-between gap-1.5">
                    {/* Status dropdown */}
                    <select
                      value={table.status}
                      onChange={(e) => {
                        const targetStatus = Number(e.target.value) as TableStatus;
                        if (hasActiveOrder && targetStatus !== TableStatus.Occupied) {
                          showToast(
                            "error",
                            `Bàn ${table.tableNumber} đang có đơn hàng chưa thanh toán. Vui lòng thanh toán hoặc hủy đơn tại POS trước khi đổi trạng thái bàn.`
                          );
                          return;
                        }
                        changeStatusMutation.mutate({
                          id: table.id,
                          status: targetStatus,
                        });
                      }}
                      disabled={changeStatusMutation.isPending}
                      className="bg-[#13151a] border border-[#2e333d] text-[11px] font-semibold text-gray-300 rounded-lg px-2 py-1.5 focus:outline-none focus:border-orange-500 cursor-pointer flex-1"
                    >
                      <option value={TableStatus.Available} disabled={hasActiveOrder}>
                        🟢 Trống {hasActiveOrder ? "(Đang có đơn)" : ""}
                      </option>
                      <option value={TableStatus.Occupied}>🔥 Có khách</option>
                      <option value={TableStatus.Reserved} disabled={hasActiveOrder}>
                        🟣 Đã đặt {hasActiveOrder ? "(Đang có đơn)" : ""}
                      </option>
                      <option value={TableStatus.OutOfService} disabled={hasActiveOrder}>
                        ⚪ Tạm ngưng {hasActiveOrder ? "(Đang có đơn)" : ""}
                      </option>
                    </select>

                    {/* QR Code button */}
                    <button
                      onClick={() => setQrModal({ open: true, table })}
                      className="p-1.5 rounded-lg bg-[#252a35] hover:bg-[#323947] text-amber-400 hover:text-amber-300 border border-amber-500/30 transition-all"
                      title="Xem & In mã QR đặt món của bàn"
                    >
                      <QrCode size={15} />
                    </button>

                    {/* Edit button */}
                    <button
                      onClick={() => setTableModal({ open: true, mode: "edit", table })}
                      className="p-1.5 rounded-lg bg-[#252a35] hover:bg-[#323947] text-blue-400 hover:text-blue-300 border border-blue-500/30 transition-all"
                      title="Sửa thông tin bàn"
                    >
                      <Edit2 size={15} />
                    </button>

                    {/* Delete button */}
                    <button
                      onClick={() => setDeleteModal({ open: true, table })}
                      disabled={isOccupied || hasActiveOrder}
                      className={`p-1.5 rounded-lg border transition-all ${
                        isOccupied || hasActiveOrder
                          ? "bg-gray-800/40 text-gray-600 border-gray-800 cursor-not-allowed"
                          : "bg-rose-950/40 hover:bg-rose-900/60 text-rose-400 hover:text-rose-300 border-rose-500/30"
                      }`}
                      title={
                        hasActiveOrder
                          ? "Bàn đang có đơn hàng chưa thanh toán, không thể xóa"
                          : isOccupied
                          ? "Không thể xóa bàn đang có khách"
                          : "Xóa bàn"
                      }
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL 1: Thêm / Sửa Bàn Ăn */}
      {tableModal.open && (
        <TableFormModal
          mode={tableModal.mode}
          table={tableModal.table}
          areas={areas}
          isSubmitting={createTableMutation.isPending || updateTableMutation.isPending}
          onClose={() => setTableModal({ open: false, mode: "create" })}
          onSubmit={(values) => {
            if (tableModal.mode === "create") {
              createTableMutation.mutate(values);
            } else if (tableModal.table) {
              updateTableMutation.mutate({ id: tableModal.table.id, payload: values });
            }
          }}
        />
      )}

      {/* MODAL 2: Xác nhận Xóa Bàn */}
      {deleteModal.open && deleteModal.table && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-[#1c1f26] border border-rose-500/30 rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3">
              <span className="p-3 rounded-xl bg-rose-950/60 border border-rose-500/40 text-rose-400">
                <Trash2 size={24} />
              </span>
              <div>
                <h3 className="text-lg font-black text-white font-heading">
                  Xác nhận xóa bàn ăn?
                </h3>
                <p className="text-xs text-gray-400">
                  Hành động này sẽ xóa hoặc vô hiệu hóa bàn khỏi sơ đồ quán.
                </p>
              </div>
            </div>

            <div className="bg-[#14151a] p-3.5 rounded-xl border border-[#2a2e38] text-sm text-gray-300 space-y-1.5">
              <div>
                <strong>Số bàn:</strong> BÀN {deleteModal.table.tableNumber}
              </div>
              {deleteModal.table.name && (
                <div>
                  <strong>Tên bàn:</strong> {deleteModal.table.name}
                </div>
              )}
              <div>
                <strong>Khu vực:</strong> {areasMap.get(deleteModal.table.areaId) ?? "Chưa phân khu"}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setDeleteModal({ open: false })}
                className="px-4 py-2 rounded-xl text-xs font-bold text-gray-300 hover:text-white bg-[#262a34] hover:bg-[#303642] transition-all"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                disabled={deleteTableMutation.isPending}
                onClick={() => deleteTableMutation.mutate(deleteModal.table!.id)}
                className="px-4 py-2 rounded-xl text-xs font-black text-white bg-rose-600 hover:bg-rose-500 shadow-lg shadow-rose-950/50 transition-all flex items-center gap-1.5"
              >
                {deleteTableMutation.isPending ? "Đang xóa..." : "Xác nhận xóa"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: Quản Lý Khu Vực (Areas) */}
      {areasModalOpen && (
        <AreasManagementModal
          areas={areas}
          tables={tables}
          isCreating={createAreaMutation.isPending}
          onClose={() => setAreasModalOpen(false)}
          onCreateArea={(payload) => createAreaMutation.mutate(payload)}
          onRequestDeleteArea={(area) => setDeleteAreaState({ open: true, area })}
        />
      )}

      {/* MODAL: Xác nhận xóa khu vực (Kèm chuyển bàn hoặc cascade) */}
      {deleteAreaState.open && deleteAreaState.area && (
        <DeleteAreaConfirmModal
          area={deleteAreaState.area}
          otherAreas={areas.filter((a) => a.id !== deleteAreaState.area?.id)}
          tablesInArea={tables.filter((t) => t.areaId === deleteAreaState.area?.id)}
          isDeleting={deleteAreaMutation.isPending}
          onClose={() => setDeleteAreaState({ open: false })}
          onConfirm={(options) =>
            deleteAreaMutation.mutate({ id: deleteAreaState.area!.id, options })
          }
        />
      )}

      {/* MODAL 4: Mã QR Đặt Món Bàn */}
      {qrModal.open && qrModal.table && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-[#1c1f26] border border-[#353a47] rounded-2xl w-full max-w-sm p-6 shadow-2xl space-y-5 text-center relative">
            <button
              onClick={() => setQrModal({ open: false })}
              className="absolute top-4 right-4 text-gray-400 hover:text-white"
            >
              <X size={18} />
            </button>

            <div>
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-orange-950/60 border border-orange-500/30 text-orange-400 text-xs font-bold mb-2">
                🔥 QUÁN BẾP NHẬU
              </div>
              <h3 className="text-2xl font-black text-white font-heading">
                BÀN {qrModal.table.tableNumber}
              </h3>
              <p className="text-xs text-gray-400">
                {areasMap.get(qrModal.table.areaId) ?? "Sảnh chính"} • Quét để xem menu & gọi món
              </p>
            </div>

            {/* QR Code Graphic */}
            <div className="bg-white p-4 rounded-2xl shadow-inner inline-block mx-auto">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?data=${encodeURIComponent(
                  `${typeof window !== "undefined" ? window.location.origin : "http://localhost:3000"}/table/${qrModal.table.id}`
                )}&size=200x200&color=141517`}
                alt={`Mã QR Bàn ${qrModal.table.tableNumber}`}
                className="w-48 h-48 block mx-auto rounded-lg"
              />
            </div>

            <div className="text-[11px] text-gray-400 font-mono bg-[#14151a] p-2 rounded-xl border border-[#2a2e38] break-all">
              {typeof window !== "undefined" ? window.location.origin : "http://localhost:3000"}/table/{qrModal.table.id}
            </div>

            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                onClick={() => {
                  const url = `${window.location.origin}/table/${qrModal.table!.id}`;
                  navigator.clipboard.writeText(url);
                  setCopiedLink(true);
                  setTimeout(() => setCopiedLink(false), 2000);
                }}
                className="px-3 py-2 rounded-xl text-xs font-bold bg-[#262a34] hover:bg-[#303642] text-gray-300 hover:text-white transition-all flex items-center justify-center gap-1.5"
              >
                {copiedLink ? <Check size={14} className="text-emerald-400" /> : <Copy size={14} />}
                <span>{copiedLink ? "Đã chép link" : "Chép link"}</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  window.open(`/table/${qrModal.table!.id}`, "_blank");
                }}
                className="px-3 py-2 rounded-xl text-xs font-black bg-gradient-to-r from-[#e44d13] to-[#ff6622] text-white shadow-md hover:brightness-110 transition-all flex items-center justify-center gap-1.5"
              >
                <ExternalLink size={14} />
                <span>Mở menu khách</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// Sub-component: Modal Thêm / Sửa Bàn
function TableFormModal({
  mode,
  table,
  areas,
  isSubmitting,
  onClose,
  onSubmit,
}: {
  mode: "create" | "edit";
  table?: TableListItem;
  areas: AreaListItem[];
  isSubmitting: boolean;
  onClose: () => void;
  onSubmit: (values: {
    areaId: string;
    tableNumber: string;
    name?: string | null;
    capacity: number;
    qrCodeIdentifier?: string | null;
    displayOrder: number;
  }) => void;
}) {
  const [areaId, setAreaId] = useState(table?.areaId ?? (areas[0]?.id || ""));
  const [tableNumber, setTableNumber] = useState(table?.tableNumber ?? "");
  const [name, setName] = useState(table?.name ?? "");
  const [capacity, setCapacity] = useState(table?.capacity ?? 4);
  const [qrCodeIdentifier, setQrCodeIdentifier] = useState(table?.qrCodeIdentifier ?? "");
  const [displayOrder, setDisplayOrder] = useState(table?.displayOrder ?? 0);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!areaId) {
      setError("Vui lòng chọn khu vực.");
      return;
    }
    if (!tableNumber.trim()) {
      setError("Vui lòng nhập số bàn.");
      return;
    }
    if (capacity <= 0) {
      setError("Số chỗ ngồi phải lớn hơn 0.");
      return;
    }

    onSubmit({
      areaId,
      tableNumber: tableNumber.trim(),
      name: name.trim() || null,
      capacity: Number(capacity),
      qrCodeIdentifier: qrCodeIdentifier.trim() || null,
      displayOrder: Number(displayOrder),
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
      <div className="bg-[#1c1f26] border border-[#353a47] rounded-2xl w-full max-w-lg p-6 shadow-2xl space-y-4">
        <div className="flex items-center justify-between border-b border-[#2e333e] pb-3">
          <h3 className="text-lg font-black text-white font-heading flex items-center gap-2">
            {mode === "create" ? <Plus size={18} className="text-orange-500" /> : <Edit2 size={18} className="text-blue-400" />}
            <span>{mode === "create" ? "Thêm Bàn Ăn Mới" : `Chỉnh Sửa Bàn ${table?.tableNumber}`}</span>
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X size={18} />
          </button>
        </div>

        {error && (
          <div className="bg-rose-950/40 border border-rose-500/40 p-3 rounded-xl text-xs text-rose-300 font-semibold flex items-center gap-2">
            <AlertTriangle size={15} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Area select */}
            <div>
              <label className="block text-xs font-bold text-gray-300 mb-1">
                Khu vực <span className="text-rose-500">*</span>
              </label>
              <select
                value={areaId}
                onChange={(e) => setAreaId(e.target.value)}
                className="w-full bg-[#13151a] border border-[#2e333d] px-3 py-2 rounded-xl text-xs sm:text-sm text-white focus:outline-none focus:border-orange-500"
                required
              >
                {areas.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Table Number */}
            <div>
              <label className="block text-xs font-bold text-gray-300 mb-1">
                Số bàn (Hiển thị) <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                placeholder="Ví dụ: 01, VIP-2..."
                value={tableNumber}
                onChange={(e) => setTableNumber(e.target.value)}
                className="w-full bg-[#13151a] border border-[#2e333d] px-3 py-2 rounded-xl text-xs sm:text-sm text-white focus:outline-none focus:border-orange-500 font-bold"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Custom Name */}
            <div>
              <label className="block text-xs font-bold text-gray-300 mb-1">Tên gợi nhớ (Tùy chọn)</label>
              <input
                type="text"
                placeholder="Ví dụ: Bàn Cửa Sổ, Bàn Tròn..."
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-[#13151a] border border-[#2e333d] px-3 py-2 rounded-xl text-xs sm:text-sm text-white focus:outline-none focus:border-orange-500"
              />
            </div>

            {/* Capacity */}
            <div>
              <label className="block text-xs font-bold text-gray-300 mb-1">Số chỗ ngồi</label>
              <input
                type="number"
                min={1}
                max={100}
                value={capacity}
                onChange={(e) => setCapacity(Number(e.target.value))}
                className="w-full bg-[#13151a] border border-[#2e333d] px-3 py-2 rounded-xl text-xs sm:text-sm text-white focus:outline-none focus:border-orange-500"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* QR Identifier */}
            <div>
              <label className="block text-xs font-bold text-gray-300 mb-1">
                Mã định danh QR (Tùy chọn)
              </label>
              <input
                type="text"
                placeholder="Ví dụ: ban-01 (để trống tự tạo)"
                value={qrCodeIdentifier}
                onChange={(e) => setQrCodeIdentifier(e.target.value)}
                className="w-full bg-[#13151a] border border-[#2e333d] px-3 py-2 rounded-xl text-xs sm:text-sm text-white focus:outline-none focus:border-orange-500"
              />
            </div>

            {/* Display Order */}
            <div>
              <label className="block text-xs font-bold text-gray-300 mb-1">Thứ tự sắp xếp</label>
              <input
                type="number"
                value={displayOrder}
                onChange={(e) => setDisplayOrder(Number(e.target.value))}
                className="w-full bg-[#13151a] border border-[#2e333d] px-3 py-2 rounded-xl text-xs sm:text-sm text-white focus:outline-none focus:border-orange-500"
              />
            </div>
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[#2e333e]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-bold text-gray-300 hover:text-white bg-[#262a34] hover:bg-[#303642] transition-all"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 rounded-xl text-xs sm:text-sm font-black text-white bg-gradient-to-r from-[#e44d13] to-[#ff6622] hover:brightness-110 shadow-lg shadow-orange-950/50 transition-all flex items-center gap-1.5 cursor-pointer"
            >
              {isSubmitting ? "Đang lưu..." : mode === "create" ? "Tạo bàn mới" : "Lưu thay đổi"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Sub-component: Modal Quản Lý Khu Vực
function AreasManagementModal({
  areas,
  tables,
  isCreating,
  onClose,
  onCreateArea,
  onRequestDeleteArea,
}: {
  areas: AreaListItem[];
  tables: TableListItem[];
  isCreating: boolean;
  onClose: () => void;
  onCreateArea: (payload: { name: string; description?: string | null; displayOrder: number }) => void;
  onRequestDeleteArea: (area: AreaListItem) => void;
}) {
  const [newAreaName, setNewAreaName] = useState("");
  const [newAreaDesc, setNewAreaDesc] = useState("");

  const handleCreate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAreaName.trim()) return;
    onCreateArea({
      name: newAreaName.trim(),
      description: newAreaDesc.trim() || null,
      displayOrder: areas.length + 1,
    });
    setNewAreaName("");
    setNewAreaDesc("");
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
      <div className="bg-[#1c1f26] border border-[#353a47] rounded-2xl w-full max-w-xl p-6 shadow-2xl space-y-4">
        <div className="flex items-center justify-between border-b border-[#2e333e] pb-3">
          <h3 className="text-lg font-black text-white font-heading flex items-center gap-2">
            <Layers size={20} className="text-amber-400" />
            <span>Quản Lý Khu Vực Nhà Hàng</span>
          </h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X size={18} />
          </button>
        </div>

        {/* Existing areas list */}
        <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
          {areas.length === 0 ? (
            <p className="text-xs text-gray-500 italic py-2">Chưa có khu vực nào.</p>
          ) : (
            areas.map((area) => {
              const tableCount = tables.filter((t) => t.areaId === area.id).length;
              return (
                <div
                  key={area.id}
                  className="bg-[#13151a] border border-[#2a2e38] p-3 rounded-xl flex items-center justify-between gap-3"
                >
                  <div>
                    <h4 className="text-sm font-bold text-white">{area.name}</h4>
                    {area.description && (
                      <p className="text-xs text-gray-400">{area.description}</p>
                    )}
                    <span className="text-[11px] text-amber-500 font-medium">
                      {tableCount} bàn ăn
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => onRequestDeleteArea(area)}
                    className="p-2 rounded-lg border text-xs transition-all bg-rose-950/40 text-rose-400 border-rose-500/30 hover:bg-rose-900/60 hover:text-white"
                    title="Xóa khu vực này"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              );
            })
          )}
        </div>

        {/* Add Area Form */}
        <form onSubmit={handleCreate} className="bg-[#13151a] p-4 rounded-xl border border-[#2e333d] space-y-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-orange-400">
            + Thêm khu vực mới
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <input
              type="text"
              placeholder="Tên khu vực (ví dụ: Tầng 2, Sân thượng...)"
              value={newAreaName}
              onChange={(e) => setNewAreaName(e.target.value)}
              className="bg-[#1a1d24] border border-[#333a47] px-3 py-1.5 rounded-lg text-xs text-white focus:outline-none focus:border-orange-500"
              required
            />
            <input
              type="text"
              placeholder="Mô tả ngắn (tùy chọn)..."
              value={newAreaDesc}
              onChange={(e) => setNewAreaDesc(e.target.value)}
              className="bg-[#1a1d24] border border-[#333a47] px-3 py-1.5 rounded-lg text-xs text-white focus:outline-none focus:border-orange-500"
            />
          </div>
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={isCreating || !newAreaName.trim()}
              className="px-4 py-1.5 bg-orange-600 hover:bg-orange-500 text-white rounded-lg text-xs font-bold transition-all disabled:opacity-50"
            >
              {isCreating ? "Đang thêm..." : "Thêm khu vực"}
            </button>
          </div>
        </form>

        <div className="flex justify-end pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-xs font-bold text-gray-300 hover:text-white bg-[#262a34] hover:bg-[#303642] transition-all"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}

// Sub-component: Modal Xác Nhận Xóa Khu Vực (Hỗ trợ chuyển bàn hoặc cascade)
function DeleteAreaConfirmModal({
  area,
  otherAreas,
  tablesInArea,
  isDeleting,
  onClose,
  onConfirm,
}: {
  area: AreaListItem;
  otherAreas: AreaListItem[];
  tablesInArea: TableListItem[];
  isDeleting: boolean;
  onClose: () => void;
  onConfirm: (options?: { cascade?: boolean; moveToAreaId?: string }) => void;
}) {
  const tableCount = tablesInArea.length;
  const [actionType, setActionType] = useState<"move" | "cascade">(
    otherAreas.length > 0 ? "move" : "cascade"
  );
  const [selectedTargetAreaId, setSelectedTargetAreaId] = useState<string>(
    otherAreas[0]?.id || ""
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (tableCount === 0) {
      onConfirm();
    } else if (actionType === "move") {
      if (!selectedTargetAreaId) return;
      onConfirm({ moveToAreaId: selectedTargetAreaId });
    } else {
      onConfirm({ cascade: true });
    }
  };

  return (
    <div className="fixed inset-0 z-[60] bg-black/85 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
      <div className="bg-[#1c1f26] border border-[#353a47] rounded-2xl w-full max-w-md p-6 shadow-2xl space-y-4">
        <div className="flex items-center justify-between border-b border-[#2e333e] pb-3">
          <div className="flex items-center gap-2 text-rose-400">
            <AlertTriangle size={22} />
            <h3 className="text-base font-black text-white">Xác Nhận Xóa Khu Vực</h3>
          </div>
          <button onClick={onClose} disabled={isDeleting} className="text-gray-400 hover:text-white">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <p className="text-sm text-gray-300">
            Bạn đang yêu cầu xóa khu vực: <strong className="text-white text-base underline decoration-orange-500">{area.name}</strong>
          </p>

          {tableCount === 0 ? (
            <div className="p-3.5 bg-[#14161b] rounded-xl border border-gray-800 text-xs text-gray-400 leading-relaxed">
              Khu vực này hiện không có bàn ăn nào. Bạn có chắc chắn muốn xóa không? Thao tác này không thể hoàn tác.
            </div>
          ) : (
            <div className="space-y-3">
              <div className="p-3 bg-amber-950/40 border border-amber-500/30 rounded-xl text-xs text-amber-300 flex items-start gap-2">
                <AlertTriangle size={16} className="text-amber-400 shrink-0 mt-0.5" />
                <div>
                  Khu vực này đang có <strong className="text-amber-200 font-bold">{tableCount} bàn ăn</strong>. Vui lòng chọn cách xử lý bên dưới:
                </div>
              </div>

              {otherAreas.length > 0 && (
                <label className={`block p-3 rounded-xl border cursor-pointer transition-all ${
                  actionType === "move"
                    ? "bg-orange-950/30 border-orange-500/50 text-white"
                    : "bg-[#14161b] border-gray-800 text-gray-400 hover:border-gray-700"
                }`}>
                  <div className="flex items-center gap-2 mb-2">
                    <input
                      type="radio"
                      name="areaAction"
                      checked={actionType === "move"}
                      onChange={() => setActionType("move")}
                      className="accent-orange-500"
                    />
                    <span className="text-xs font-bold text-white">
                      Chuyển toàn bộ {tableCount} bàn sang khu vực khác
                    </span>
                  </div>
                  {actionType === "move" && (
                    <div className="pl-6 pt-1">
                      <select
                        value={selectedTargetAreaId}
                        onChange={(e) => setSelectedTargetAreaId(e.target.value)}
                        className="w-full bg-[#1b1e26] border border-[#3a404f] rounded-lg px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-orange-500"
                      >
                        {otherAreas.map((a) => (
                          <option key={a.id} value={a.id}>
                            Khu vực: {a.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </label>
              )}

              <label className={`block p-3 rounded-xl border cursor-pointer transition-all ${
                actionType === "cascade"
                  ? "bg-rose-950/30 border-rose-500/50 text-white"
                  : "bg-[#14161b] border-gray-800 text-gray-400 hover:border-gray-700"
              }`}>
                <div className="flex items-center gap-2">
                  <input
                    type="radio"
                    name="areaAction"
                    checked={actionType === "cascade"}
                    onChange={() => setActionType("cascade")}
                    className="accent-rose-500"
                  />
                  <span className="text-xs font-bold text-rose-300">
                    Xóa khu vực cùng tất cả {tableCount} bàn ăn
                  </span>
                </div>
                <p className="text-[11px] text-gray-500 pl-6 mt-1">
                  Chỉ xóa các bàn trống, không có đơn hàng đang chạy. Bàn đang có khách hoặc đơn hàng dang dở sẽ không bị xóa.
                </p>
              </label>
            </div>
          )}

          <div className="flex justify-end gap-2.5 pt-2 border-t border-[#2e333e]">
            <button
              type="button"
              onClick={onClose}
              disabled={isDeleting}
              className="px-4 py-2 rounded-xl text-xs font-bold text-gray-400 hover:text-white bg-[#262a34] hover:bg-[#303642] transition-all"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={isDeleting}
              className="px-4 py-2 rounded-xl text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 transition-all flex items-center gap-1.5 disabled:opacity-50"
            >
              {isDeleting ? (
                <>
                  <RefreshCw size={14} className="animate-spin" />
                  <span>Đang xử lý...</span>
                </>
              ) : (
                <>
                  <Trash2 size={14} />
                  <span>
                    {tableCount === 0
                      ? "Xác nhận xóa"
                      : actionType === "move"
                      ? "Chuyển bàn & Xóa khu vực"
                      : "Xóa toàn bộ"}
                  </span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
