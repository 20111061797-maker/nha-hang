"use client";

import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { auditApi } from "@/lib/api/audit-api";
import type { AuditLogItem } from "@/types/audit";
import {
  History,
  Search,
  RefreshCw,
  User,
  Calendar,
  Clock,
  Activity,
  CalendarClock,
  Users,
  ShieldCheck,
  CreditCard,
  ChefHat,
  Package,
  Boxes,
  UtensilsCrossed,
  Info,
  X,
  ChevronLeft,
  ChevronRight,
  Filter,
} from "lucide-react";

const CATEGORIES = [
  { id: "all", label: "Tất cả thao tác", icon: Activity },
  { id: "orders", label: "Đơn hàng", icon: Package },
  { id: "payments", label: "Thanh toán", icon: CreditCard },
  { id: "kitchen", label: "Nhà bếp KDS", icon: ChefHat },
  { id: "menu", label: "Thực đơn & Giá", icon: UtensilsCrossed },
  { id: "inventory", label: "Kho hàng", icon: Boxes },
  { id: "employees", label: "Nhân viên & Quyền", icon: Users },
];

export function AuditLogsView() {
  const [search, setSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [selectedUserId, setSelectedUserId] = useState<string>("all");
  const [dateRange, setDateRange] = useState<string>("all");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(25);
  const [activeDetailItem, setActiveDetailItem] = useState<AuditLogItem | null>(null);

  // Compute fromDate / toDate based on dateRange selection
  const { fromDate, toDate } = useMemo(() => {
    const now = new Date();
    if (dateRange === "today") {
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
      return { fromDate: start.toISOString(), toDate: undefined };
    }
    if (dateRange === "yesterday") {
      const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1, 0, 0, 0);
      const end = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
      return { fromDate: start.toISOString(), toDate: end.toISOString() };
    }
    if (dateRange === "7days") {
      const start = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      return { fromDate: start.toISOString(), toDate: undefined };
    }
    if (dateRange === "30days") {
      const start = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      return { fromDate: start.toISOString(), toDate: undefined };
    }
    return { fromDate: undefined, toDate: undefined };
  }, [dateRange]);

  // Fetch audit logs
  const {
    data: logsData,
    isLoading: logsLoading,
    isFetching: logsFetching,
    refetch,
  } = useQuery({
    queryKey: [
      "audit-logs",
      search,
      selectedCategory,
      selectedUserId,
      fromDate,
      toDate,
      page,
      pageSize,
    ],
    queryFn: () =>
      auditApi.getLogs({
        search: search.trim() || undefined,
        actionCategory: selectedCategory === "all" ? undefined : selectedCategory,
        userId: selectedUserId === "all" ? undefined : selectedUserId,
        fromDate,
        toDate,
        page,
        pageSize,
      }),
    refetchInterval: 15000,
  });

  // Fetch stats
  const { data: stats } = useQuery({
    queryKey: ["audit-stats"],
    queryFn: auditApi.getStats,
    refetchInterval: 30000,
  });

  // Fetch actors for filter dropdown
  const { data: actors = [] } = useQuery({
    queryKey: ["audit-actors"],
    queryFn: auditApi.getActors,
  });

  const getCategoryBadge = (category: string) => {
    switch (category) {
      case "payments":
        return {
          bg: "bg-emerald-500/15 border-emerald-500/30 text-emerald-300",
          dot: "bg-emerald-400",
          label: "Thanh toán",
        };
      case "orders":
        return {
          bg: "bg-amber-500/15 border-amber-500/30 text-amber-300",
          dot: "bg-amber-400",
          label: "Đơn hàng",
        };
      case "kitchen":
        return {
          bg: "bg-orange-500/15 border-orange-500/30 text-orange-300",
          dot: "bg-orange-400",
          label: "Bếp KDS",
        };
      case "menu":
        return {
          bg: "bg-purple-500/15 border-purple-500/30 text-purple-300",
          dot: "bg-purple-400",
          label: "Thực đơn",
        };
      case "inventory":
        return {
          bg: "bg-cyan-500/15 border-cyan-500/30 text-cyan-300",
          dot: "bg-cyan-400",
          label: "Kho hàng",
        };
      case "employees":
        return {
          bg: "bg-sky-500/15 border-sky-500/30 text-sky-300",
          dot: "bg-sky-400",
          label: "Nhân sự",
        };
      default:
        return {
          bg: "bg-slate-500/15 border-slate-500/30 text-slate-300",
          dot: "bg-slate-400",
          label: "Hệ thống",
        };
    }
  };

  const formatDateTime = (isoString: string) => {
    try {
      const d = new Date(isoString);
      return new Intl.DateTimeFormat("vi-VN", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      }).format(d);
    } catch {
      return isoString;
    }
  };

  const formatRelativeTime = (isoString?: string | null) => {
    if (!isoString) return "Chưa có";
    try {
      const diffMs = Date.now() - new Date(isoString).getTime();
      const diffSec = Math.floor(diffMs / 1000);
      if (diffSec < 60) return "Vừa xong";
      const diffMin = Math.floor(diffSec / 60);
      if (diffMin < 60) return `${diffMin} phút trước`;
      const diffHour = Math.floor(diffMin / 60);
      if (diffHour < 24) return `${diffHour} giờ trước`;
      const diffDay = Math.floor(diffHour / 24);
      return `${diffDay} ngày trước`;
    } catch {
      return "Gần đây";
    }
  };

  const getInitials = (name?: string) => {
    if (!name) return "HT";
    const parts = name.trim().split(" ");
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  };

  return (
    <div className="flex flex-col gap-6 max-w-[1600px] mx-auto p-4 sm:p-6 text-ink">
      {/* Header Row */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-line">
        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-amber-500 uppercase tracking-wider mb-1">
            <ShieldCheck size={16} />
            <span>Kiểm toán &amp; Giám sát hệ thống</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-ink">
            Nhật ký &amp; Lịch sử thao tác tài khoản
          </h1>
          <p className="text-xs sm:text-sm text-ink-secondary mt-1">
            Theo dõi chi tiết mọi hoạt động của các nhân viên, thu ngân và tài khoản quản trị trên hệ thống.
          </p>
        </div>

        <button
          type="button"
          onClick={() => refetch()}
          disabled={logsFetching}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-surface hover:bg-surface-hover border border-line-strong text-xs font-bold text-ink shadow-sm cursor-pointer transition-all active:scale-95 disabled:opacity-50 shrink-0 self-start sm:self-auto"
        >
          <RefreshCw size={15} className={logsFetching ? "animate-spin text-amber-400" : ""} />
          <span>Làm mới</span>
        </button>
      </div>

      {/* KPI Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Total logs */}
        <div className="p-4 rounded-2xl bg-surface border border-line shadow-sm flex items-center justify-between">
          <div className="flex flex-col gap-1">
            <span className="text-xs font-bold text-ink-secondary uppercase tracking-wider">
              Tổng số thao tác
            </span>
            <span className="text-2xl sm:text-3xl font-black font-mono text-ink">
              {stats?.totalLogs.toLocaleString("vi-VN") ?? "0"}
            </span>
            <span className="text-[11px] text-muted">Toàn bộ lịch sử hệ thống</span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
            <Activity size={24} />
          </div>
        </div>

        {/* Card 2: Today logs */}
        <div className="p-4 rounded-2xl bg-surface border border-line shadow-sm flex items-center justify-between">
          <div className="flex flex-col gap-1">
            <span className="text-xs font-bold text-ink-secondary uppercase tracking-wider">
              Thao tác hôm nay
            </span>
            <span className="text-2xl sm:text-3xl font-black font-mono text-emerald-400">
              {stats?.todayLogs.toLocaleString("vi-VN") ?? "0"}
            </span>
            <span className="text-[11px] text-emerald-400/80 font-medium">Từ 00:00 hôm nay</span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
            <CalendarClock size={24} />
          </div>
        </div>

        {/* Card 3: Active Accounts */}
        <div className="p-4 rounded-2xl bg-surface border border-line shadow-sm flex items-center justify-between">
          <div className="flex flex-col gap-1">
            <span className="text-xs font-bold text-ink-secondary uppercase tracking-wider">
              Tài khoản hoạt động
            </span>
            <span className="text-2xl sm:text-3xl font-black font-mono text-sky-400">
              {stats?.activeUsersCount ?? "0"}
            </span>
            <span className="text-[11px] text-muted">Có ghi nhận thao tác</span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-sky-500/10 border border-sky-500/20 text-sky-400 flex items-center justify-center shrink-0">
            <Users size={24} />
          </div>
        </div>

        {/* Card 4: Latest Activity */}
        <div className="p-4 rounded-2xl bg-surface border border-line shadow-sm flex items-center justify-between">
          <div className="flex flex-col gap-1">
            <span className="text-xs font-bold text-ink-secondary uppercase tracking-wider">
              Hoạt động gần nhất
            </span>
            <span className="text-xl sm:text-2xl font-black text-amber-400">
              {formatRelativeTime(stats?.latestActivityAt)}
            </span>
            <span className="text-[11px] text-muted truncate max-w-[150px]">
              {stats?.latestActivityAt ? formatDateTime(stats.latestActivityAt) : "Chưa có"}
            </span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-orange-500/10 border border-orange-500/20 text-orange-400 flex items-center justify-center shrink-0">
            <Clock size={24} />
          </div>
        </div>
      </div>

      {/* Category Filter Chips */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        {CATEGORIES.map((cat) => {
          const Icon = cat.icon;
          const isActive = selectedCategory === cat.id;
          return (
            <button
              key={cat.id}
              type="button"
              onClick={() => {
                setSelectedCategory(cat.id);
                setPage(1);
              }}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer border ${
                isActive
                  ? "bg-amber-500 text-black border-amber-400 shadow-md shadow-amber-500/20"
                  : "bg-surface hover:bg-surface-hover text-ink-secondary hover:text-ink border-line"
              }`}
            >
              <Icon size={14} />
              <span>{cat.label}</span>
            </button>
          );
        })}
      </div>

      {/* Search & Select Filters */}
      <div className="p-4 rounded-2xl bg-surface border border-line shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Search Input */}
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" />
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Tìm theo tên nhân viên, hành động, đối tượng tác động, IP..."
            className="w-full bg-well border border-line-strong rounded-xl pl-10 pr-4 py-2.5 text-xs text-ink placeholder-subtle focus:outline-none focus:border-amber-500 transition-colors"
          />
        </div>

        {/* Dropdowns */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* User / Actor filter */}
          <div className="flex items-center gap-1.5 bg-well border border-line-strong rounded-xl px-3 py-1.5 text-xs">
            <User size={14} className="text-muted shrink-0" />
            <select
              value={selectedUserId}
              onChange={(e) => {
                setSelectedUserId(e.target.value);
                setPage(1);
              }}
              className="bg-transparent text-ink font-semibold text-xs focus:outline-none cursor-pointer"
            >
              <option value="all">Tất cả tài khoản</option>
              {actors.map((a) => (
                <option key={a.userId ?? a.username} value={a.userId ?? ""}>
                  {a.fullName} (@{a.username})
                </option>
              ))}
            </select>
          </div>

          {/* Date range filter */}
          <div className="flex items-center gap-1.5 bg-well border border-line-strong rounded-xl px-3 py-1.5 text-xs">
            <Calendar size={14} className="text-muted shrink-0" />
            <select
              value={dateRange}
              onChange={(e) => {
                setDateRange(e.target.value);
                setPage(1);
              }}
              className="bg-transparent text-ink font-semibold text-xs focus:outline-none cursor-pointer"
            >
              <option value="all">Tất cả thời gian</option>
              <option value="today">Hôm nay</option>
              <option value="yesterday">Hôm qua</option>
              <option value="7days">7 ngày qua</option>
              <option value="30days">30 ngày qua</option>
            </select>
          </div>

          {/* Reset Filters button */}
          {(search || selectedCategory !== "all" || selectedUserId !== "all" || dateRange !== "all") && (
            <button
              type="button"
              onClick={() => {
                setSearch("");
                setSelectedCategory("all");
                setSelectedUserId("all");
                setDateRange("all");
                setPage(1);
              }}
              className="px-3 py-2 text-xs font-bold text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 rounded-xl transition-colors cursor-pointer"
            >
              Xóa lọc
            </button>
          )}
        </div>
      </div>

      {/* Main Table View */}
      <div className="rounded-2xl bg-surface border border-line shadow-sm overflow-hidden flex flex-col">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-line bg-well/70 text-ink-secondary font-bold uppercase tracking-wider text-[11px]">
                <th className="py-3.5 px-4 w-44">Thời gian</th>
                <th className="py-3.5 px-4 min-w-[200px]">Tài khoản thao tác</th>
                <th className="py-3.5 px-4 min-w-[220px]">Hành động</th>
                <th className="py-3.5 px-4 min-w-[160px]">Đối tượng tác động</th>
                <th className="py-3.5 px-4 w-32">Địa chỉ IP</th>
                <th className="py-3.5 px-4 w-24 text-right">Chi tiết</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {logsLoading ? (
                <tr>
                  <td colSpan={6} className="py-16 text-center text-muted">
                    <div className="flex flex-col items-center justify-center gap-3">
                      <RefreshCw size={24} className="animate-spin text-amber-500" />
                      <span className="text-xs font-semibold">Đang tải lịch sử thao tác...</span>
                    </div>
                  </td>
                </tr>
              ) : !logsData || logsData.items.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-16 text-center text-muted">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <History size={36} className="text-faint" />
                      <span className="text-sm font-bold text-ink">Không có nhật ký thao tác nào</span>
                      <span className="text-xs text-subtle">
                        Thử điều chỉnh lại bộ lọc tìm kiếm hoặc chọn khoảng thời gian khác.
                      </span>
                    </div>
                  </td>
                </tr>
              ) : (
                logsData.items.map((item) => {
                  const badge = getCategoryBadge(item.actionCategory);
                  return (
                    <tr
                      key={item.id}
                      className="hover:bg-well/40 transition-colors group cursor-pointer"
                      onClick={() => setActiveDetailItem(item)}
                    >
                      {/* Time */}
                      <td className="py-3.5 px-4">
                        <div className="flex flex-col leading-tight">
                          <span className="font-mono font-bold text-ink">
                            {formatDateTime(item.createdAt)}
                          </span>
                          <span className="text-[10px] text-muted mt-0.5">
                            {formatRelativeTime(item.createdAt)}
                          </span>
                        </div>
                      </td>

                      {/* Actor */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-amber-600 to-orange-500 text-white font-black text-xs flex items-center justify-center shadow-sm shrink-0">
                            {getInitials(item.fullName)}
                          </div>
                          <div className="flex flex-col leading-tight truncate">
                            <span className="font-bold text-ink truncate">{item.fullName}</span>
                            <span className="text-[11px] font-mono text-muted truncate">
                              @{item.username}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Action */}
                      <td className="py-3.5 px-4">
                        <div className="flex flex-col gap-1 items-start">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${badge.bg}`}
                          >
                            <span className={`w-1.5 h-1.5 rounded-full ${badge.dot}`} />
                            {item.actionTitle}
                          </span>
                          <span className="text-[10px] font-mono text-subtle pl-1">
                            {item.action}
                          </span>
                        </div>
                      </td>

                      {/* Entity */}
                      <td className="py-3.5 px-4">
                        <div className="flex flex-col gap-0.5">
                          <span className="font-bold text-ink">{item.entityType}</span>
                          {item.entityId && (
                            <span className="font-mono text-[10px] text-muted truncate max-w-[140px]" title={item.entityId}>
                              #{item.entityId.slice(-8)}
                            </span>
                          )}
                        </div>
                      </td>

                      {/* IP Address */}
                      <td className="py-3.5 px-4">
                        <span className="font-mono text-[11px] text-muted bg-well px-2 py-0.5 rounded-md border border-line">
                          {item.ipAddress || "127.0.0.1"}
                        </span>
                      </td>

                      {/* Detail button */}
                      <td className="py-3.5 px-4 text-right">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setActiveDetailItem(item);
                          }}
                          className="px-2.5 py-1 rounded-lg bg-well hover:bg-surface-hover border border-line text-ink-secondary hover:text-ink text-xs font-semibold transition-all cursor-pointer"
                        >
                          Xem
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        {logsData && logsData.totalPages > 1 && (
          <div className="p-4 border-t border-line flex flex-col sm:flex-row items-center justify-between gap-3 bg-well/30 text-xs">
            <span className="text-muted">
              Hiển thị{" "}
              <strong>
                {(logsData.page - 1) * logsData.pageSize + 1} -{" "}
                {Math.min(logsData.page * logsData.pageSize, logsData.totalCount)}
              </strong>{" "}
              trên tổng số <strong>{logsData.totalCount.toLocaleString("vi-VN")}</strong> thao tác
            </span>

            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={logsData.page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-surface border border-line hover:bg-surface-hover text-ink font-bold disabled:opacity-40 transition-all cursor-pointer"
              >
                <ChevronLeft size={14} />
                <span>Trước</span>
              </button>

              <span className="font-mono font-bold text-ink px-2">
                {logsData.page} / {logsData.totalPages}
              </span>

              <button
                type="button"
                disabled={logsData.page >= logsData.totalPages}
                onClick={() => setPage((p) => Math.min(logsData.totalPages, p + 1))}
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-surface border border-line hover:bg-surface-hover text-ink font-bold disabled:opacity-40 transition-all cursor-pointer"
              >
                <span>Sau</span>
                <ChevronRight size={14} />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {activeDetailItem && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fade-in"
          onClick={() => setActiveDetailItem(null)}
        >
          <div
            className="w-full max-w-lg rounded-3xl bg-surface border border-line shadow-2xl p-6 flex flex-col gap-4 text-ink animate-scale-in"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-line">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
                  <Info size={20} />
                </div>
                <div>
                  <h3 className="text-base font-black text-ink">{activeDetailItem.actionTitle}</h3>
                  <span className="text-xs font-mono text-muted">Mã log: #{activeDetailItem.id.slice(-8)}</span>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setActiveDetailItem(null)}
                className="w-8 h-8 rounded-full bg-well hover:bg-surface-hover flex items-center justify-center text-muted hover:text-ink transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {/* Content Details */}
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="p-3 rounded-xl bg-well border border-line flex flex-col gap-1">
                <span className="text-[11px] font-bold text-muted uppercase">Tài khoản</span>
                <span className="font-bold text-ink">{activeDetailItem.fullName}</span>
                <span className="font-mono text-subtle text-[11px]">@{activeDetailItem.username}</span>
              </div>

              <div className="p-3 rounded-xl bg-well border border-line flex flex-col gap-1">
                <span className="text-[11px] font-bold text-muted uppercase">Thời gian</span>
                <span className="font-mono font-bold text-ink">
                  {formatDateTime(activeDetailItem.createdAt)}
                </span>
                <span className="text-subtle text-[11px]">{formatRelativeTime(activeDetailItem.createdAt)}</span>
              </div>

              <div className="p-3 rounded-xl bg-well border border-line flex flex-col gap-1">
                <span className="text-[11px] font-bold text-muted uppercase">Mã thao tác</span>
                <span className="font-mono font-bold text-amber-400">{activeDetailItem.action}</span>
                <span className="text-[11px] text-muted">Nhóm: {activeDetailItem.actionCategory}</span>
              </div>

              <div className="p-3 rounded-xl bg-well border border-line flex flex-col gap-1">
                <span className="text-[11px] font-bold text-muted uppercase">Đối tượng tác động</span>
                <span className="font-bold text-ink">{activeDetailItem.entityType}</span>
                <span className="font-mono text-subtle text-[11px] truncate" title={activeDetailItem.entityId ?? ""}>
                  {activeDetailItem.entityId ? `#${activeDetailItem.entityId}` : "N/A"}
                </span>
              </div>
            </div>

            {/* IP Address */}
            <div className="p-3 rounded-xl bg-well border border-line flex items-center justify-between text-xs">
              <span className="text-muted font-bold">Địa chỉ IP thiết bị:</span>
              <span className="font-mono font-bold text-ink">
                {activeDetailItem.ipAddress
                  ? activeDetailItem.ipAddress === "127.0.0.1" || activeDetailItem.ipAddress === "::1"
                    ? `${activeDetailItem.ipAddress} (Localhost / Cùng máy)`
                    : activeDetailItem.ipAddress
                  : "127.0.0.1 (Localhost / Cùng máy)"}
              </span>
            </div>

            {/* Metadata JSON */}
            {activeDetailItem.metadataJson && (
              <div className="flex flex-col gap-1.5">
                <span className="text-xs font-bold text-ink-secondary">Dữ liệu chi tiết (Metadata):</span>
                <pre className="p-3 rounded-xl bg-black/60 border border-line font-mono text-[11px] text-emerald-300 max-h-48 overflow-y-auto whitespace-pre-wrap break-all">
                  {(() => {
                    try {
                      return JSON.stringify(JSON.parse(activeDetailItem.metadataJson), null, 2);
                    } catch {
                      return activeDetailItem.metadataJson;
                    }
                  })()}
                </pre>
              </div>
            )}

            <button
              type="button"
              onClick={() => setActiveDetailItem(null)}
              className="w-full py-2.5 rounded-xl bg-well hover:bg-surface-hover border border-line text-xs font-bold text-ink transition-colors cursor-pointer mt-1"
            >
              Đóng
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
