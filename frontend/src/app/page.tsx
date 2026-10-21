"use client";

import { AppShell } from "@/components/layout/app-shell";
import {
  Bell,
  ChevronDown,
  TrendingUp,
  TrendingDown,
  Sparkles,
  Percent,
} from "lucide-react";
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
    <div className="flex-1 flex items-center justify-center text-center text-xs text-subtle py-6">
      {text}
    </div>
  );
}

export default function DashboardPage() {
  const { branchId } = useBranch();
  const [range, setRange] = useState<DashboardRange>("today");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [currentTime, setCurrentTime] = useState("");
  const [chartMetric, setChartMetric] = useState<"both" | "revenue" | "profit">("both");
  const [hoveredPoint, setHoveredPoint] = useState<{
    hour: number;
    revenue: number;
    cost: number;
    profit: number;
    x: number;
    y: number;
  } | null>(null);

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
  const profitChange = data ? percentChange(data.profitToday, data.profitYesterday) : null;
  const profitMonthChange = data ? percentChange(data.profitMonth, data.profitLastMonth) : null;

  const aov = (data?.orderCountRange ?? 0) > 0 ? (data?.revenueRange ?? 0) / data!.orderCountRange : 0;
  const costRatio = (data?.revenueRange ?? 0) > 0 ? ((data?.costRange ?? 0) / data!.revenueRange) * 100 : 0;
  const profitRatio = data?.profitMarginRange ?? 0;

  // Hourly revenue & profit chart geometry
  const chart = useMemo(() => {
    const hourly = data?.hourly ?? [];
    const nowHour = new Date().getHours();
    const startHour = 6;
    const endHour = Math.max(nowHour, 12);
    const points = hourly.filter((h) => h.hour >= startHour && h.hour <= endHour);
    const maxVal = Math.max(
      ...points.map((p) => Math.max(p.revenue, p.profit, p.cost, 0)),
      1
    );
    const left = 35;
    const right = 675;
    const top = 30;
    const bottom = 210;
    const step = points.length > 1 ? (right - left) / (points.length - 1) : 0;

    const coords = points.map((p, i) => {
      const x = left + i * step;
      const yRev = bottom - (Math.max(p.revenue, 0) / maxVal) * (bottom - top);
      const yProfit = bottom - (Math.max(p.profit, 0) / maxVal) * (bottom - top);
      const yCost = bottom - (Math.max(p.cost, 0) / maxVal) * (bottom - top);
      return {
        x,
        yRev,
        yProfit,
        yCost,
        hour: p.hour,
        revenue: p.revenue,
        cost: p.cost,
        profit: p.profit,
      };
    });

    const lineRev = coords.map((c, i) => `${i === 0 ? "M" : "L"} ${c.x},${c.yRev}`).join(" ");
    const areaRev = coords.length ? `${lineRev} L ${coords[coords.length - 1].x},${bottom} L ${coords[0].x},${bottom} Z` : "";

    const lineProfit = coords.map((c, i) => `${i === 0 ? "M" : "L"} ${c.x},${c.yProfit}`).join(" ");
    const areaProfit = coords.length ? `${lineProfit} L ${coords[coords.length - 1].x},${bottom} L ${coords[0].x},${bottom} Z` : "";

    const peakRev = coords.reduce((best, c) => (c.revenue > (best?.revenue ?? 0) ? c : best), null as (typeof coords)[number] | null);
    const peakProfit = coords.reduce((best, c) => (c.profit > (best?.profit ?? 0) ? c : best), null as (typeof coords)[number] | null);

    return { coords, lineRev, areaRev, lineProfit, areaProfit, maxVal, peakRev, peakProfit, startHour, endHour };
  }, [data]);

  const donutTotal = (data?.topByRevenue ?? []).reduce((s, p) => s + p.revenue, 0);
  const maxQty = Math.max(...(data?.topProducts ?? []).map((p) => p.quantity), 1);

  return (
    <AppShell>
      <div className="flex flex-col gap-6 selection:bg-amber-500 selection:text-black">
        {/* Sub-Header Toolbar with Filter & Live Clock */}
        <div className="flex flex-wrap items-center justify-between gap-3 bg-surface border border-line p-3 sm:px-5 sm:py-3.5 rounded-2xl shadow-lg">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-lg sm:text-xl shadow-inner shrink-0">
              📊
            </div>
            <div>
              <h1 className="text-sm sm:text-base md:text-lg font-black uppercase tracking-wide text-ink font-heading">
                BẢNG ĐIỀU KHIỂN DOANH THU & LỢI NHUẬN
              </h1>
              <div className="flex items-center gap-2 text-[11px] sm:text-xs text-muted">
                <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>Dữ liệu thực • cập nhật mỗi 15 giây • {currentTime}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="flex items-center gap-2 text-xs text-muted">
                <span className="hidden sm:inline">Thời gian:</span>
                <button
                  type="button"
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  className="flex items-center gap-2 bg-raised hover:bg-surface-hover border border-line-strong px-3.5 py-2 rounded-xl text-xs font-bold text-ink transition-colors shadow-sm"
                >
                  <span>{rangeLabel}</span>
                  <ChevronDown size={14} className="text-muted" />
                </button>
              </div>

              {dropdownOpen && (
                <div className="absolute right-0 mt-2 w-36 bg-raised border border-line-strong rounded-xl shadow-xl py-1.5 z-50 text-xs">
                  {RANGES.map((r) => (
                    <button
                      key={r.key}
                      type="button"
                      onClick={() => {
                        setRange(r.key);
                        setDropdownOpen(false);
                      }}
                      className={`w-full text-left px-3.5 py-2 hover:bg-surface-hover transition-colors ${
                        range === r.key ? "text-amber-400 font-bold bg-surface-hover/50" : "text-ink-secondary"
                      }`}
                    >
                      {r.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-raised border border-line-strong text-ink-secondary text-xs">
              <Bell size={15} className="text-amber-400" />
              <span className="hidden md:inline text-ink-secondary">Cảnh báo</span>
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

        {/* ROW 1: 4 Executive Financial & Operational Cards */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Doanh thu */}
          <div className="bg-warm-surface border border-warm-line rounded-2xl p-4 md:p-5 flex justify-between items-start shadow-lg relative overflow-hidden group hover:border-amber-500/50 transition-all">
            <div className="flex flex-col gap-1 z-10">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-400" />
                <span className="text-xs text-warm-muted font-semibold uppercase tracking-wider">
                  Tổng Doanh Thu ({rangeLabel.toLowerCase()})
                </span>
              </div>
              <div className="flex items-baseline gap-1 mt-0.5">
                <span className="text-2xl md:text-3xl font-black text-amber-soft font-mono tracking-tight">
                  {isLoading ? "…" : vnd(data?.revenueRange ?? 0)}
                </span>
                <span className="text-xs font-bold text-amber-400">VNĐ</span>
              </div>

              <div className="flex flex-wrap items-center gap-2 mt-1">
                {range === "today" && (
                  <span
                    className={`text-[11px] font-bold flex items-center gap-0.5 px-2 py-0.5 rounded-full ${
                      revenueChange === null
                        ? "text-subtle bg-surface/60"
                        : revenueChange >= 0
                          ? "text-emerald-400 bg-emerald-950/50 border border-emerald-800/50"
                          : "text-rose-400 bg-rose-950/50 border border-rose-800/50"
                    }`}
                  >
                    {revenueChange !== null && (revenueChange >= 0 ? <TrendingUp size={11} /> : <TrendingDown size={11} />)}
                    <span>
                      {revenueChange === null
                        ? "Chưa có số hôm qua"
                        : `${revenueChange >= 0 ? "+" : ""}${revenueChange.toFixed(0)}% vs hôm qua`}
                    </span>
                  </span>
                )}
                {aov > 0 && (
                  <span className="text-[11px] text-muted">
                    TB/đơn: <strong className="text-ink font-mono">{compactMoney(aov)}</strong>
                  </span>
                )}
              </div>
            </div>
            <div className="w-13 h-13 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-2xl shadow-inner group-hover:scale-110 transition-transform">
              💵
            </div>
            <div className="absolute -bottom-6 -right-6 w-28 h-28 bg-amber-600/15 rounded-full blur-xl pointer-events-none" />
          </div>

          {/* Card 2: Lợi nhuận thuần */}
          <div className="bg-warm-surface border border-emerald-900/40 rounded-2xl p-4 md:p-5 flex justify-between items-start shadow-lg relative overflow-hidden group hover:border-emerald-500/50 transition-all">
            <div className="flex flex-col gap-1 z-10">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                <span className="text-xs text-emerald-300/90 font-semibold uppercase tracking-wider">
                  Lợi Nhuận Thuần ({rangeLabel.toLowerCase()})
                </span>
              </div>
              <div className="flex items-baseline gap-1 mt-0.5">
                <span className="text-2xl md:text-3xl font-black text-emerald-400 font-mono tracking-tight">
                  {isLoading ? "…" : vnd(data?.profitRange ?? 0)}
                </span>
                <span className="text-xs font-bold text-emerald-300">VNĐ</span>
              </div>

              <div className="flex flex-wrap items-center gap-2 mt-1">
                <span className="text-[11px] font-bold text-emerald-300 bg-emerald-950/70 border border-emerald-700/60 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <Percent size={10} />
                  <span>Biên LN: {(data?.profitMarginRange ?? 0).toFixed(1)}%</span>
                </span>
                {range === "today" && profitChange !== null && (
                  <span
                    className={`text-[11px] font-bold flex items-center gap-0.5 ${
                      profitChange >= 0 ? "text-emerald-400" : "text-rose-400"
                    }`}
                  >
                    {profitChange >= 0 ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
                    <span>{profitChange >= 0 ? "+" : ""}{profitChange.toFixed(0)}% LN</span>
                  </span>
                )}
              </div>
            </div>
            <div className="w-13 h-13 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-2xl shadow-inner group-hover:scale-110 transition-transform">
              📈
            </div>
            <div className="absolute -bottom-6 -right-6 w-28 h-28 bg-emerald-500/15 rounded-full blur-xl pointer-events-none" />
          </div>

          {/* Card 3: Chi phí & Giá vốn */}
          <div className="bg-warm-surface border border-warm-line rounded-2xl p-4 md:p-5 flex justify-between items-start shadow-lg relative overflow-hidden group hover:border-orange-500/50 transition-all">
            <div className="flex flex-col gap-1 z-10">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-rose-400" />
                <span className="text-xs text-warm-muted font-semibold uppercase tracking-wider">
                  Giá Vốn & Chi Phí ({rangeLabel.toLowerCase()})
                </span>
              </div>
              <div className="flex items-baseline gap-1 mt-0.5">
                <span className="text-2xl md:text-3xl font-black text-ink font-mono tracking-tight">
                  {isLoading ? "…" : vnd(data?.costRange ?? 0)}
                </span>
                <span className="text-xs font-bold text-rose-400">VNĐ</span>
              </div>

              <div className="flex flex-wrap items-center gap-2 mt-1">
                <span className="text-[11px] font-semibold text-rose-300 bg-rose-950/60 border border-rose-800/50 px-2 py-0.5 rounded-full">
                  Chiếm {costRatio.toFixed(1)}% doanh thu
                </span>
                <span className="text-[11px] text-muted">NVL & vận hành</span>
              </div>
            </div>
            <div className="w-13 h-13 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-2xl shadow-inner group-hover:scale-110 transition-transform">
              🧾
            </div>
            <div className="absolute -bottom-6 -right-6 w-28 h-28 bg-rose-500/15 rounded-full blur-xl pointer-events-none" />
          </div>

          {/* Card 4: Hoạt động bàn & Đơn hàng */}
          <div className="bg-warm-surface border border-warm-line rounded-2xl p-4 md:p-5 flex justify-between items-start shadow-lg relative overflow-hidden group hover:border-sky-500/50 transition-all">
            <div className="flex flex-col gap-1 z-10">
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-sky-400" />
                <span className="text-xs text-warm-muted font-semibold uppercase tracking-wider">
                  Vận Hành & Bàn Ăn
                </span>
              </div>
              <div className="flex items-baseline gap-2 mt-0.5">
                <span className="text-2xl md:text-3xl font-black text-ink font-mono tracking-tight">
                  {data?.tablesOccupied ?? 0}
                  <span className="text-lg text-subtle">/{data?.tablesTotal ?? 0} bàn</span>
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-2 mt-1">
                <span className="text-[11px] text-sky-300 bg-sky-950/60 border border-sky-800/50 px-2 py-0.5 rounded-full font-bold">
                  {data?.orderCountRange ?? 0} hóa đơn
                </span>
                <span className="text-[11px] font-semibold text-amber-400 flex items-center gap-1">
                  {(data?.waitingKitchenCount ?? 0) > 0 && (
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
                  )}
                  <span>{data?.waitingKitchenCount ?? 0} đơn chờ bếp</span>
                </span>
              </div>
            </div>
            <div className="w-13 h-13 rounded-2xl bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-2xl shadow-inner group-hover:scale-110 transition-transform">
              🪑
            </div>
            <div className="absolute -bottom-6 -right-6 w-28 h-28 bg-sky-500/15 rounded-full blur-xl pointer-events-none" />
          </div>
        </section>

        {/* Quick Financial Health Bar */}
        <section className="bg-surface border border-line rounded-2xl p-3 sm:p-4 shadow-lg flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3 w-full md:w-auto">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
              <Sparkles size={16} />
            </div>
            <div className="min-w-0">
              <span className="text-xs font-bold text-ink flex items-center gap-2">
                HIỆU SUẤT TÀI CHÍNH ({rangeLabel.toUpperCase()})
              </span>
              <p className="text-[11px] text-muted m-0 truncate">
                Tỷ suất lợi nhuận đạt <strong className="text-emerald-400 font-mono">{profitRatio.toFixed(1)}%</strong> • Chi phí chiếm <strong className="text-rose-300 font-mono">{costRatio.toFixed(1)}%</strong> doanh thu
              </p>
            </div>
          </div>

          {/* Visual Ratio Progress Bar */}
          <div className="w-full md:w-80 flex flex-col gap-1.5">
            <div className="flex justify-between text-[10px] font-mono font-bold">
              <span className="text-emerald-400">Lợi nhuận: {profitRatio.toFixed(0)}%</span>
              <span className="text-rose-400">Chi phí: {costRatio.toFixed(0)}%</span>
            </div>
            <div className="w-full h-3 bg-surface-hover rounded-full overflow-hidden flex border border-line-strong p-0.5">
              <div
                className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-l-full transition-all duration-500"
                style={{ width: `${Math.min(Math.max(profitRatio, 0), 100)}%` }}
                title={`Lợi nhuận: ${profitRatio.toFixed(1)}%`}
              />
              <div
                className="h-full bg-gradient-to-r from-rose-500 to-amber-500 rounded-r-full transition-all duration-500"
                style={{ width: `${Math.min(Math.max(costRatio, 0), 100)}%` }}
                title={`Chi phí: ${costRatio.toFixed(1)}%`}
              />
            </div>
          </div>

          {/* Monthly Preview Pills */}
          <div className="flex items-center gap-2 text-xs">
            <div className="bg-raised border border-line-strong px-3 py-1.5 rounded-xl flex items-center gap-1.5">
              <span className="text-muted text-[11px]">Tháng này:</span>
              <span className="font-mono font-bold text-amber-300">{compactMoney(data?.revenueMonth ?? 0)}</span>
              <span className="text-muted text-[10px]">DT</span>
              <span className="text-subtle">•</span>
              <span className="font-mono font-bold text-emerald-400">{compactMoney(data?.profitMonth ?? 0)}</span>
              <span className="text-muted text-[10px]">LN</span>
            </div>
          </div>
        </section>

        {/* ROW 2: revenue & profit interactive chart + recent orders */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          <div className="lg:col-span-7 bg-surface border border-line rounded-2xl p-5 shadow-lg flex flex-col justify-between">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
              <div>
                <h2 className="text-sm md:text-base font-extrabold uppercase tracking-wide text-ink flex items-center gap-2">
                  <span>DOANH THU & LỢI NHUẬN THEO GIỜ HÔM NAY</span>
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                </h2>
                <span className="text-xs text-muted">Đơn vị: VNĐ • So sánh thực tế doanh thu và lợi nhuận gộp</span>
              </div>

              {/* Metric View Switcher */}
              <div className="flex items-center gap-1 bg-raised border border-line-strong p-1 rounded-xl text-[11px] font-bold">
                <button
                  type="button"
                  onClick={() => setChartMetric("both")}
                  className={`px-2.5 py-1 rounded-lg transition-colors ${
                    chartMetric === "both"
                      ? "bg-amber-500 text-black shadow-sm font-black"
                      : "text-muted hover:text-ink"
                  }`}
                >
                  Tất cả
                </button>
                <button
                  type="button"
                  onClick={() => setChartMetric("revenue")}
                  className={`px-2.5 py-1 rounded-lg transition-colors ${
                    chartMetric === "revenue"
                      ? "bg-amber-500 text-black shadow-sm font-black"
                      : "text-muted hover:text-ink"
                  }`}
                >
                  💵 Doanh thu
                </button>
                <button
                  type="button"
                  onClick={() => setChartMetric("profit")}
                  className={`px-2.5 py-1 rounded-lg transition-colors ${
                    chartMetric === "profit"
                      ? "bg-emerald-500 text-black shadow-sm font-black"
                      : "text-muted hover:text-ink"
                  }`}
                >
                  📈 Lợi nhuận
                </button>
              </div>
            </div>

            {/* Chart Legend & Peak Badges */}
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs mb-1 px-1">
              <div className="flex items-center gap-4 text-xs font-semibold">
                {(chartMetric === "both" || chartMetric === "revenue") && (
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded bg-amber-400 shadow-sm" />
                    <span className="text-ink-secondary">Doanh thu</span>
                    {chart.peakRev && chart.peakRev.revenue > 0 && (
                      <span className="text-[10px] font-mono text-amber-300 font-bold bg-amber-950/60 border border-amber-800/50 px-1.5 py-0.2 rounded">
                        Đỉnh {String(chart.peakRev.hour).padStart(2, "0")}h: {compactMoney(chart.peakRev.revenue)}
                      </span>
                    )}
                  </div>
                )}
                {(chartMetric === "both" || chartMetric === "profit") && (
                  <div className="flex items-center gap-1.5">
                    <span className="w-3 h-3 rounded bg-emerald-400 shadow-sm" />
                    <span className="text-ink-secondary">Lợi nhuận</span>
                    {chart.peakProfit && chart.peakProfit.profit > 0 && (
                      <span className="text-[10px] font-mono text-emerald-300 font-bold bg-emerald-950/60 border border-emerald-800/50 px-1.5 py-0.2 rounded">
                        Đỉnh {String(chart.peakProfit.hour).padStart(2, "0")}h: {compactMoney(chart.peakProfit.profit)}
                      </span>
                    )}
                  </div>
                )}
              </div>

              {hoveredPoint && (
                <div className="text-[11px] font-mono bg-raised border border-line-strong px-2.5 py-1 rounded-lg text-ink flex items-center gap-2">
                  <span className="font-bold text-amber-400">{String(hoveredPoint.hour).padStart(2, "0")}:00</span>
                  <span>DT: <strong className="text-amber-300">{compactMoney(hoveredPoint.revenue)}</strong></span>
                  <span>LN: <strong className="text-emerald-400">{compactMoney(hoveredPoint.profit)}</strong></span>
                </div>
              )}
            </div>

            <div className="relative w-full h-[250px] my-2">
              <svg
                viewBox="0 0 700 240"
                className="w-full h-full overflow-hidden cursor-crosshair"
                onMouseLeave={() => setHoveredPoint(null)}
              >
                <defs>
                  {/* Revenue Gradient */}
                  <linearGradient id="revAreaGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.4" />
                    <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.0" />
                  </linearGradient>
                  {/* Profit Gradient */}
                  <linearGradient id="profitAreaGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10b981" stopOpacity="0.45" />
                    <stop offset="100%" stopColor="#10b981" stopOpacity="0.0" />
                  </linearGradient>
                </defs>

                {/* Y-axis grid lines */}
                {[0, 0.25, 0.5, 0.75, 1].map((f) => {
                  const y = 210 - f * 180;
                  return (
                    <g key={f}>
                      <line x1="35" y1={y} x2="675" y2={y} stroke="#2d3138" strokeDasharray={f === 0 ? undefined : "4 4"} />
                      <text x="2" y={y + 4} fill="#6b7280" fontSize="10" fontFamily="monospace">
                        {compactMoney(chart.maxVal * f)}
                      </text>
                    </g>
                  );
                })}

                {/* Render Areas & Lines based on metric toggle */}
                {chart.coords.length > 1 && (
                  <>
                    {(chartMetric === "both" || chartMetric === "revenue") && (
                      <>
                        <path d={chart.areaRev} fill="url(#revAreaGradient)" />
                        <path
                          d={chart.lineRev}
                          fill="none"
                          stroke="#f59e0b"
                          strokeWidth="3"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </>
                    )}

                    {(chartMetric === "both" || chartMetric === "profit") && (
                      <>
                        <path d={chart.areaProfit} fill="url(#profitAreaGradient)" />
                        <path
                          d={chart.lineProfit}
                          fill="none"
                          stroke="#10b981"
                          strokeWidth="3"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </>
                    )}
                  </>
                )}

                {/* Peak indicators */}
                {chart.peakRev && chart.peakRev.revenue > 0 && (chartMetric === "both" || chartMetric === "revenue") && (
                  <>
                    <circle cx={chart.peakRev.x} cy={chart.peakRev.yRev} r="5" fill="#f59e0b" />
                    <circle cx={chart.peakRev.x} cy={chart.peakRev.yRev} r="10" fill="#f59e0b" opacity="0.3" className="animate-ping" />
                  </>
                )}
                {chart.peakProfit && chart.peakProfit.profit > 0 && (chartMetric === "both" || chartMetric === "profit") && (
                  <>
                    <circle cx={chart.peakProfit.x} cy={chart.peakProfit.yProfit} r="5" fill="#10b981" />
                    <circle cx={chart.peakProfit.x} cy={chart.peakProfit.yProfit} r="10" fill="#10b981" opacity="0.3" className="animate-ping" />
                  </>
                )}

                {/* Interactive hover trigger zones */}
                {chart.coords.map((c) => (
                  <rect
                    key={c.hour}
                    x={c.x - 12}
                    y={25}
                    width={24}
                    height={190}
                    fill="transparent"
                    onMouseEnter={() =>
                      setHoveredPoint({
                        hour: c.hour,
                        revenue: c.revenue,
                        cost: c.cost,
                        profit: c.profit,
                        x: c.x,
                        y: Math.min(c.yRev, c.yProfit),
                      })
                    }
                  />
                ))}

                {/* Vertical hover guide line */}
                {hoveredPoint && (
                  <line
                    x1={hoveredPoint.x}
                    y1={30}
                    x2={hoveredPoint.x}
                    y2={210}
                    stroke="#fbbf24"
                    strokeWidth="1.5"
                    strokeDasharray="3 3"
                  />
                )}
              </svg>
            </div>

            <div className="flex justify-between text-[11px] text-subtle font-mono px-4 mt-1 border-t border-line pt-2">
              {chart.coords
                .filter((_, i, arr) => arr.length <= 9 || i % Math.ceil(arr.length / 9) === 0)
                .map((c) => (
                  <span key={c.hour}>{String(c.hour).padStart(2, "0")}:00</span>
                ))}
            </div>

            <div className="mt-4 pt-3 border-t border-line flex flex-wrap items-center justify-center gap-3">
              <div className="inline-flex items-center gap-2 bg-raised border border-line-strong px-4 py-1.5 rounded-full text-xs font-semibold text-ink-secondary">
                <span>Doanh thu tháng này:</span>
                <strong className="text-amber-400 font-mono text-sm">{vnd(data?.revenueMonth ?? 0)} VNĐ</strong>
                {monthChange !== null && (
                  <span className={`font-bold ${monthChange >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                    ({monthChange >= 0 ? "+" : ""}
                    {monthChange.toFixed(1)}%)
                  </span>
                )}
              </div>

              <div className="inline-flex items-center gap-2 bg-raised border border-line-strong px-4 py-1.5 rounded-full text-xs font-semibold text-ink-secondary">
                <span>Lợi nhuận tháng này:</span>
                <strong className="text-emerald-400 font-mono text-sm">{vnd(data?.profitMonth ?? 0)} VNĐ</strong>
                {profitMonthChange !== null && (
                  <span className={`font-bold ${profitMonthChange >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                    ({profitMonthChange >= 0 ? "+" : ""}
                    {profitMonthChange.toFixed(1)}%)
                  </span>
                )}
              </div>

              <div className="inline-flex items-center gap-1.5 bg-raised border border-line-strong px-3 py-1.5 rounded-full text-xs font-semibold text-muted">
                <span>Biên LN:</span>
                <strong className="text-emerald-400 font-mono">{(data?.profitMarginMonth ?? 0).toFixed(1)}%</strong>
              </div>
            </div>
          </div>

          <div className="lg:col-span-5 bg-surface border border-line rounded-2xl p-5 shadow-lg flex flex-col justify-between">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm md:text-base font-extrabold uppercase tracking-wide text-ink">
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
                    className="bg-raised border border-line-strong rounded-xl p-3 flex flex-col gap-1.5 hover:border-amber-500/50 transition-colors"
                  >
                    <div className="flex justify-between items-center text-xs">
                      <div className="flex items-center gap-2">
                        <strong className="text-ink font-mono">ĐƠN #{o.orderNumber}</strong>
                        <span className="text-muted">
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
                    <p className="text-xs text-muted line-clamp-1 m-0">{o.summary || "—"}</p>
                  </div>
                );
              })}
            </div>

            <div className="mt-3 pt-3 border-t border-line flex justify-between items-center text-xs text-muted">
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
          <div className="bg-surface border border-line rounded-2xl p-4 shadow-lg flex flex-col justify-between">
            <h3 className="text-xs font-extrabold uppercase tracking-wide text-ink mb-3">Top Món Bán Chạy</h3>
            {(data?.topProducts ?? []).length === 0 ? (
              <EmptyState text="Chưa có dữ liệu bán hàng." />
            ) : (
              <div className="h-40 flex items-end justify-between gap-2 px-2 pb-2 border-b border-line">
                {data!.topProducts.map((p) => (
                  <div key={p.name} className="flex-1 flex flex-col items-center gap-1 group justify-end h-full">
                    <span className="text-[10px] font-mono text-amber-300 font-bold">{p.quantity}</span>
                    <div
                      className="w-full bg-gradient-to-t from-[#c25e2e] to-[#f97316] rounded-t-md group-hover:brightness-110 transition-all"
                      style={{ height: `${Math.max((p.quantity / maxQty) * 100, 8)}px` }}
                    />
                    <span className="text-[9px] text-muted text-center leading-tight line-clamp-2 mt-1">{p.name}</span>
                  </div>
                ))}
              </div>
            )}
            <span className="text-[10px] text-subtle text-center mt-2">Tính theo số lượng bán ra • {rangeLabel}</span>
          </div>

          {/* Top theo doanh thu (donut) */}
          <div className="bg-surface border border-line rounded-2xl p-4 shadow-lg flex flex-col justify-between">
            <h3 className="text-xs font-extrabold uppercase tracking-wide text-ink mb-2">Cơ Cấu Doanh Thu Theo Món</h3>
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
                    <span className="text-sm font-black text-ink font-mono leading-none">{compactMoney(donutTotal)}</span>
                    <span className="text-[9px] text-muted mt-0.5">VNĐ</span>
                  </div>
                </div>
                <div className="flex flex-col gap-2 text-xs min-w-0">
                  {data!.topByRevenue.map((p, i) => (
                    <div key={p.name} className="flex items-center gap-2 min-w-0">
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ backgroundColor: DONUT_COLORS[i % DONUT_COLORS.length] }}
                      />
                      <span className="text-ink-secondary font-semibold truncate">
                        {p.name} ({Math.round((p.revenue / donutTotal) * 100)}%)
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
            <span className="text-[10px] text-subtle text-center mt-2">Top 4 món theo doanh thu • {rangeLabel}</span>
          </div>

          {/* Cảnh báo tồn kho */}
          <div className="bg-surface border border-line rounded-2xl p-4 shadow-lg flex flex-col justify-between">
            <h3 className="text-xs font-extrabold uppercase tracking-wide text-ink mb-3 flex items-center justify-between">
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
                      out ? "bg-danger-soft border-rose-800/60" : "bg-warm-surface border-amber-800/60"
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
          <div className="bg-surface border border-line rounded-2xl p-4 shadow-lg flex flex-col justify-between">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-extrabold uppercase tracking-wide text-ink">ĐƠN HÀNG TRONG BẾP</h3>
              <Link href="/kitchen" className="text-xs text-amber-400 font-bold hover:underline">
                Vào KDS →
              </Link>
            </div>
            <div className="mb-2">
              <span className="text-sm font-black text-amber-300">
                Tổng: <span className="font-mono text-base text-ink">{data?.kitchenOrderCount ?? 0} đơn</span> trong bếp
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
                    className="bg-raised border border-line-strong rounded-lg px-3 py-2 flex items-center justify-between text-xs"
                  >
                    <span className="text-ink font-medium">
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
            <span className="text-[10px] text-subtle text-center mt-2">Đồng bộ trực tiếp từ màn hình bếp</span>
          </div>
        </section>
      </div>
    </AppShell>
  );
}
