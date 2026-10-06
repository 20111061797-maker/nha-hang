"use client";

import { AppShell } from "@/components/layout/app-shell";
import { Bell, ChevronDown, TrendingUp, TrendingDown } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useBranch } from "@/features/branches/branch-provider";
import { dashboardApi } from "@/lib/api/dashboard-api";
import { inventoryApi } from "@/lib/api/inventory-api";
import { OrderStatus } from "@/types/pos";
import { KitchenOrderStatus } from "@/types/kitchen";
import type { DashboardRange } from "@/types/dashboard";

const RANGES: { key: DashboardRange; label: string }[] = [
  { key: "today", label: "Hôm nay" },
  { key: "yesterday", label: "Hôm qua" },
  { key: "week", label: "Tuần này" },
  { key: "month", label: "Tháng này" },
];

const DONUT_COLORS = ["#f97316", "#facc15", "#0284c7", "#10b981"];

const vnd = (n: number) => Math.round(n).toLocaleString("vi-VN");

function compactMoney(n: number) {
  if (n >= 1_000_000_000) return `${(n / 1_000_000_000).toFixed(2)} Tỷ`;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}K`;
  return String(Math.round(n));
}

function percentChange(current: number, previous: number): number | null {
  if (previous <= 0) return null;
  return ((current - previous) / previous) * 100;
}

function EmptyState({ text }: { text: string }) {
  return (
    <div className="flex-1 flex items-center justify-center text-center text-xs text-gray-500 py-6">
      {text}
    </div>
  );
}

export default function DashboardPage() {
  const { branchId } = useBranch();
  const [range, setRange] = useState<DashboardRange>("today");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [currentTime, setCurrentTime] = useState("");

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const days = ["Chủ Nhật", "Thứ Hai", "Thứ Ba", "Thứ Tư", "Thứ Năm", "Thứ Sáu", "Thứ Bảy"];
      const hours = String(now.getHours()).padStart(2, "0");
      const minutes = String(now.getMinutes()).padStart(2, "0");
      setCurrentTime(`${hours}:${minutes}, ${days[now.getDay()]}`);
    };
    updateTime();
    const interval = setInterval(updateTime, 30000);
    return () => clearInterval(interval);
  }, []);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["dashboard", branchId, range],
    queryFn: () => dashboardApi.get(branchId as string, range),
    enabled: Boolean(branchId),
    refetchInterval: 15000,
  });

  const { data: inventoryItems } = useQuery({
    queryKey: ["dashboard-inventory", branchId],
    queryFn: () => inventoryApi.getItems({ branchId: branchId as string }),
    enabled: Boolean(branchId),
    refetchInterval: 60000,
  });

  const stockAlerts = useMemo(
    () =>
      (inventoryItems ?? [])
        .filter((i) => i.isActive && (i.stockStatus === "OutOfStock" || i.stockStatus === "LowStock"))
        .sort((a, b) => (a.stockStatus === "OutOfStock" ? -1 : 1) - (b.stockStatus === "OutOfStock" ? -1 : 1))
        .slice(0, 4),
    [inventoryItems]
  );
  const stockAlertTotal = (inventoryItems ?? []).filter(
    (i) => i.isActive && (i.stockStatus === "OutOfStock" || i.stockStatus === "LowStock")
  ).length;

  const rangeLabel = RANGES.find((r) => r.key === range)?.label ?? "Hôm nay";
  const revenueChange = data ? percentChange(data.revenueToday, data.revenueYesterday) : null;
  const monthChange = data ? percentChange(data.revenueMonth, data.revenueLastMonth) : null;

  // Hourly revenue chart geometry
  const chart = useMemo(() => {
    const hourly = data?.hourly ?? [];
    const nowHour = new Date().getHours();
    const startHour = 6;
    const endHour = Math.max(nowHour, 12);
    const points = hourly.filter((h) => h.hour >= startHour && h.hour <= endHour);
    const max = Math.max(...points.map((p) => p.revenue), 1);
    const left = 30;
    const right = 680;
    const top = 30;
    const bottom = 210;
    const step = points.length > 1 ? (right - left) / (points.length - 1) : 0;
    const coords = points.map((p, i) => ({
      x: left + i * step,
      y: bottom - (p.revenue / max) * (bottom - top),
      hour: p.hour,
      revenue: p.revenue,
    }));
    const line = coords.map((c, i) => `${i === 0 ? "M" : "L"} ${c.x},${c.y}`).join(" ");
    const area = coords.length ? `${line} L ${coords[coords.length - 1].x},${bottom} L ${coords[0].x},${bottom} Z` : "";
    const peak = coords.reduce((best, c) => (c.revenue > (best?.revenue ?? 0) ? c : best), null as (typeof coords)[number] | null);
    return { coords, line, area, max, peak, startHour, endHour };
  }, [data]);

  const donutTotal = (data?.topByRevenue ?? []).reduce((s, p) => s + p.revenue, 0);
  const maxQty = Math.max(...(data?.topProducts ?? []).map((p) => p.quantity), 1);

  return (
    <AppShell>
      <div className="flex flex-col gap-6 selection:bg-amber-500 selection:text-black">
        {/* Sub-Header Toolbar with Filter & Live Clock */}
        <div className="flex flex-wrap items-center justify-between gap-3 bg-[#1a1c1e] border border-[#2d3035] p-3 sm:px-5 sm:py-3.5 rounded-2xl shadow-lg">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-lg sm:text-xl shadow-inner shrink-0">
              📊
            </div>
            <div>
              <h1 className="text-sm sm:text-base md:text-lg font-black uppercase tracking-wide text-white font-heading">
                BẢNG ĐIỀU KHIỂN QUẢN LÝ
              </h1>
              <div className="flex items-center gap-2 text-[11px] sm:text-xs text-gray-400">
                <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>Dữ liệu thực • cập nhật mỗi 15 giây • {currentTime}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="flex items-center gap-2 text-xs text-gray-400">
                <span className="hidden sm:inline">Thời gian:</span>
                <button
                  type="button"
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  className="flex items-center gap-2 bg-[#22252a] hover:bg-[#2c3037] border border-[#383d47] px-3.5 py-2 rounded-xl text-xs font-bold text-gray-200 transition-colors shadow-sm"
                >
                  <span>{rangeLabel}</span>
                  <ChevronDown size={14} className="text-gray-400" />
                </button>
              </div>

              {dropdownOpen && (
                <div className="absolute right-0 mt-2 w-36 bg-[#22252a] border border-[#383d47] rounded-xl shadow-xl py-1.5 z-50 text-xs">
                  {RANGES.map((r) => (
                    <button
                      key={r.key}
                      type="button"
                      onClick={() => {
                        setRange(r.key);
                        setDropdownOpen(false);
                      }}
                      className={`w-full text-left px-3.5 py-2 hover:bg-[#2d323b] transition-colors ${
                        range === r.key ? "text-amber-400 font-bold bg-[#2d323b]/50" : "text-gray-300"
                      }`}
                    >
                      {r.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[#22252a] border border-[#383d47] text-gray-300 text-xs">
              <Bell size={15} className="text-amber-400" />
              <span className="hidden md:inline text-gray-300">Cảnh báo</span>
              <span
                className={`w-5 h-5 rounded-full text-white font-black text-[10px] flex items-center justify-center ${
                  stockAlertTotal > 0 ? "bg-rose-600" : "bg-emerald-600"
                }`}
              >
                {stockAlertTotal}
              </span>
            </div>
          </div>
        </div>

        {!branchId && <EmptyState text="Chưa chọn chi nhánh." />}
        {isError && (
          <div className="rounded-xl border border-rose-800/60 bg-rose-950/40 text-rose-200 text-xs px-4 py-3">
            Không tải được dữ liệu bảng điều khiển. Vui lòng thử lại.
          </div>
        )}

        {/* ROW 1: metric cards */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="bg-[#241e1b] border border-[#443329] rounded-2xl p-4 md:p-5 flex justify-between items-start shadow-lg relative overflow-hidden group hover:border-[#6a4f3e] transition-all">
            <div className="flex flex-col gap-1 z-10">
              <span className="text-xs text-[#a99182] font-semibold">Doanh thu {rangeLabel.toLowerCase()}</span>
              <div className="flex items-baseline gap-1 mt-0.5">
                <span className="text-2xl md:text-3xl font-black text-[#fef3c7] font-mono tracking-tight">
                  {isLoading ? "…" : vnd(data?.revenueRange ?? 0)}
                </span>
                <span className="text-xs font-bold text-amber-400">VNĐ</span>
              </div>
              {range === "today" && (
                <span
                  className={`text-xs font-bold mt-1 flex items-center gap-1 ${
                    revenueChange === null
                      ? "text-gray-500"
                      : revenueChange >= 0
                        ? "text-emerald-400"
                        : "text-rose-400"
                  }`}
                >
                  {revenueChange !== null && (revenueChange >= 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />)}
                  <span>
                    {revenueChange === null
                      ? "Chưa có doanh thu hôm qua để so sánh"
                      : `${revenueChange >= 0 ? "+" : ""}${revenueChange.toFixed(0)}% so với hôm qua`}
                  </span>
                </span>
              )}
            </div>
            <div className="w-14 h-14 rounded-2xl bg-[#382b24] border border-[#533f34] flex items-center justify-center text-3xl shadow-inner group-hover:scale-105 transition-transform">
              💵
            </div>
            <div className="absolute -bottom-6 -right-6 w-28 h-28 bg-amber-600/10 rounded-full blur-xl pointer-events-none" />
          </div>

          <div className="bg-[#241e1b] border border-[#443329] rounded-2xl p-4 md:p-5 flex justify-between items-start shadow-lg relative overflow-hidden group hover:border-[#6a4f3e] transition-all">
            <div className="flex flex-col gap-1 z-10">
              <span className="text-xs text-[#a99182] font-semibold">Số bàn đang phục vụ</span>
              <div className="flex items-baseline gap-1 mt-0.5">
                <span className="text-2xl md:text-3xl font-black text-white font-mono tracking-tight">
                  {data?.tablesOccupied ?? 0}
                  <span className="text-lg text-gray-500">/{data?.tablesTotal ?? 0}</span>
                </span>
              </div>
              <span className="text-xs font-semibold text-gray-400 mt-1">
                Còn trống:{" "}
                <strong className="text-emerald-400">
                  {Math.max((data?.tablesTotal ?? 0) - (data?.tablesOccupied ?? 0), 0)} bàn
                </strong>
              </span>
            </div>
            <div className="w-14 h-14 rounded-2xl bg-[#382b24] border border-[#533f34] p-2 flex flex-col justify-between shadow-inner group-hover:scale-105 transition-transform">
              <div className="grid grid-cols-3 gap-1">
                {Array.from({ length: 9 }).map((_, i) => {
                  const total = data?.tablesTotal ?? 0;
                  const occ = data?.tablesOccupied ?? 0;
                  const filled = total > 0 ? Math.round((occ / total) * 9) : 0;
                  return (
                    <span
                      key={i}
                      className={`w-2.5 h-2.5 rounded-sm ${i < filled ? "bg-amber-500" : "bg-[#524137]"}`}
                    />
                  );
                })}
              </div>
            </div>
            <div className="absolute -bottom-6 -right-6 w-28 h-28 bg-orange-600/10 rounded-full blur-xl pointer-events-none" />
          </div>

          <div className="bg-[#241e1b] border border-[#443329] rounded-2xl p-4 md:p-5 flex justify-between items-start shadow-lg relative overflow-hidden group hover:border-[#6a4f3e] transition-all">
            <div className="flex flex-col gap-1 z-10">
              <span className="text-xs text-[#a99182] font-semibold">Số đơn hàng {rangeLabel.toLowerCase()}</span>
              <div className="flex items-baseline gap-1 mt-0.5">
                <span className="text-2xl md:text-3xl font-black text-white font-mono tracking-tight">
                  {isLoading ? "…" : (data?.orderCountRange ?? 0)}
                </span>
                <span className="text-xs text-gray-400">hóa đơn</span>
              </div>
              <span className="text-xs font-semibold text-amber-400 mt-1 flex items-center gap-1">
                {(data?.waitingKitchenCount ?? 0) > 0 && (
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
                )}
                <span>{data?.waitingKitchenCount ?? 0} đơn đang chờ bếp</span>
              </span>
            </div>
            <div className="w-14 h-14 rounded-2xl bg-[#382b24] border border-[#533f34] flex items-center justify-center text-3xl shadow-inner group-hover:scale-105 transition-transform">
              👨‍🍳
            </div>
            <div className="absolute -bottom-6 -right-6 w-28 h-28 bg-amber-600/10 rounded-full blur-xl pointer-events-none" />
          </div>

          <div className="bg-[#241e1b] border border-[#443329] rounded-2xl p-4 md:p-5 flex justify-between items-start shadow-lg relative overflow-hidden group hover:border-[#6a4f3e] transition-all">
            <div className="flex flex-col gap-1 z-10 min-w-0">
              <span className="text-xs text-[#a99182] font-semibold">Món bán chạy nhất</span>
              <div className="flex items-baseline gap-1 mt-0.5">
                <span className="text-xl md:text-2xl font-black text-amber-300 font-heading tracking-tight truncate">
                  {data?.topProducts?.[0]?.name ?? "—"}
                </span>
              </div>
              <span className="text-xs text-gray-400 mt-1">
                {data?.topProducts?.[0] ? (
                  <>
                    Đã bán: <strong className="text-white font-mono">{data.topProducts[0].quantity}</strong> phần
                  </>
                ) : (
                  "Chưa có đơn trong khoảng này"
                )}
              </span>
            </div>
            <div className="w-14 h-14 shrink-0 rounded-2xl bg-[#382b24] border border-[#533f34] flex items-center justify-center text-3xl shadow-inner group-hover:scale-105 transition-transform">
              🍽️
            </div>
            <div className="absolute -bottom-6 -right-6 w-28 h-28 bg-yellow-600/10 rounded-full blur-xl pointer-events-none" />
          </div>
        </section>

        {/* ROW 2: revenue chart + recent orders */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          <div className="lg:col-span-7 bg-[#1c1e22] border border-[#2d3138] rounded-2xl p-5 shadow-lg flex flex-col justify-between">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-sm md:text-base font-extrabold uppercase tracking-wide text-white flex items-center gap-2">
                  <span>DOANH THU THEO GIỜ HÔM NAY</span>
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                </h2>
                <span className="text-xs text-gray-400">Đơn vị: VNĐ (đơn đã thanh toán)</span>
              </div>
              {chart.peak && chart.peak.revenue > 0 && (
                <span className="text-xs font-mono text-emerald-400 bg-emerald-950/60 border border-emerald-800/60 px-2.5 py-1 rounded-md font-bold">
                  Peak ({String(chart.peak.hour).padStart(2, "0")}:00): {compactMoney(chart.peak.revenue)}
                </span>
              )}
            </div>

            <div className="relative w-full h-[250px] my-2">
              <svg viewBox="0 0 700 240" className="w-full h-full overflow-hidden">
                <defs>
                  <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10b981" stopOpacity="0.45" />
                    <stop offset="50%" stopColor="#f59e0b" stopOpacity="0.25" />
                    <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.0" />
                  </linearGradient>
                  <linearGradient id="strokeGradient" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#f59e0b" />
                    <stop offset="55%" stopColor="#10b981" />
                    <stop offset="100%" stopColor="#f59e0b" />
                  </linearGradient>
                </defs>

                {[0, 0.25, 0.5, 0.75, 1].map((f) => {
                  const y = 210 - f * 180;
                  return (
                    <g key={f}>
                      <line x1="30" y1={y} x2="680" y2={y} stroke="#2d3138" strokeDasharray={f === 0 ? undefined : "4 4"} />
                      <text x="2" y={y + 4} fill="#6b7280" fontSize="10" fontFamily="monospace">
                        {compactMoney(chart.max * f)}
                      </text>
                    </g>
                  );
                })}

                {chart.coords.length > 1 && (
                  <>
                    <path d={chart.area} fill="url(#chartGradient)" />
                    <path d={chart.line} fill="none" stroke="url(#strokeGradient)" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" />
                  </>
                )}
                {chart.peak && chart.peak.revenue > 0 && (
                  <>
                    <circle cx={chart.peak.x} cy={chart.peak.y} r="6" fill="#10b981" />
                    <circle cx={chart.peak.x} cy={chart.peak.y} r="12" fill="#10b981" opacity="0.3" className="animate-ping" />
                  </>
                )}
              </svg>
            </div>

            <div className="flex justify-between text-[11px] text-gray-500 font-mono px-4 mt-1 border-t border-[#2d3138] pt-2">
              {chart.coords
                .filter((_, i, arr) => arr.length <= 9 || i % Math.ceil(arr.length / 9) === 0)
                .map((c) => (
                  <span key={c.hour}>{String(c.hour).padStart(2, "0")}:00</span>
                ))}
            </div>

            <div className="mt-4 pt-3 border-t border-[#2d3138] flex justify-center">
              <div className="inline-flex items-center gap-2 bg-[#252830] border border-[#383d47] px-4 py-1.5 rounded-full text-xs font-semibold text-gray-300">
                <span>Tổng tháng này:</span>
                <strong className="text-amber-400 font-mono text-sm">{vnd(data?.revenueMonth ?? 0)} VNĐ</strong>
                {monthChange !== null && (
                  <span className={`font-bold ${monthChange >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                    ({monthChange >= 0 ? "+" : ""}
                    {monthChange.toFixed(1)}%)
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="lg:col-span-5 bg-[#1c1e22] border border-[#2d3138] rounded-2xl p-5 shadow-lg flex flex-col justify-between">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm md:text-base font-extrabold uppercase tracking-wide text-white">
                DANH SÁCH ĐƠN HÀNG GẦN ĐÂY
              </h2>
            </div>

            <div className="flex flex-col gap-2.5 overflow-y-auto max-h-[340px] pr-1">
              {(data?.recentOrders ?? []).length === 0 && <EmptyState text="Chưa có đơn hàng nào." />}
              {(data?.recentOrders ?? []).map((o) => {
                const paid = o.status === OrderStatus.Completed;
                const time = new Date(o.createdAt);
                return (
                  <div
                    key={o.id}
                    className="bg-[#24272e] border border-[#323640] rounded-xl p-3 flex flex-col gap-1.5 hover:border-amber-500/50 transition-colors"
                  >
                    <div className="flex justify-between items-center text-xs">
                      <div className="flex items-center gap-2">
                        <strong className="text-white font-mono">ĐƠN #{o.orderNumber}</strong>
                        <span className="text-gray-400">
                          {String(time.getHours()).padStart(2, "0")}:{String(time.getMinutes()).padStart(2, "0")}
                        </span>
                        {o.tableNumber && (
                          <span className="font-bold text-amber-400 bg-amber-950/60 px-1.5 py-0.5 rounded border border-amber-800/50">
                            Bàn {o.tableNumber}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-amber-300">{vnd(o.totalAmount)} ₫</span>
                        <span
                          className={`text-[10px] font-bold border px-2 py-0.5 rounded-full ${
                            paid
                              ? "bg-blue-950 text-blue-300 border-blue-700/60"
                              : "bg-emerald-950 text-emerald-300 border-emerald-700/60"
                          }`}
                        >
                          {paid ? "Đã thanh toán" : "Đang phục vụ"}
                        </span>
                      </div>
                    </div>
                    <p className="text-xs text-gray-400 line-clamp-1 m-0">{o.summary || "—"}</p>
                  </div>
                );
              })}
            </div>

            <div className="mt-3 pt-3 border-t border-[#2d3138] flex justify-between items-center text-xs text-gray-400">
              <span>Tự động làm mới dữ liệu</span>
              <Link href="/orders" className="text-amber-400 hover:underline font-bold">
                Xem tất cả đơn hàng →
              </Link>
            </div>
          </div>
        </section>

        {/* ROW 3 */}
        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Top món bán chạy */}
          <div className="bg-[#1c1e22] border border-[#2d3138] rounded-2xl p-4 shadow-lg flex flex-col justify-between">
            <h3 className="text-xs font-extrabold uppercase tracking-wide text-gray-200 mb-3">Top Món Bán Chạy</h3>
            {(data?.topProducts ?? []).length === 0 ? (
              <EmptyState text="Chưa có dữ liệu bán hàng." />
            ) : (
              <div className="h-40 flex items-end justify-between gap-2 px-2 pb-2 border-b border-[#2d3138]">
                {data!.topProducts.map((p) => (
                  <div key={p.name} className="flex-1 flex flex-col items-center gap-1 group justify-end h-full">
                    <span className="text-[10px] font-mono text-amber-300 font-bold">{p.quantity}</span>
                    <div
                      className="w-full bg-gradient-to-t from-[#c25e2e] to-[#f97316] rounded-t-md group-hover:brightness-110 transition-all"
                      style={{ height: `${Math.max((p.quantity / maxQty) * 100, 8)}px` }}
                    />
                    <span className="text-[9px] text-gray-400 text-center leading-tight line-clamp-2 mt-1">{p.name}</span>
                  </div>
                ))}
              </div>
            )}
            <span className="text-[10px] text-gray-500 text-center mt-2">Tính theo số lượng bán ra • {rangeLabel}</span>
          </div>

          {/* Top theo doanh thu (donut) */}
          <div className="bg-[#1c1e22] border border-[#2d3138] rounded-2xl p-4 shadow-lg flex flex-col justify-between">
            <h3 className="text-xs font-extrabold uppercase tracking-wide text-gray-200 mb-2">Cơ Cấu Doanh Thu Theo Món</h3>
            {donutTotal <= 0 ? (
              <EmptyState text="Chưa có dữ liệu doanh thu." />
            ) : (
              <div className="flex items-center justify-center gap-4 my-2">
                <div className="relative w-28 h-28 flex items-center justify-center shrink-0">
                  <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                    <path
                      d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                      fill="none"
                      stroke="#2d3138"
                      strokeWidth="4.5"
                    />
                    {(() => {
                      let offset = 0;
                      return data!.topByRevenue.map((p, i) => {
                        const pct = (p.revenue / donutTotal) * 100;
                        const el = (
                          <path
                            key={p.name}
                            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                            fill="none"
                            stroke={DONUT_COLORS[i % DONUT_COLORS.length]}
                            strokeWidth="4.8"
                            strokeDasharray={`${pct}, 100`}
                            strokeDashoffset={-offset}
                          />
                        );
                        offset += pct;
                        return el;
                      });
                    })()}
                  </svg>
                  <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                    <span className="text-sm font-black text-white font-mono leading-none">{compactMoney(donutTotal)}</span>
                    <span className="text-[9px] text-gray-400 mt-0.5">VNĐ</span>
                  </div>
                </div>
                <div className="flex flex-col gap-2 text-xs min-w-0">
                  {data!.topByRevenue.map((p, i) => (
                    <div key={p.name} className="flex items-center gap-2 min-w-0">
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: DONUT_COLORS[i % DONUT_COLORS.length] }}
                      />
                      <span className="text-gray-300 font-semibold truncate">
                        {p.name} ({Math.round((p.revenue / donutTotal) * 100)}%)
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <span className="text-[10px] text-gray-500 text-center mt-2">Top 4 món theo doanh thu • {rangeLabel}</span>
          </div>

          {/* Cảnh báo tồn kho */}
          <div className="bg-[#1c1e22] border border-[#2d3138] rounded-2xl p-4 shadow-lg flex flex-col justify-between">
            <h3 className="text-xs font-extrabold uppercase tracking-wide text-gray-200 mb-3 flex items-center justify-between">
              <span>CẢNH BÁO TỒN KHO</span>
              <span
                className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${
                  stockAlertTotal > 0
                    ? "text-rose-400 bg-rose-950/60 border-rose-900/60"
                    : "text-emerald-400 bg-emerald-950/60 border-emerald-900/60"
                }`}
              >
                {stockAlertTotal} mục
              </span>
            </h3>
            <div className="flex flex-col gap-2">
              {stockAlerts.length === 0 && <EmptyState text="Tồn kho ổn định, không có cảnh báo." />}
              {stockAlerts.map((i) => {
                const out = i.stockStatus === "OutOfStock";
                return (
                  <div
                    key={i.id}
                    className={`rounded-lg px-3 py-2 flex items-center gap-2 text-xs border ${
                      out ? "bg-[#381d1d] border-rose-800/60" : "bg-[#382b1d] border-amber-800/60"
                    }`}
                  >
                    <span
                      className={`px-1.5 py-0.5 text-white font-extrabold text-[10px] rounded ${
                        out ? "bg-rose-600" : "bg-amber-600"
                      }`}
                    >
                      {out ? "HẾT" : "SẮP HẾT"}
                    </span>
                    <span className={`font-semibold truncate ${out ? "text-rose-100" : "text-amber-100"}`}>
                      {i.ingredientName} (còn {i.currentQuantity} {i.unitName})
                    </span>
                  </div>
                );
              })}
            </div>
            <Link href="/inventory" className="text-[10px] text-amber-400 text-center mt-2 hover:underline font-bold">
              Mở quản lý tồn kho →
            </Link>
          </div>

          {/* Đơn hàng trong bếp */}
          <div className="bg-[#1c1e22] border border-[#2d3138] rounded-2xl p-4 shadow-lg flex flex-col justify-between">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-extrabold uppercase tracking-wide text-gray-200">ĐƠN HÀNG TRONG BẾP</h3>
              <Link href="/kitchen" className="text-xs text-amber-400 font-bold hover:underline">
                Vào KDS →
              </Link>
            </div>
            <div className="mb-2">
              <span className="text-sm font-black text-amber-300">
                Tổng: <span className="font-mono text-base text-white">{data?.kitchenOrderCount ?? 0} đơn</span> trong bếp
              </span>
            </div>
            <div className="flex flex-col gap-2">
              {(data?.kitchenOrders ?? []).length === 0 && <EmptyState text="Bếp đang rảnh." />}
              {(data?.kitchenOrders ?? []).map((k) => {
                const late = k.waitingMinutes >= 8;
                const time = new Date(k.createdAt);
                return (
                  <div
                    key={k.id}
                    className="bg-[#24272e] border border-[#383d47] rounded-lg px-3 py-2 flex items-center justify-between text-xs"
                  >
                    <span className="text-gray-200 font-medium">
                      ĐƠN #{k.orderNumber} | {String(time.getHours()).padStart(2, "0")}:
                      {String(time.getMinutes()).padStart(2, "0")}
                      {k.tableNumber ? ` | Bàn ${k.tableNumber}` : ""}{" "}
                      <span className={`font-bold ${late ? "text-rose-400" : "text-amber-400"}`}>
                        {k.status === KitchenOrderStatus.New
                          ? `(Chờ ${k.waitingMinutes}m)`
                          : `(Đang nấu ${k.waitingMinutes}m)`}
                      </span>
                    </span>
                    <span className="text-sm">{late ? "🔥" : ""}</span>
                  </div>
                );
              })}
            </div>
            <span className="text-[10px] text-gray-500 text-center mt-2">Đồng bộ trực tiếp từ màn hình bếp</span>
          </div>
        </section>
      </div>
    </AppShell>
  );
}
