"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import * as signalR from "@microsoft/signalr";
import { config } from "@/lib/config";
import { readSession } from "@/lib/auth/storage";
import { useBranch } from "@/features/branches/branch-provider";
import { Bell, Check, Utensils, X, Flame } from "lucide-react";

export type ReadyServingNotification = {
  id: string;
  orderId: string;
  kitchenOrderId: string;
  tableNumber: string;
  orderNumber: string;
  itemSummary: string;
  stationName: string;
  readyAt: string;
  dismissed: boolean;
};

// High-clarity synthesized Service Ding-Dong Bell chime
function playServingBell() {
  try {
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new AudioContextClass();
    const now = ctx.currentTime;

    // Harmonic bell triad (C5 - 523Hz, E5 - 659Hz, G5 - 784Hz)
    const freqs = [523.25, 659.25, 783.99];
    freqs.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(freq, now + idx * 0.12);
      gain.gain.setValueAtTime(0.3, now + idx * 0.12);
      gain.gain.exponentialRampToValueAtTime(0.001, now + idx * 0.12 + 1.2);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + idx * 0.12);
      osc.stop(now + idx * 0.12 + 1.2);
    });
  } catch {
    // blocked until user interaction
  }
}

export function WaiterNotifications() {
  const { branchId } = useBranch();
  const [notifications, setNotifications] = useState<ReadyServingNotification[]>([]);
  const [activeToast, setActiveToast] = useState<ReadyServingNotification | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const connectionRef = useRef<signalR.HubConnection | null>(null);

  const handleOrderReady = useCallback((payload: {
    orderId?: string;
    kitchenOrderId?: string;
    tableNumber?: string;
    orderNumber?: string;
    itemSummary?: string;
    stationName?: string;
    updatedAt?: string;
  }) => {
    const item: ReadyServingNotification = {
      id: `${payload.kitchenOrderId || Date.now()}-${Math.random()}`,
      orderId: payload.orderId || "",
      kitchenOrderId: payload.kitchenOrderId || "",
      tableNumber: payload.tableNumber || "Bàn",
      orderNumber: payload.orderNumber || "",
      itemSummary: payload.itemSummary || "Món ăn hoàn tất",
      stationName: payload.stationName || "Bếp",
      readyAt: payload.updatedAt || new Date().toISOString(),
      dismissed: false,
    };

    playServingBell();

    setNotifications((prev) => [item, ...prev]);
    setActiveToast(item);

    // Auto dismiss active toast after 10s if not clicked
    setTimeout(() => {
      setActiveToast((curr) => (curr?.id === item.id ? null : curr));
    }, 10000);
  }, []);

  useEffect(() => {
    const session = readSession();
    if (!branchId || !session?.accessToken) return;

    let isMounted = true;

    const connection = new signalR.HubConnectionBuilder()
      .withUrl(`${config.signalRUrl ?? config.apiUrl}/hubs/kitchen`, {
        accessTokenFactory: () => readSession()?.accessToken ?? "",
      })
      .withAutomaticReconnect([0, 2000, 5000, 10000, 30000])
      .configureLogging(signalR.LogLevel.None)
      .build();

    connectionRef.current = connection;

    // Listen for Ready to serve signal from Kitchen
    connection.on("OrderReadyForServing", (payload) => {
      if (isMounted) handleOrderReady(payload);
    });

    // Also fallback if status event comes as KitchenOrderReady
    connection.on("KitchenOrderReady", (payload) => {
      if (isMounted) handleOrderReady(payload);
    });

    connection.onreconnected(async () => {
      if (isMounted) {
        try {
          await connection.invoke("JoinBranch", branchId);
        } catch {
          // ignore reconnect invoke error
        }
      }
    });

    async function startSignalR() {
      try {
        await connection.start();
        if (isMounted) {
          await connection.invoke("JoinBranch", branchId);
        }
      } catch {
        // Handled silently; automatic reconnect will retry without crashing overlay
      }
    }

    startSignalR();

    return () => {
      isMounted = false;
      if (connectionRef.current) {
        try {
          connectionRef.current.invoke("LeaveBranch", branchId).catch(() => {});
          connectionRef.current.stop().catch(() => {});
        } catch {
          // ignore
        }
        connectionRef.current = null;
      }
    };
  }, [branchId, handleOrderReady]);

  const unservedCount = notifications.filter((n) => !n.dismissed).length;

  const markServed = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, dismissed: true } : n))
    );
    if (activeToast?.id === id) {
      setActiveToast(null);
    }
  };

  return (
    <>
      {/* Top Banner Popup when an item is ready */}
      {activeToast && !activeToast.dismissed && (
        <div className="fixed top-4 right-4 z-50 max-w-md w-full animate-bounce-in shadow-2xl">
          <div className="bg-gradient-to-r from-amber-600 via-orange-600 to-amber-700 text-white p-4 rounded-2xl border border-amber-300/40 shadow-xl flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center shrink-0 animate-pulse">
              <Utensils size={22} className="text-white" />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-bold uppercase tracking-wider bg-white/25 px-2 py-0.5 rounded-full">
                  {activeToast.stationName} báo món
                </span>
                <span className="text-xs text-white/80 font-mono">
                  {new Date().toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}
                </span>
              </div>

              <h4 className="text-base font-extrabold mt-1 text-white flex items-center gap-1.5">
                Bàn {activeToast.tableNumber} - Bưng món ngay!
              </h4>

              <p className="text-sm text-white/95 mt-0.5 line-clamp-2 font-medium">
                {activeToast.itemSummary}
              </p>

              <div className="mt-3 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => markServed(activeToast.id)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white text-orange-950 font-bold text-xs hover:bg-amber-100 transition-all cursor-pointer shadow"
                >
                  <Check size={14} /> Đã bưng món
                </button>
                <button
                  type="button"
                  onClick={() => setActiveToast(null)}
                  className="px-2.5 py-1.5 rounded-xl bg-black/20 text-white text-xs hover:bg-black/40 transition-colors cursor-pointer"
                >
                  Để sau
                </button>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setActiveToast(null)}
              className="text-white/70 hover:text-white transition-colors"
            >
              <X size={18} />
            </button>
          </div>
        </div>
      )}

      {/* Floating Bell Trigger for Waiter/Staff */}
      <div className="fixed bottom-6 right-6 z-40">
        <button
          type="button"
          onClick={() => setDrawerOpen(true)}
          className={`relative flex items-center justify-center w-13 h-13 rounded-full shadow-2xl transition-all cursor-pointer active:scale-95 ${
            unservedCount > 0
              ? "bg-gradient-to-r from-amber-500 to-orange-600 text-white animate-pulse shadow-amber-900/50"
              : "bg-[#1c1e22] text-gray-300 border border-[#2d3138] hover:text-white"
          }`}
          title="Thông báo phục vụ bàn"
        >
          <Bell size={22} />
          {unservedCount > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-600 text-white font-black text-[11px] w-5 h-5 rounded-full flex items-center justify-center border-2 border-[#141517]">
              {unservedCount}
            </span>
          )}
        </button>
      </div>

      {/* Side Drawer for Ready Dishes */}
      {drawerOpen && (
        <div className="pos-modal-backdrop" onClick={() => setDrawerOpen(false)}>
          <div
            className="fixed top-0 right-0 bottom-0 w-full max-w-sm bg-[#1c1e22] border-l border-[#2d3138] p-5 shadow-2xl flex flex-col z-50 animate-slide-left"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-[#2d3138] pb-4">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Flame className="text-amber-500" size={20} /> Món chờ phục vụ ({unservedCount})
              </h3>
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                className="text-gray-400 hover:text-white"
              >
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto py-4 space-y-3">
              {notifications.length === 0 ? (
                <div className="text-center py-12 text-gray-500 space-y-2">
                  <Utensils size={36} className="mx-auto text-gray-600" />
                  <p className="text-sm">Chưa có món nào báo hoàn tất.</p>
                </div>
              ) : (
                notifications.map((item) => (
                  <div
                    key={item.id}
                    className={`p-3.5 rounded-xl border transition-all ${
                      item.dismissed
                        ? "bg-[#141517]/50 border-[#2d3138] opacity-60"
                        : "bg-[#141517] border-amber-500/50 shadow-md shadow-amber-900/10"
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-amber-400 text-sm">
                        Bàn {item.tableNumber}
                      </span>
                      <span className="text-[11px] text-gray-400 font-mono">
                        {item.stationName}
                      </span>
                    </div>

                    <p className="text-xs font-medium text-gray-200 mt-1">
                      {item.itemSummary}
                    </p>

                    <div className="flex items-center justify-between mt-3 pt-2 border-t border-[#2d3138]">
                      <span className="text-[10px] text-gray-500">
                        {new Date(item.readyAt).toLocaleTimeString("vi-VN", {
                          hour: "2-digit",
                          minute: "2-digit",
                          second: "2-digit",
                        })}
                      </span>

                      {!item.dismissed ? (
                        <button
                          type="button"
                          onClick={() => markServed(item.id)}
                          className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white transition-colors cursor-pointer"
                        >
                          <Check size={12} /> Đã bưng
                        </button>
                      ) : (
                        <span className="text-[11px] text-gray-500 flex items-center gap-1 italic">
                          <Check size={12} /> Đã phục vụ
                        </span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
