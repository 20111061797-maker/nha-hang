"use client";

import { useMemo, useState, useCallback } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { kitchenApi } from "@/lib/api/kitchen-api";
import { posApi } from "@/lib/api/pos-api";
import { useBranch } from "@/features/branches/branch-provider";
import { useKitchenSignalR } from "./use-kitchen-signalr";
import { KitchenTicketCard } from "./kitchen-ticket-card";
import { KitchenStationModal } from "./kitchen-station-modal";
import { LoadingState, EmptyState } from "@/components/feedback/states";
import {
  KitchenOrderStatus,
  type KitchenOrder,
} from "@/types/kitchen";
import {
  ChefHat,
  Volume2,
  VolumeX,
  Maximize,
  Minimize,
  Settings,
  Sparkles,
  RefreshCw,
  Flame,
  CheckCircle2,
  Clock,
  Layers,
  LayoutGrid,
  Radio,
  SlidersHorizontal,
  UtensilsCrossed,
} from "lucide-react";

// Custom high-clarity voice alert / chime from user's audio file
function playKitchenOrderAlert() {
  try {
    const audio = new Audio("/images/tieng_doc_1791207282394.mp3");
    audio.play().catch(() => {
      // Fallback if browser autoplay blocks initial playback
      playSynthesizedChime();
    });
  } catch {
    playSynthesizedChime();
  }
}

function playSynthesizedChime() {
  try {
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new AudioContextClass();
    const now = ctx.currentTime;

    const osc1 = ctx.createOscillator();
    const gain1 = ctx.createGain();
    osc1.type = "sine";
    osc1.frequency.setValueAtTime(880, now);
    osc1.frequency.exponentialRampToValueAtTime(1760, now + 0.1);
    gain1.gain.setValueAtTime(0.3, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.8);
    osc1.connect(gain1);
    gain1.connect(ctx.destination);
    osc1.start(now);
    osc1.stop(now + 0.8);

    const osc2 = ctx.createOscillator();
    const gain2 = ctx.createGain();
    osc2.type = "sine";
    osc2.frequency.setValueAtTime(1320, now + 0.1);
    gain2.gain.setValueAtTime(0.25, now + 0.1);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 1.2);
    osc2.connect(gain2);
    gain2.connect(ctx.destination);
    osc2.start(now + 0.1);
    osc2.stop(now + 1.2);
  } catch {
    // audio context might be blocked if no user interaction yet
  }
}

export function KitchenView() {
  const { branchId, currentBranch } = useBranch();
  const queryClient = useQueryClient();

  const [selectedStationId, setSelectedStationId] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"kanban" | "grid">("kanban");
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [stationModalOpen, setStationModalOpen] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // SignalR Event Handler
  const handleKitchenEvent = useCallback(
    (evt: { eventName?: string }) => {
      queryClient.invalidateQueries({ queryKey: ["kitchen-orders", branchId] });

      if (
        (evt.eventName === "KitchenOrderCreated" || evt.eventName === "NewOrderCreated") &&
        soundEnabled
      ) {
        playKitchenOrderAlert();
      }
    },
    [branchId, queryClient, soundEnabled]
  );

  const { isConnected } = useKitchenSignalR({
    branchId,
    onEvent: handleKitchenEvent,
  });

  // Queries
  const { data: stations = [], isLoading: stationsLoading } = useQuery({
    queryKey: ["kitchen-stations", branchId],
    queryFn: () => (branchId ? kitchenApi.getStations(branchId) : Promise.resolve([])),
    enabled: Boolean(branchId),
  });

  const {
    data: tickets = [],
    isLoading: ticketsLoading,
    refetch: refetchTickets,
    isFetching,
  } = useQuery({
    queryKey: ["kitchen-orders", branchId, selectedStationId],
    queryFn: () => {
      if (!branchId) return Promise.resolve([]);
      const station = selectedStationId === "all" ? undefined : selectedStationId;
      return kitchenApi.getOrders(branchId, station);
    },
    enabled: Boolean(branchId),
    refetchInterval: 12000,
  });

  const { data: menu } = useQuery({
    queryKey: ["pos-menu", branchId],
    queryFn: () => (branchId ? posApi.getMenu(branchId) : Promise.resolve(null)),
    enabled: Boolean(branchId),
  });

  // Mutations
  const acceptMutation = useMutation({
    mutationFn: ({ id, version }: { id: string; version: number }) =>
      kitchenApi.acceptOrder(id, version),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["kitchen-orders", branchId] });
    },
  });

  const startMutation = useMutation({
    mutationFn: ({ id, version }: { id: string; version: number }) =>
      kitchenApi.startOrder(id, version),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["kitchen-orders", branchId] });
    },
  });

  const readyMutation = useMutation({
    mutationFn: ({ id, version }: { id: string; version: number }) =>
      kitchenApi.readyOrder(id, version),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["kitchen-orders", branchId] });
    },
  });

  const completeMutation = useMutation({
    mutationFn: ({ id, version }: { id: string; version: number }) =>
      kitchenApi.completeOrder(id, version),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["kitchen-orders", branchId] });
    },
  });

  const cancelMutation = useMutation({
    mutationFn: ({ id, version }: { id: string; version: number }) =>
      kitchenApi.cancelOrder(id, version),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["kitchen-orders", branchId] });
    },
  });

  const createStationMutation = useMutation({
    mutationFn: (payload: { code: string; name: string; description?: string; displayOrder?: number }) =>
      kitchenApi.createStation(branchId!, {
        code: payload.code,
        name: payload.name,
        description: payload.description,
        displayOrder: payload.displayOrder ?? 0,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["kitchen-stations", branchId] });
    },
  });

  const assignProductsMutation = useMutation({
    mutationFn: ({ stationId, productIds }: { stationId: string; productIds: string[] }) =>
      kitchenApi.setStationProducts(stationId, productIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["kitchen-stations", branchId] });
    },
  });

  const deleteStationMutation = useMutation({
    mutationFn: (stationId: string) => kitchenApi.deleteStation(stationId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["kitchen-stations", branchId] });
      queryClient.invalidateQueries({ queryKey: ["kitchen-orders", branchId] });
    },
  });

  const isMutating =
    acceptMutation.isPending ||
    startMutation.isPending ||
    readyMutation.isPending ||
    completeMutation.isPending ||
    cancelMutation.isPending;

  // Categorize tickets by status for Kanban view
  const { newAndAcceptedTickets, preparingTickets, readyTickets } = useMemo(() => {
    const nA: KitchenOrder[] = [];
    const prep: KitchenOrder[] = [];
    const rdy: KitchenOrder[] = [];

    // Filter tickets if station is selected
    const filtered =
      selectedStationId === "all"
        ? tickets
        : tickets.filter((t) => t.stationId === selectedStationId);

    // Sort by priority (Urgent first), then oldest first (FIFO)
    const sorted = [...filtered].sort((a, b) => {
      if (a.priority !== b.priority) {
        return b.priority - a.priority; // higher priority first
      }
      return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
    });

    for (const t of sorted) {
      if (t.status === KitchenOrderStatus.New || t.status === KitchenOrderStatus.Accepted) {
        nA.push(t);
      } else if (t.status === KitchenOrderStatus.Preparing) {
        prep.push(t);
      } else if (t.status === KitchenOrderStatus.Ready) {
        rdy.push(t);
      }
    }

    return {
      newAndAcceptedTickets: nA,
      preparingTickets: prep,
      readyTickets: rdy,
    };
  }, [tickets, selectedStationId]);

  // Fullscreen Handler
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen().catch(() => {});
      }
      setIsFullscreen(false);
    }
  };

  // Default station seeder if branch has none
  const handleCreateDefaultStations = async () => {
    if (!branchId) return;
    try {
      await createStationMutation.mutateAsync({
        code: "HOT",
        name: "Bếp Nóng (Món chính & Lẩu)",
        description: "Chế biến các món xào, nướng, chiên, lẩu, đồ nóng",
      });
      await createStationMutation.mutateAsync({
        code: "COLD",
        name: "Bếp Lạnh & Khai Vị",
        description: "Salad, gỏi, nem cuốn, món nguội khai vị",
      });
      await createStationMutation.mutateAsync({
        code: "BAR",
        name: "Quầy Pha Chế & Bar",
        description: "Bia, nước ngọt, cocktail, trà, sinh tố",
      });
      setStationModalOpen(true);
    } catch {
      // ignore
    }
  };

  if (!branchId) {
    return (
      <EmptyState
        title="Chưa chọn chi nhánh"
        detail="Vui lòng chọn chi nhánh hoạt động ở thanh trên cùng để sử dụng KDS."
      />
    );
  }

  const isLoading = stationsLoading || ticketsLoading;

  if (isLoading) {
    return <LoadingState fullscreen label="Đang tải dữ liệu Màn hình Bếp..." />;
  }

  return (
    <div className="flex flex-col gap-5 min-h-[calc(100vh-80px)] text-slate-800 dark:text-gray-100">
      {/* KDS Control Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-2xl bg-white dark:bg-[#141822]/90 backdrop-blur-md border border-slate-200 dark:border-[#262c3d] shadow-sm dark:shadow-lg">
        {/* Left: Branch & Screen Title */}
        <div className="flex items-center gap-4 flex-wrap">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-amber-700 bg-amber-500/15 dark:text-amber-400 dark:bg-amber-500/10 px-2 py-0.5 rounded border border-amber-300 dark:border-amber-500/20">
                {currentBranch?.name || "Chi Nhánh"}
              </span>
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 border border-emerald-200 dark:bg-[#1a1f2c] dark:border-[#2e374d]">
                <span
                  className={`w-2 h-2 rounded-full ${
                    isConnected ? "bg-emerald-500 shadow-[0_0_8px_rgba(52,211,153,0.8)]" : "bg-rose-500"
                  }`}
                />
                <span className={isConnected ? "text-emerald-700 dark:text-emerald-300" : "text-rose-600 dark:text-rose-400"}>
                  {isConnected ? "Kết nối trực tiếp (Live)" : "Mất kết nối..."}
                </span>
              </div>
            </div>
            <h1 className="text-xl md:text-2xl font-black text-slate-900 dark:text-white tracking-tight flex items-center gap-2 mt-1">
              <ChefHat className="text-orange-500" size={26} />
              <span>Màn hình Bếp (Kitchen Display System)</span>
            </h1>
          </div>
        </div>

        {/* Right: Controls & Actions */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Sound Toggle */}
          <button
            type="button"
            onClick={() => {
              const next = !soundEnabled;
              setSoundEnabled(next);
              if (next) {
                playKitchenOrderAlert();
              }
            }}
            className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer ${
              soundEnabled
                ? "bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100 dark:bg-amber-500/15 dark:text-amber-300 dark:border-amber-500/30 dark:hover:bg-amber-500/25 shadow-sm"
                : "bg-white text-slate-600 border-slate-200 hover:text-slate-900 dark:bg-[#1c212d] dark:text-gray-400 dark:border-[#2d3547] dark:hover:text-gray-200"
            }`}
            title={soundEnabled ? "Đang bật âm chuông báo món mới (Bấm để thử âm hoặc tắt)" : "Đã tắt âm chuông (Bấm để bật)"}
          >
            {soundEnabled ? <Volume2 size={16} className="text-amber-500" /> : <VolumeX size={16} />}
            <span>{soundEnabled ? "Âm báo: Bật" : "Âm báo: Tắt"}</span>
          </button>

          {/* View Mode Toggle Switch */}
          <div className="flex items-center p-1 rounded-xl bg-slate-100 border border-slate-200 dark:bg-[#12151e] dark:border-[#272e3f]">
            <button
              type="button"
              onClick={() => setViewMode("kanban")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                viewMode === "kanban"
                  ? "bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-md shadow-orange-500/20"
                  : "text-slate-600 hover:text-slate-900 dark:text-gray-400 dark:hover:text-gray-200"
              }`}
            >
              <Layers size={14} />
              <span>Cột</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode("grid")}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                viewMode === "grid"
                  ? "bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-md shadow-orange-500/20"
                  : "text-slate-600 hover:text-slate-900 dark:text-gray-400 dark:hover:text-gray-200"
              }`}
            >
              <LayoutGrid size={14} />
              <span>Lưới</span>
            </button>
          </div>

          {/* Manual Refresh */}
          <button
            type="button"
            onClick={() => refetchTickets()}
            className="p-2.5 rounded-xl bg-white hover:bg-slate-100 text-slate-600 hover:text-slate-900 border border-slate-200 dark:bg-[#1c212d] dark:hover:bg-[#252c3c] dark:text-gray-300 dark:hover:text-white dark:border-[#2d3547] transition-all cursor-pointer shadow-sm"
            title="Làm mới danh sách vé bếp"
          >
            <RefreshCw size={15} className={isFetching ? "animate-spin text-orange-500" : ""} />
          </button>

          {/* Fullscreen Toggle */}
          <button
            type="button"
            onClick={toggleFullscreen}
            className="p-2.5 rounded-xl bg-white hover:bg-slate-100 text-slate-600 hover:text-slate-900 border border-slate-200 dark:bg-[#1c212d] dark:hover:bg-[#252c3c] dark:text-gray-300 dark:hover:text-white dark:border-[#2d3547] transition-all cursor-pointer shadow-sm"
            title={isFullscreen ? "Thoát toàn màn hình" : "Bật toàn màn hình KDS"}
          >
            {isFullscreen ? <Minimize size={15} /> : <Maximize size={15} />}
          </button>

          {/* Station Management Modal Button */}
          <button
            type="button"
            onClick={() => setStationModalOpen(true)}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 shadow-md shadow-orange-600/25 active:scale-95 transition-all cursor-pointer"
          >
            <Settings size={15} />
            <span>Trạm bếp</span>
          </button>
        </div>
      </div>

      {/* Station Selector Bar & Metrics Summary */}
      <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4 p-3 rounded-2xl bg-white border border-slate-200 shadow-sm dark:bg-[#141822]/80 dark:border-[#242a3a]">
        {/* Station Pill Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 lg:pb-0 scrollbar-none">
          <button
            type="button"
            onClick={() => setSelectedStationId("all")}
            className={`shrink-0 flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
              selectedStationId === "all"
                ? "bg-gradient-to-r from-orange-500 to-amber-500 text-white border-orange-400/60 shadow-md shadow-orange-500/25"
                : "bg-slate-50 text-slate-700 hover:text-orange-600 hover:bg-slate-100 border-slate-200 dark:bg-[#181c27] dark:text-gray-300 dark:hover:text-white dark:hover:bg-[#212736] dark:border-[#2b3345]"
            }`}
          >
            <span>Tất cả trạm</span>
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                selectedStationId === "all"
                  ? "bg-white/25 text-white"
                  : "bg-slate-200 text-slate-700 dark:bg-white/10 dark:text-gray-300"
              }`}
            >
              {tickets.length}
            </span>
          </button>

          {stations.map((st) => {
            const count = tickets.filter((t) => t.stationId === st.id).length;
            const isSelected = selectedStationId === st.id;
            return (
              <button
                key={st.id}
                type="button"
                onClick={() => setSelectedStationId(st.id)}
                className={`shrink-0 flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                  isSelected
                    ? "bg-gradient-to-r from-orange-500 to-amber-500 text-white border-orange-400/60 shadow-md shadow-orange-500/25"
                    : "bg-slate-50 text-slate-700 hover:text-orange-600 hover:bg-slate-100 border-slate-200 dark:bg-[#181c27] dark:text-gray-300 dark:hover:text-white dark:hover:bg-[#212736] dark:border-[#2b3345]"
                }`}
              >
                <span>{st.name}</span>
                {count > 0 && (
                  <span
                    className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                      isSelected
                        ? "bg-white/25 text-white"
                        : "bg-orange-100 text-orange-700 border border-orange-300 dark:bg-orange-500/20 dark:text-orange-400 dark:border-orange-500/30"
                    }`}
                  >
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Live Metrics Cards */}
        <div className="flex items-center gap-2 shrink-0">
          {/* Waiting */}
          <div className="flex-1 lg:flex-initial flex items-center gap-2 px-3 py-1.5 rounded-xl bg-sky-50 border border-sky-200 text-sky-700 dark:bg-sky-500/10 dark:border-sky-500/25 dark:text-sky-300 shadow-sm">
            <Clock size={15} className="text-sky-500 dark:text-sky-400" />
            <span className="text-xs font-medium">Chờ chế biến:</span>
            <span className="font-mono font-black text-sm text-sky-900 dark:text-sky-200">
              {newAndAcceptedTickets.length}
            </span>
          </div>

          {/* Cooking */}
          <div className="flex-1 lg:flex-initial flex items-center gap-2 px-3 py-1.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 dark:bg-amber-500/10 dark:border-amber-500/25 dark:text-amber-300 shadow-sm">
            <Flame size={15} className="text-amber-500 dark:text-amber-400" />
            <span className="text-xs font-medium">Đang nấu:</span>
            <span className="font-mono font-black text-sm text-amber-900 dark:text-amber-200">
              {preparingTickets.length}
            </span>
          </div>

          {/* Ready */}
          <div className="flex-1 lg:flex-initial flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 dark:bg-emerald-500/10 dark:border-emerald-500/25 dark:text-emerald-300 shadow-sm">
            <CheckCircle2 size={15} className="text-emerald-500 dark:text-emerald-400" />
            <span className="text-xs font-medium">Đã xong:</span>
            <span className="font-mono font-black text-sm text-emerald-900 dark:text-emerald-200">
              {readyTickets.length}
            </span>
          </div>
        </div>
      </div>

      {/* No stations empty state prompt */}
      {stations.length === 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 rounded-2xl bg-amber-50 border border-amber-300 shadow-sm dark:bg-gradient-to-r dark:from-amber-950/40 dark:via-orange-950/30 dark:to-[#141822] dark:border-amber-500/30">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-xl bg-amber-100 text-amber-600 border border-amber-300 dark:bg-amber-500/20 dark:text-amber-400 dark:border-amber-500/30">
              <Sparkles size={24} />
            </div>
            <div>
              <h4 className="font-bold text-slate-900 dark:text-white text-sm">Chi nhánh chưa thiết lập trạm bếp nào!</h4>
              <p className="text-xs text-slate-600 dark:text-gray-300 mt-0.5">
                Tạo nhanh các trạm mặc định (Bếp Nóng, Bếp Lạnh, Quầy Pha Chế) để hệ thống tự động chia món khi gửi đơn.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleCreateDefaultStations}
            className="shrink-0 flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold text-white bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-400 hover:to-amber-400 shadow-md shadow-orange-500/30 active:scale-95 transition-all cursor-pointer"
          >
            <Sparkles size={15} />
            <span>Tạo trạm bếp mặc định ngay</span>
          </button>
        </div>
      )}

      {/* Main Workspace (Kanban vs Grid) */}
      {tickets.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center py-20 px-4 rounded-2xl bg-white border border-slate-200 shadow-sm dark:bg-[#141822]/60 dark:border-[#242a3a] text-center">
          <div className="w-16 h-16 rounded-2xl bg-orange-50 border border-orange-200 dark:bg-[#1d222e] dark:border-[#2e374a] flex items-center justify-center text-orange-500 dark:text-gray-400 mb-4 shadow-sm">
            <ChefHat size={32} className="text-orange-500 dark:text-gray-400" />
          </div>
          <h3 className="text-lg font-bold text-slate-900 dark:text-white mb-1">Không có món nào cần chế biến</h3>
          <p className="text-xs text-slate-500 dark:text-gray-400 max-w-md mb-6 leading-relaxed">
            Tất cả đơn hàng đã được phục vụ xong. Khi nhân viên thu ngân hoặc khách quét mã QR gửi đơn,
            các vé chế biến sẽ tức thì xuất hiện tại đây kèm âm báo chuông.
          </p>
          <div className="inline-flex items-center gap-2 text-xs text-slate-500 dark:text-gray-500 font-mono">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
            <span>Hệ thống KDS đang sẵn sàng tiếp nhận đơn mới</span>
          </div>
        </div>
      ) : viewMode === "kanban" ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 items-start">
          {/* Column 1: Chờ chế biến */}
          <div className="flex flex-col rounded-2xl bg-white border border-slate-200 shadow-sm dark:bg-[#131620] dark:border-[#262c3d] dark:shadow-xl overflow-hidden min-h-[500px]">
            {/* Column Header */}
            <div className="flex items-center justify-between p-3.5 bg-sky-50 border-b border-sky-200 dark:bg-gradient-to-r dark:from-sky-950/80 dark:via-blue-900/30 dark:to-[#131620] dark:border-sky-500/30 shrink-0">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-sky-100 text-sky-600 border border-sky-200 dark:bg-sky-500/20 dark:text-sky-400 dark:border-sky-500/30">
                  <Clock size={15} />
                </div>
                <div>
                  <h4 className="font-black text-xs uppercase tracking-wider text-sky-900 dark:text-sky-200">
                    1. Chờ chế biến
                  </h4>
                  <span className="text-[10px] text-sky-600 dark:text-gray-400">Vé mới &amp; đã xác nhận</span>
                </div>
              </div>
              <span className="font-mono font-black text-xs px-2.5 py-0.5 rounded-full bg-sky-100 text-sky-800 border border-sky-300 dark:bg-sky-500/20 dark:text-sky-300 dark:border-sky-500/40">
                {newAndAcceptedTickets.length}
              </span>
            </div>

            {/* Column Body */}
            <div className="p-3 flex-1 flex flex-col gap-3.5 overflow-y-auto max-h-[calc(100vh-280px)] scrollbar-thin">
              {newAndAcceptedTickets.map((t) => (
                <KitchenTicketCard
                  key={t.id}
                  ticket={t}
                  isProcessing={isMutating}
                  onAccept={(id, v) => acceptMutation.mutate({ id, version: v })}
                  onStart={(id, v) => startMutation.mutate({ id, version: v })}
                  onReady={(id, v) => readyMutation.mutate({ id, version: v })}
                  onComplete={(id, v) => completeMutation.mutate({ id, version: v })}
                  onCancel={(id, v) => cancelMutation.mutate({ id, version: v })}
                />
              ))}

              {newAndAcceptedTickets.length === 0 && (
                <div className="flex-1 flex flex-col items-center justify-center py-16 px-4 border-2 border-dashed border-slate-200 dark:border-[#242b3b] rounded-xl text-center">
                  <Clock size={28} className="text-slate-400 dark:text-gray-600 mb-2 opacity-60" />
                  <span className="text-xs font-semibold text-slate-600 dark:text-gray-400">Không có vé mới</span>
                  <span className="text-[11px] text-slate-400 dark:text-gray-500 mt-1 max-w-[200px]">
                    Đang sẵn sàng đón nhận đơn từ POS hoặc quét QR
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Column 2: Đang nấu */}
          <div className="flex flex-col rounded-2xl bg-white border border-slate-200 shadow-sm dark:bg-[#131620] dark:border-[#262c3d] dark:shadow-xl overflow-hidden min-h-[500px]">
            {/* Column Header */}
            <div className="flex items-center justify-between p-3.5 bg-amber-50 border-b border-amber-200 dark:bg-gradient-to-r dark:from-amber-950/80 dark:via-orange-900/30 dark:to-[#131620] dark:border-amber-500/30 shrink-0">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-amber-100 text-amber-600 border border-amber-200 dark:bg-amber-500/20 dark:text-amber-400 dark:border-amber-500/30">
                  <Flame size={15} />
                </div>
                <div>
                  <h4 className="font-black text-xs uppercase tracking-wider text-amber-900 dark:text-amber-200">
                    2. Đang nấu
                  </h4>
                  <span className="text-[10px] text-amber-600 dark:text-gray-400">Đang thao tác tại bếp</span>
                </div>
              </div>
              <span className="font-mono font-black text-xs px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300 dark:bg-amber-500/20 dark:text-amber-300 dark:border-amber-500/40">
                {preparingTickets.length}
              </span>
            </div>

            {/* Column Body */}
            <div className="p-3 flex-1 flex flex-col gap-3.5 overflow-y-auto max-h-[calc(100vh-280px)] scrollbar-thin">
              {preparingTickets.map((t) => (
                <KitchenTicketCard
                  key={t.id}
                  ticket={t}
                  isProcessing={isMutating}
                  onAccept={(id, v) => acceptMutation.mutate({ id, version: v })}
                  onStart={(id, v) => startMutation.mutate({ id, version: v })}
                  onReady={(id, v) => readyMutation.mutate({ id, version: v })}
                  onComplete={(id, v) => completeMutation.mutate({ id, version: v })}
                  onCancel={(id, v) => cancelMutation.mutate({ id, version: v })}
                />
              ))}

              {preparingTickets.length === 0 && (
                <div className="flex-1 flex flex-col items-center justify-center py-16 px-4 border-2 border-dashed border-slate-200 dark:border-[#242b3b] rounded-xl text-center">
                  <Flame size={28} className="text-slate-400 dark:text-gray-600 mb-2 opacity-60" />
                  <span className="text-xs font-semibold text-slate-600 dark:text-gray-400">Bếp đang trống</span>
                  <span className="text-[11px] text-slate-400 dark:text-gray-500 mt-1 max-w-[200px]">
                    Bấm &quot;Bắt đầu nấu món&quot; ở cột chờ để chuyển vé vào đây
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Column 3: Sẵn sàng lên món */}
          <div className="flex flex-col rounded-2xl bg-white border border-slate-200 shadow-sm dark:bg-[#131620] dark:border-[#262c3d] dark:shadow-xl overflow-hidden min-h-[500px]">
            {/* Column Header */}
            <div className="flex items-center justify-between p-3.5 bg-emerald-50 border-b border-emerald-200 dark:bg-gradient-to-r dark:from-emerald-950/80 dark:via-teal-900/30 dark:to-[#131620] dark:border-emerald-500/30 shrink-0">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-emerald-100 text-emerald-600 border border-emerald-200 dark:bg-emerald-500/20 dark:text-emerald-400 dark:border-emerald-500/30">
                  <CheckCircle2 size={15} />
                </div>
                <div>
                  <h4 className="font-black text-xs uppercase tracking-wider text-emerald-900 dark:text-emerald-200">
                    3. Sẵn sàng lên món
                  </h4>
                  <span className="text-[10px] text-emerald-600 dark:text-gray-400">Đã xong / Chờ phục vụ bưng</span>
                </div>
              </div>
              <span className="font-mono font-black text-xs px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300 dark:bg-emerald-500/20 dark:text-emerald-300 dark:border-emerald-500/40">
                {readyTickets.length}
              </span>
            </div>

            {/* Column Body */}
            <div className="p-3 flex-1 flex flex-col gap-3.5 overflow-y-auto max-h-[calc(100vh-280px)] scrollbar-thin">
              {readyTickets.map((t) => (
                <KitchenTicketCard
                  key={t.id}
                  ticket={t}
                  isProcessing={isMutating}
                  onAccept={(id, v) => acceptMutation.mutate({ id, version: v })}
                  onStart={(id, v) => startMutation.mutate({ id, version: v })}
                  onReady={(id, v) => readyMutation.mutate({ id, version: v })}
                  onComplete={(id, v) => completeMutation.mutate({ id, version: v })}
                  onCancel={(id, v) => cancelMutation.mutate({ id, version: v })}
                />
              ))}

              {readyTickets.length === 0 && (
                <div className="flex-1 flex flex-col items-center justify-center py-16 px-4 border-2 border-dashed border-slate-200 dark:border-[#242b3b] rounded-xl text-center">
                  <CheckCircle2 size={28} className="text-slate-400 dark:text-gray-600 mb-2 opacity-60" />
                  <span className="text-xs font-semibold text-slate-600 dark:text-gray-400">Chưa có món hoàn tất</span>
                  <span className="text-[11px] text-slate-400 dark:text-gray-500 mt-1 max-w-[200px]">
                    Món nấu xong sẽ xuất hiện ở đây để nhân viên bưng lên bàn
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        /* Grid Board View */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 items-start">
          {tickets.map((t) => (
            <KitchenTicketCard
              key={t.id}
              ticket={t}
              isProcessing={isMutating}
              onAccept={(id, v) => acceptMutation.mutate({ id, version: v })}
              onStart={(id, v) => startMutation.mutate({ id, version: v })}
              onReady={(id, v) => readyMutation.mutate({ id, version: v })}
              onComplete={(id, v) => completeMutation.mutate({ id, version: v })}
              onCancel={(id, v) => cancelMutation.mutate({ id, version: v })}
            />
          ))}
        </div>
      )}

      {/* Station Modal */}
      {stationModalOpen && (
        <KitchenStationModal
          stations={stations}
          menu={menu ?? null}
          onClose={() => setStationModalOpen(false)}
          onCreateStation={async (payload) => {
            await createStationMutation.mutateAsync(payload);
          }}
          onAssignProducts={async (stationId, productIds) => {
            await assignProductsMutation.mutateAsync({ stationId, productIds });
          }}
          onDeleteStation={async (stationId) => {
            await deleteStationMutation.mutateAsync(stationId);
          }}
        />
      )}
    </div>
  );
}
