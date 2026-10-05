"use client";

import { AppShell } from "@/components/layout/app-shell";
import {
  Bell,
  ChevronDown,
  TrendingUp,
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

export default function DashboardPage() {
  const [timeRange, setTimeRange] = useState("Hôm nay");
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [currentTime, setCurrentTime] = useState("18:45, Thứ Sáu");

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const days = ["Chủ Nhật", "Thứ Hai", "Thứ Ba", "Thứ Tư", "Thứ Năm", "Thứ Sáu", "Thứ Bảy"];
      const hours = String(now.getHours()).padStart(2, "0");
      const minutes = String(now.getMinutes()).padStart(2, "0");
      const dayName = days[now.getDay()];
      setCurrentTime(`${hours}:${minutes}, ${dayName}`);
    };
    updateTime();
    const interval = setInterval(updateTime, 30000);
    return () => clearInterval(interval);
  }, []);

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
                <span>Trực tiếp thời gian thực • {currentTime}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Data Filter Dropdown */}
            <div className="relative">
              <div className="flex items-center gap-2 text-xs text-gray-400">
                <span className="hidden sm:inline">Thời gian:</span>
                <button
                  type="button"
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  className="flex items-center gap-2 bg-[#22252a] hover:bg-[#2c3037] border border-[#383d47] px-3.5 py-2 rounded-xl text-xs font-bold text-gray-200 transition-colors shadow-sm"
                >
                  <span>{timeRange}</span>
                  <ChevronDown size={14} className="text-gray-400" />
                </button>
              </div>

              {dropdownOpen && (
                <div className="absolute right-0 mt-2 w-36 bg-[#22252a] border border-[#383d47] rounded-xl shadow-xl py-1.5 z-50 text-xs">
                  {["Hôm nay", "Hôm qua", "Tuần này", "Tháng này"].map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => {
                        setTimeRange(t);
                        setDropdownOpen(false);
                      }}
                      className={`w-full text-left px-3.5 py-2 hover:bg-[#2d323b] transition-colors ${
                        timeRange === t ? "text-amber-400 font-bold bg-[#2d323b]/50" : "text-gray-300"
                      }`}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Notification Alert Pill */}
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[#22252a] border border-[#383d47] text-gray-300 text-xs">
              <Bell size={15} className="text-amber-400" />
              <span className="hidden md:inline text-gray-300">Cảnh báo</span>
              <span className="w-5 h-5 rounded-full bg-rose-600 text-white font-black text-[10px] flex items-center justify-center">
                3
              </span>
            </div>
          </div>
        </div>
        {/* ========================================================
            ROW 1: 4 TOP METRIC CARDS (Warm Bronze / Terracotta)
           ======================================================== */}
        <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Doanh thu hôm nay */}
          <div className="bg-[#241e1b] border border-[#443329] rounded-2xl p-4 md:p-5 flex justify-between items-start shadow-lg relative overflow-hidden group hover:border-[#6a4f3e] transition-all">
            <div className="flex flex-col gap-1 z-10">
              <span className="text-xs text-[#a99182] font-semibold">Doanh thu hôm nay</span>
              <div className="flex items-baseline gap-1 mt-0.5">
                <span className="text-2xl md:text-3xl font-black text-[#fef3c7] font-mono tracking-tight">
                  45.750.000
                </span>
                <span className="text-xs font-bold text-amber-400">VNĐ</span>
              </div>
              <span className="text-xs font-bold text-emerald-400 mt-1 flex items-center gap-1">
                <TrendingUp size={12} />
                <span>+12% so với hôm qua</span>
              </span>
            </div>
            {/* Visual Icon: Stack of Cash & Coins */}
            <div className="w-14 h-14 rounded-2xl bg-[#382b24] border border-[#533f34] flex items-center justify-center text-3xl shadow-inner group-hover:scale-105 transition-transform">
              💵
            </div>
            <div className="absolute -bottom-6 -right-6 w-28 h-28 bg-amber-600/10 rounded-full blur-xl pointer-events-none" />
          </div>

          {/* Card 2: Số bàn đang phục vụ */}
          <div className="bg-[#241e1b] border border-[#443329] rounded-2xl p-4 md:p-5 flex justify-between items-start shadow-lg relative overflow-hidden group hover:border-[#6a4f3e] transition-all">
            <div className="flex flex-col gap-1 z-10">
              <span className="text-xs text-[#a99182] font-semibold">Số bàn đang phục vụ</span>
              <div className="flex items-baseline gap-1 mt-0.5">
                <span className="text-2xl md:text-3xl font-black text-white font-mono tracking-tight">
                  28<span className="text-lg text-gray-500">/45</span>
                </span>
              </div>
              <span className="text-xs font-semibold text-gray-400 mt-1">
                Còn trống: <strong className="text-emerald-400">17 bàn</strong>
              </span>
            </div>
            {/* 3x3 Table Grid Icon */}
            <div className="w-14 h-14 rounded-2xl bg-[#382b24] border border-[#533f34] p-2 flex flex-col justify-between shadow-inner group-hover:scale-105 transition-transform">
              <div className="grid grid-cols-3 gap-1">
                <span className="w-2.5 h-2.5 rounded-sm bg-amber-500" />
                <span className="w-2.5 h-2.5 rounded-sm bg-amber-500" />
                <span className="w-2.5 h-2.5 rounded-sm bg-[#524137]" />
                <span className="w-2.5 h-2.5 rounded-sm bg-amber-500" />
                <span className="w-2.5 h-2.5 rounded-sm bg-amber-500" />
                <span className="w-2.5 h-2.5 rounded-sm bg-[#524137]" />
                <span className="w-2.5 h-2.5 rounded-sm bg-amber-500" />
                <span className="w-2.5 h-2.5 rounded-sm bg-[#524137]" />
                <span className="w-2.5 h-2.5 rounded-sm bg-[#524137]" />
              </div>
            </div>
            <div className="absolute -bottom-6 -right-6 w-28 h-28 bg-orange-600/10 rounded-full blur-xl pointer-events-none" />
          </div>

          {/* Card 3: Số đơn hàng mới */}
          <div className="bg-[#241e1b] border border-[#443329] rounded-2xl p-4 md:p-5 flex justify-between items-start shadow-lg relative overflow-hidden group hover:border-[#6a4f3e] transition-all">
            <div className="flex flex-col gap-1 z-10">
              <span className="text-xs text-[#a99182] font-semibold">Số đơn hàng mới</span>
              <div className="flex items-baseline gap-1 mt-0.5">
                <span className="text-2xl md:text-3xl font-black text-white font-mono tracking-tight">
                  112
                </span>
                <span className="text-xs text-gray-400">hóa đơn</span>
              </div>
              <span className="text-xs font-semibold text-amber-400 mt-1 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping" />
                <span>5 đơn đang chờ bếp</span>
              </span>
            </div>
            {/* Chef with Wok Graphic */}
            <div className="w-14 h-14 rounded-2xl bg-[#382b24] border border-[#533f34] flex items-center justify-center text-3xl shadow-inner group-hover:scale-105 transition-transform">
              👨‍🍳
            </div>
            <div className="absolute -bottom-6 -right-6 w-28 h-28 bg-amber-600/10 rounded-full blur-xl pointer-events-none" />
          </div>

          {/* Card 4: Bia bán chạy nhất */}
          <div className="bg-[#241e1b] border border-[#443329] rounded-2xl p-4 md:p-5 flex justify-between items-start shadow-lg relative overflow-hidden group hover:border-[#6a4f3e] transition-all">
            <div className="flex flex-col gap-1 z-10">
              <span className="text-xs text-[#a99182] font-semibold">Bia bán chạy nhất</span>
              <div className="flex items-baseline gap-1 mt-0.5">
                <span className="text-2xl md:text-3xl font-black text-amber-300 font-heading tracking-tight">
                  Bia 333
                </span>
              </div>
              <span className="text-xs text-gray-400 mt-1">
                Đã phục vụ: <strong className="text-white font-mono">14 thùng</strong> (336 lon)
              </span>
            </div>
            {/* Frothy Beer Mug Graphic */}
            <div className="w-14 h-14 rounded-2xl bg-[#382b24] border border-[#533f34] flex items-center justify-center text-3xl shadow-inner group-hover:scale-105 transition-transform">
              🍺
            </div>
            <div className="absolute -bottom-6 -right-6 w-28 h-28 bg-yellow-600/10 rounded-full blur-xl pointer-events-none" />
          </div>
        </section>

        {/* ========================================================
            ROW 2: REAL-TIME REVENUE CHART + RECENT ORDERS LIST
           ======================================================== */}
        <section className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* Left Column (7 cols): TĂNG TRƯỞNG DOANH THU (REAL-TIME) */}
          <div className="lg:col-span-7 bg-[#1c1e22] border border-[#2d3138] rounded-2xl p-5 shadow-lg flex flex-col justify-between">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-sm md:text-base font-extrabold uppercase tracking-wide text-white flex items-center gap-2">
                  <span>TĂNG TRƯỞNG DOANH THU (REAL-TIME)</span>
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                </h2>
                <span className="text-xs text-gray-400">Đơn vị: Triệu VNĐ</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono text-emerald-400 bg-emerald-950/60 border border-emerald-800/60 px-2.5 py-1 rounded-md font-bold">
                  Peak (19:30): 11.2M
                </span>
              </div>
            </div>

            {/* Interactive SVG Smooth Area/Line Chart */}
            <div className="relative w-full h-[250px] my-2">
              <svg viewBox="0 0 700 240" className="w-full h-full overflow-hidden">
                <defs>
                  {/* Glowing Gradient Fill */}
                  <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#10b981" stopOpacity="0.45" />
                    <stop offset="50%" stopColor="#f59e0b" stopOpacity="0.25" />
                    <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.0" />
                  </linearGradient>
                  {/* Glowing Stroke Gradient */}
                  <linearGradient id="strokeGradient" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#f59e0b" />
                    <stop offset="55%" stopColor="#10b981" />
                    <stop offset="80%" stopColor="#f59e0b" />
                    <stop offset="100%" stopColor="#ef4444" />
                  </linearGradient>
                </defs>

                {/* Dotted Grid Lines */}
                <line x1="30" y1="30" x2="680" y2="30" stroke="#2d3138" strokeDasharray="4 4" />
                <text x="5" y="34" fill="#6b7280" fontSize="10" fontFamily="monospace">
                  10M
                </text>

                <line x1="30" y1="75" x2="680" y2="75" stroke="#2d3138" strokeDasharray="4 4" />
                <text x="5" y="79" fill="#6b7280" fontSize="10" fontFamily="monospace">
                  8M
                </text>

                <line x1="30" y1="120" x2="680" y2="120" stroke="#2d3138" strokeDasharray="4 4" />
                <text x="5" y="124" fill="#6b7280" fontSize="10" fontFamily="monospace">
                  6M
                </text>

                <line x1="30" y1="165" x2="680" y2="165" stroke="#2d3138" strokeDasharray="4 4" />
                <text x="5" y="169" fill="#6b7280" fontSize="10" fontFamily="monospace">
                  4M
                </text>

                <line x1="30" y1="210" x2="680" y2="210" stroke="#2d3138" />
                <text x="5" y="214" fill="#6b7280" fontSize="10" fontFamily="monospace">
                  0
                </text>

                {/* Area Fill */}
                <path
                  d="M 30,210 
                     C 70,185 110,170 150,172 
                     C 190,174 230,165 270,150 
                     C 310,135 340,110 380,85 
                     C 420,60 450,20 480,22 
                     C 510,24 530,115 560,110 
                     C 590,105 630,130 680,145 
                     L 680,210 Z"
                  fill="url(#chartGradient)"
                />

                {/* Line Curve */}
                <path
                  d="M 30,210 
                     C 70,185 110,170 150,172 
                     C 190,174 230,165 270,150 
                     C 310,135 340,110 380,85 
                     C 420,60 450,20 480,22 
                     C 510,24 530,115 560,110 
                     C 590,105 630,130 680,145"
                  fill="none"
                  stroke="url(#strokeGradient)"
                  strokeWidth="3.5"
                  strokeLinecap="round"
                />

                {/* Peak Dot & Pulse */}
                <circle cx="480" cy="22" r="6" fill="#10b981" />
                <circle cx="480" cy="22" r="12" fill="#10b981" opacity="0.3" className="animate-ping" />
              </svg>
            </div>

            {/* X-Axis Time Labels */}
            <div className="flex justify-between text-[11px] text-gray-500 font-mono px-4 mt-1 border-t border-[#2d3138] pt-2">
              <span>09:00</span>
              <span>11:00</span>
              <span>13:00</span>
              <span>15:00</span>
              <span>16:00</span>
              <span>17:00</span>
              <span className="text-emerald-400 font-bold">19:00</span>
              <span>21:00</span>
              <span>23:00</span>
            </div>

            {/* Month Summary Footer Pill */}
            <div className="mt-4 pt-3 border-t border-[#2d3138] flex justify-center">
              <div className="inline-flex items-center gap-2 bg-[#252830] border border-[#383d47] px-4 py-1.5 rounded-full text-xs font-semibold text-gray-300">
                <span>Tổng tháng này:</span>
                <strong className="text-amber-400 font-mono text-sm">1.25 Tỷ VNĐ</strong>
                <span className="text-emerald-400 font-bold">(+8.5%)</span>
              </div>
            </div>
          </div>

          {/* Right Column (5 cols): DANH SÁCH ĐƠN HÀNG GẦN ĐÂY */}
          <div className="lg:col-span-5 bg-[#1c1e22] border border-[#2d3138] rounded-2xl p-5 shadow-lg flex flex-col justify-between">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm md:text-base font-extrabold uppercase tracking-wide text-white">
                DANH SÁCH ĐƠN HÀNG GẦN ĐÂY
              </h2>
              {/* Colored status dots */}
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500" />
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                <span className="w-2.5 h-2.5 rounded-full bg-yellow-500" />
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
              </div>
            </div>

            {/* Orders Stack */}
            <div className="flex flex-col gap-2.5 overflow-y-auto max-h-[340px] pr-1">
              {/* Order 1 */}
              <div className="bg-[#24272e] border border-[#323640] rounded-xl p-3 flex flex-col gap-1.5 hover:border-amber-500/50 transition-colors">
                <div className="flex justify-between items-center text-xs">
                  <div className="flex items-center gap-2">
                    <strong className="text-white font-mono">ĐƠN #112</strong>
                    <span className="text-gray-400">18:42</span>
                    <span className="font-bold text-amber-400 bg-amber-950/60 px-1.5 py-0.5 rounded border border-amber-800/50">
                      Bàn A5
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-amber-300">2.1M VNĐ</span>
                    <span className="text-[10px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-700/60 px-2 py-0.5 rounded-full">
                      Đang phục vụ
                    </span>
                  </div>
                </div>
                <p className="text-xs text-gray-400 line-clamp-1 m-0">
                  1 Lẩu đuôi bò, 2 Gà nướng muối ớt, 5 Bia 333
                </p>
              </div>

              {/* Order 2 */}
              <div className="bg-[#24272e] border border-[#323640] rounded-xl p-3 flex flex-col gap-1.5 hover:border-amber-500/50 transition-colors">
                <div className="flex justify-between items-center text-xs">
                  <div className="flex items-center gap-2">
                    <strong className="text-white font-mono">ĐƠN #111</strong>
                    <span className="text-gray-400">18:38</span>
                    <span className="font-bold text-amber-400 bg-amber-950/60 px-1.5 py-0.5 rounded border border-amber-800/50">
                      Bàn A4
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-amber-300">1.8M VNĐ</span>
                    <span className="text-[10px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-700/60 px-2 py-0.5 rounded-full">
                      Đang phục vụ
                    </span>
                  </div>
                </div>
                <p className="text-xs text-gray-400 line-clamp-1 m-0">
                  1 Lẩu riêu cua bắp bò, 1 Bò nướng tảng sốt tiêu, 10 Bia Tiger
                </p>
              </div>

              {/* Order 3 */}
              <div className="bg-[#24272e] border border-[#323640] rounded-xl p-3 flex flex-col gap-1.5 hover:border-amber-500/50 transition-colors">
                <div className="flex justify-between items-center text-xs">
                  <div className="flex items-center gap-2">
                    <strong className="text-white font-mono">ĐƠN #110</strong>
                    <span className="text-gray-400">18:25</span>
                    <span className="font-bold text-amber-400 bg-amber-950/60 px-1.5 py-0.5 rounded border border-amber-800/50">
                      Bàn B2
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-amber-300">3.4M VNĐ</span>
                    <span className="text-[10px] font-bold bg-emerald-950 text-emerald-300 border border-emerald-700/60 px-2 py-0.5 rounded-full">
                      Đang phục vụ
                    </span>
                  </div>
                </div>
                <p className="text-xs text-gray-400 line-clamp-1 m-0">
                  2 Lẩu hải sản chua cay, 3 Mực một nắng nướng sa tế, 1 Thùng Bia Saigon
                </p>
              </div>

              {/* Order 4 */}
              <div className="bg-[#24272e] border border-[#323640] rounded-xl p-3 flex flex-col gap-1.5 hover:border-amber-500/50 transition-colors">
                <div className="flex justify-between items-center text-xs">
                  <div className="flex items-center gap-2">
                    <strong className="text-white font-mono">ĐƠN #109</strong>
                    <span className="text-gray-400">18:10</span>
                    <span className="font-bold text-amber-400 bg-amber-950/60 px-1.5 py-0.5 rounded border border-amber-800/50">
                      Bàn VIP 1
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-amber-300">5.6M VNĐ</span>
                    <span className="text-[10px] font-bold bg-blue-950 text-blue-300 border border-blue-700/60 px-2 py-0.5 rounded-full">
                      Đã thanh toán
                    </span>
                  </div>
                </div>
                <p className="text-xs text-gray-400 line-clamp-1 m-0">
                  Combo Đệ Nhất Bếp Nhậu 10 người, 1 Thùng Heineken bạc
                </p>
              </div>
            </div>

            <div className="mt-3 pt-3 border-t border-[#2d3138] flex justify-between items-center text-xs text-gray-400">
              <span>Cập nhật SignalR thời gian thực</span>
              <Link href="/pos" className="text-amber-400 hover:underline font-bold">
                Xem tất cả đơn hàng →
              </Link>
            </div>
          </div>
        </section>

        {/* ========================================================
            ROW 3: 4 PANELS (Top Món, Top Đồ Uống, Cảnh Báo, Bếp)
           ======================================================== */}
        <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Panel 1: Top Món Ăn Bán Chạy (Bar Chart) */}
          <div className="bg-[#1c1e22] border border-[#2d3138] rounded-2xl p-4 shadow-lg flex flex-col justify-between">
            <h3 className="text-xs font-extrabold uppercase tracking-wide text-gray-200 mb-3">
              Top Món Ăn Bán Chạy
            </h3>
            {/* Custom CSS/SVG Bar Chart */}
            <div className="h-40 flex items-end justify-between gap-2 px-2 pb-2 border-b border-[#2d3138]">
              {/* Bar 1 */}
              <div className="flex-1 flex flex-col items-center gap-1 group">
                <span className="text-[10px] font-mono text-amber-300 font-bold">22</span>
                <div className="w-full bg-gradient-to-t from-[#c25e2e] to-[#f97316] rounded-t-md h-28 group-hover:brightness-110 transition-all" />
                <span className="text-[9px] text-gray-400 text-center leading-tight line-clamp-2 mt-1">
                  Lẩu đuôi bò
                </span>
              </div>
              {/* Bar 2 */}
              <div className="flex-1 flex flex-col items-center gap-1 group">
                <span className="text-[10px] font-mono text-amber-300 font-bold">16</span>
                <div className="w-full bg-gradient-to-t from-[#c25e2e] to-[#f97316] rounded-t-md h-20 group-hover:brightness-110 transition-all" />
                <span className="text-[9px] text-gray-400 text-center leading-tight line-clamp-2 mt-1">
                  Gà nướng
                </span>
              </div>
              {/* Bar 3 */}
              <div className="flex-1 flex flex-col items-center gap-1 group">
                <span className="text-[10px] font-mono text-amber-300 font-bold">12</span>
                <div className="w-full bg-gradient-to-t from-[#c25e2e] to-[#f97316] rounded-t-md h-14 group-hover:brightness-110 transition-all" />
                <span className="text-[9px] text-gray-400 text-center leading-tight line-clamp-2 mt-1">
                  Bò nướng
                </span>
              </div>
              {/* Bar 4 */}
              <div className="flex-1 flex flex-col items-center gap-1 group">
                <span className="text-[10px] font-mono text-amber-300 font-bold">9</span>
                <div className="w-full bg-gradient-to-t from-[#c25e2e] to-[#f97316] rounded-t-md h-10 group-hover:brightness-110 transition-all" />
                <span className="text-[9px] text-gray-400 text-center leading-tight line-clamp-2 mt-1">
                  Mực nướng
                </span>
              </div>
              {/* Bar 5 */}
              <div className="flex-1 flex flex-col items-center gap-1 group">
                <span className="text-[10px] font-mono text-amber-300 font-bold">7</span>
                <div className="w-full bg-gradient-to-t from-[#c25e2e] to-[#f97316] rounded-t-md h-8 group-hover:brightness-110 transition-all" />
                <span className="text-[9px] text-gray-400 text-center leading-tight line-clamp-2 mt-1">
                  Tôm càng
                </span>
              </div>
            </div>
            <span className="text-[10px] text-gray-500 text-center mt-2">Dữ liệu tính theo số lượng đĩa bán ra</span>
          </div>

          {/* Panel 2: Top Đồ Uống Bán Chạy (Donut Chart) */}
          <div className="bg-[#1c1e22] border border-[#2d3138] rounded-2xl p-4 shadow-lg flex flex-col justify-between">
            <h3 className="text-xs font-extrabold uppercase tracking-wide text-gray-200 mb-2">
              Top Đồ Uống Bán Chạy
            </h3>
            <div className="flex items-center justify-center gap-4 my-2">
              {/* Donut SVG */}
              <div className="relative w-28 h-28 flex items-center justify-center">
                <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                  {/* Background Circle */}
                  <path
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none"
                    stroke="#2d3138"
                    strokeWidth="4.5"
                  />
                  {/* Slice 1: Bia 333 (60%) */}
                  <path
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none"
                    stroke="#f97316"
                    strokeWidth="4.8"
                    strokeDasharray="60, 100"
                    strokeLinecap="round"
                  />
                  {/* Slice 2: Bia Tiger (25%) */}
                  <path
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none"
                    stroke="#facc15"
                    strokeWidth="4.8"
                    strokeDasharray="25, 100"
                    strokeDashoffset="-60"
                    strokeLinecap="round"
                  />
                  {/* Slice 3: Bia Saigon (15%) */}
                  <path
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                    fill="none"
                    stroke="#0284c7"
                    strokeWidth="4.8"
                    strokeDasharray="15, 100"
                    strokeDashoffset="-85"
                    strokeLinecap="round"
                  />
                </svg>
                {/* Center Value */}
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                  <span className="text-xl font-black text-white font-mono leading-none">850</span>
                  <span className="text-[9px] text-gray-400 mt-0.5">Lon / Chai</span>
                </div>
              </div>

              {/* Legend */}
              <div className="flex flex-col gap-2 text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#f97316]" />
                  <span className="text-gray-300 font-semibold">Bia 333 (60%)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#facc15]" />
                  <span className="text-gray-300 font-semibold">Tiger (25%)</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-[#0284c7]" />
                  <span className="text-gray-300 font-semibold">Saigon (15%)</span>
                </div>
              </div>
            </div>
            <span className="text-[10px] text-gray-500 text-center mt-2">Tổng tiêu thụ bia &amp; nước ngọt</span>
          </div>

          {/* Panel 3: CẢNH BÁO HẾT HÀNG GẦN ĐÂY */}
          <div className="bg-[#1c1e22] border border-[#2d3138] rounded-2xl p-4 shadow-lg flex flex-col justify-between">
            <h3 className="text-xs font-extrabold uppercase tracking-wide text-gray-200 mb-3 flex items-center justify-between">
              <span>CẢNH BÁO HẾT HÀNG GẦN ĐÂY</span>
              <span className="text-[10px] font-bold text-rose-400 bg-rose-950/60 px-1.5 py-0.5 rounded border border-rose-900/60">
                5 mục
              </span>
            </h3>

            <div className="flex flex-col gap-2">
              {/* Alert 1 (HẾT) */}
              <div className="bg-[#381d1d] border border-rose-800/60 rounded-lg px-3 py-2 flex items-center gap-2 text-xs">
                <span className="px-1.5 py-0.5 bg-rose-600 text-white font-extrabold text-[10px] rounded">
                  HẾT
                </span>
                <span className="text-rose-100 font-bold truncate">Lẩu cua đồng</span>
              </div>

              {/* Alert 2 (SẮP HẾT) */}
              <div className="bg-[#382b1d] border border-amber-800/60 rounded-lg px-3 py-2 flex items-center gap-2 text-xs">
                <span className="px-1.5 py-0.5 bg-amber-600 text-white font-extrabold text-[10px] rounded">
                  SẮP HẾT
                </span>
                <span className="text-amber-100 font-semibold truncate">Bia 333 (còn 2 thùng)</span>
              </div>

              {/* Alert 3 */}
              <div className="bg-[#382b1d] border border-amber-800/60 rounded-lg px-3 py-2 flex items-center gap-2 text-xs">
                <span className="px-1.5 py-0.5 bg-amber-600 text-white font-extrabold text-[10px] rounded">
                  SẮP HẾT
                </span>
                <span className="text-amber-100 font-semibold truncate">Mực lá một nắng</span>
              </div>

              {/* Alert 4 */}
              <div className="bg-[#382b1d] border border-amber-800/60 rounded-lg px-3 py-2 flex items-center gap-2 text-xs">
                <span className="px-1.5 py-0.5 bg-amber-600 text-white font-extrabold text-[10px] rounded">
                  SẮP HẾT
                </span>
                <span className="text-amber-100 font-semibold truncate">Rượu mơ rừng</span>
              </div>
            </div>
            <span className="text-[10px] text-gray-500 text-center mt-2">Tự động trừ kho theo định lượng món</span>
          </div>

          {/* Panel 4: ĐƠN HÀNG TRONG BẾP */}
          <div className="bg-[#1c1e22] border border-[#2d3138] rounded-2xl p-4 shadow-lg flex flex-col justify-between">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-xs font-extrabold uppercase tracking-wide text-gray-200">
                ĐƠN HÀNG TRONG BẾP
              </h3>
              <Link href="/kitchen" className="text-xs text-amber-400 font-bold hover:underline">
                Vào KDS →
              </Link>
            </div>

            <div className="mb-2">
              <span className="text-sm font-black text-amber-300">
                Tổng: <span className="font-mono text-base text-white">18 đơn</span> trong bếp
              </span>
            </div>

            <div className="flex flex-col gap-2">
              {/* Urgent item 1 */}
              <div className="bg-[#24272e] border border-[#383d47] rounded-lg px-3 py-2 flex items-center justify-between text-xs">
                <span className="text-gray-200 font-medium">
                  ĐƠN #108 | 18:30 | Bàn C2 <span className="text-rose-400 font-bold">(Trễ 12m)</span>
                </span>
                <span className="text-sm">🔥</span>
              </div>

              {/* Urgent item 2 */}
              <div className="bg-[#24272e] border border-[#383d47] rounded-lg px-3 py-2 flex items-center justify-between text-xs">
                <span className="text-gray-200 font-medium">
                  ĐƠN #107 | 18:25 | Bàn C1 <span className="text-rose-400 font-bold">(Trễ 10m)</span>
                </span>
                <span className="text-sm">🔥</span>
              </div>

              {/* Urgent item 3 */}
              <div className="bg-[#24272e] border border-[#383d47] rounded-lg px-3 py-2 flex items-center justify-between text-xs">
                <span className="text-gray-200 font-medium">
                  ĐƠN #106 | 18:20 | Bàn VIP 2 <span className="text-rose-400 font-bold">(Trễ 8m)</span>
                </span>
                <span className="text-sm">🔥</span>
              </div>

              {/* Normal item */}
              <div className="bg-[#24272e] border border-[#383d47] rounded-lg px-3 py-2 flex items-center justify-between text-xs">
                <span className="text-gray-200 font-medium">
                  ĐƠN #105 | 18:15 | Bàn C5 <span className="text-amber-400 font-semibold">(Đang nấu 5m)</span>
                </span>
                <span className="text-xs text-emerald-400 font-mono">OK</span>
              </div>
            </div>

            <span className="text-[10px] text-gray-500 text-center mt-2">Đồng bộ tín hiệu bếp qua SignalR</span>
          </div>
        </section>
      </div>
    </AppShell>
  );
}
