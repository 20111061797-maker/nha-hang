"use client";

import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { posApi } from "@/lib/api/pos-api";
import { useBranch } from "@/features/branches/branch-provider";
import {
  OrderType,
  OrderStatus,
  TableStatus,
  type DiningTable,
  type OrderItemDetails,
  type OrderListItem,
} from "@/types/pos";
import { paymentApi } from "@/lib/api/payment-api";
import { PaymentMethod } from "@/types/payments";
import { announcePaymentSuccess } from "@/lib/audio/payment-sound";
import { handleSepayPopupReturn, submitSepayCheckout } from "@/lib/sepay/checkout-redirect";
import { TableFloorPlan } from "./table-floor-plan";
import { useKitchenSignalR } from "@/features/kitchen/use-kitchen-signalr";
import { MenuSelector } from "./menu-selector";
import { OrderTicket } from "./order-ticket";
import { LoadingState, EmptyState } from "@/components/feedback/states";
import Link from "next/link";
import {
  ArrowLeft,
  CheckCircle,
  AlertTriangle,
  Utensils,
  UtensilsCrossed,
  ShoppingBag,
  PlusCircle,
  X,
  Grid3X3,
  User,
  Users,
  FileText,
  Plus,
  Minus,
  Sparkles,
} from "lucide-react";

export function PosView() {
  const { branchId, currentBranch } = useBranch();
  const queryClient = useQueryClient();

  const [selectedTable, setSelectedTable] = useState<DiningTable | null>(null);
  const [activeOrderId, setActiveOrderId] = useState<string | null>(null);
  const [newOrderModalOpen, setNewOrderModalOpen] = useState(false);
  const [targetTableForNewOrder, setTargetTableForNewOrder] = useState<DiningTable | null>(null);
  const [isTakeawayNewOrder, setIsTakeawayNewOrder] = useState(false);
  const [guestName, setGuestName] = useState("");
  const [orderNotes, setOrderNotes] = useState("");
  const [guestCount, setGuestCount] = useState<number>(2);
  const [isSepayLoading, setIsSepayLoading] = useState(false);

  const [notification, setNotification] = useState<{
    type: "success" | "error";
    message: string;
  } | null>(null);

  const showNotification = (type: "success" | "error", message: string) => {
    setNotification({ type, message });
    setTimeout(() => {
      setNotification(null);
    }, 4500);
  };

  const getErrorMessage = (err: unknown, fallback: string) =>
    err instanceof Error ? err.message : fallback;

  // Queries
  const { data: areas = [], isLoading: areasLoading } = useQuery({
    queryKey: ["pos-areas", branchId],
    queryFn: () => (branchId ? posApi.getAreas(branchId) : Promise.resolve([])),
    enabled: Boolean(branchId),
  });

  const { data: tables = [], isLoading: tablesLoading } = useQuery({
    queryKey: ["pos-tables", branchId],
    queryFn: () => (branchId ? posApi.getTables(branchId) : Promise.resolve([])),
    enabled: Boolean(branchId),
    refetchInterval: 3000,
  });

  const { data: menu, isLoading: menuLoading } = useQuery({
    queryKey: ["pos-menu", branchId],
    queryFn: () => (branchId ? posApi.getMenu(branchId) : Promise.resolve(null)),
    enabled: Boolean(branchId),
  });

  const { data: orders = [] } = useQuery({
    queryKey: ["pos-orders", branchId],
    queryFn: () => (branchId ? posApi.getBranchOrders(branchId) : Promise.resolve([])),
    enabled: Boolean(branchId),
    refetchInterval: 2500,
  });

  const { data: activeOrder } = useQuery({
    queryKey: ["pos-order", activeOrderId],
    queryFn: () => (activeOrderId ? posApi.getOrder(activeOrderId) : Promise.resolve(null)),
    enabled: Boolean(activeOrderId),
    refetchInterval: 2000,
  });

  // SignalR thời gian thực: Khi khách quét mã QR gọi món hoặc thêm món mới, cập nhật ngay tức thì
  useKitchenSignalR({
    branchId,
    onEvent: (evt) => {
      queryClient.invalidateQueries({ queryKey: ["pos-orders", branchId] });
      queryClient.invalidateQueries({ queryKey: ["pos-tables", branchId] });
      if (activeOrderId) {
        queryClient.invalidateQueries({ queryKey: ["pos-order", activeOrderId] });
      }
      if (
        evt.eventName === "NewOrderCreated" ||
        evt.eventName === "KitchenOrderCreated"
      ) {
        const tableNum = evt.tableNumber || (evt as any).tableNumberSnapshot;
        if (selectedTable && tableNum === selectedTable.tableNumber) {
          showNotification(
            "success",
            `Khách Bàn ${tableNum} vừa gọi thêm món qua QR! Số lượng và tiền đã cập nhật.`
          );
        }
      }
    },
  });

  // Mutations
  const createOrderMutation = useMutation({
    mutationFn: posApi.createOrder,
    onSuccess: (newOrder) => {
      queryClient.invalidateQueries({ queryKey: ["pos-tables", branchId] });
      queryClient.invalidateQueries({ queryKey: ["pos-orders", branchId] });
      setActiveOrderId(newOrder.id);
      setNewOrderModalOpen(false);
      setGuestName("");
      setOrderNotes("");
      showNotification("success", `Tạo đơn hàng ${newOrder.orderNumber} thành công!`);
    },
    onError: (err: unknown) => {
      showNotification("error", getErrorMessage(err, "Không thể tạo đơn hàng."));
    },
  });

  const addItemMutation = useMutation({
    mutationFn: (vars: {
      orderId: string;
      productId: string;
      variantId?: string | null;
      modifierIds: string[];
      quantity: number;
      notes?: string;
    }) =>
      posApi.addItem(vars.orderId, {
        productId: vars.productId,
        productVariantId: vars.variantId,
        modifierIds: vars.modifierIds,
        quantity: vars.quantity,
        notes: vars.notes,
        expectedVersion: activeOrder?.version,
      }),
    onSuccess: (updated) => {
      queryClient.setQueryData(["pos-order", updated.id], updated);
      queryClient.invalidateQueries({ queryKey: ["pos-orders", branchId] });
      showNotification("success", "Đã thêm món vào đơn.");
    },
    onError: (err: unknown) => {
      showNotification("error", getErrorMessage(err, "Không thể thêm món vào đơn."));
    },
  });

  const updateItemMutation = useMutation({
    mutationFn: (vars: { itemId: string; currentItem: OrderItemDetails; newQty: number }) =>
      posApi.updateItem(activeOrderId!, vars.itemId, {
        productId: vars.currentItem.productId,
        productVariantId: vars.currentItem.productVariantId,
        comboId: vars.currentItem.comboId,
        quantity: vars.newQty,
        modifierIds: vars.currentItem.modifiers?.map((m) => m.modifierId) || [],
        notes: vars.currentItem.notes,
        expectedVersion: activeOrder?.version,
      }),
    onSuccess: (updated) => {
      queryClient.setQueryData(["pos-order", updated.id], updated);
      queryClient.invalidateQueries({ queryKey: ["pos-orders", branchId] });
    },
    onError: (err: unknown) => {
      showNotification("error", getErrorMessage(err, "Không thể cập nhật số lượng."));
    },
  });

  const removeItemMutation = useMutation({
    mutationFn: (itemId: string) =>
      posApi.removeItem(activeOrderId!, itemId, activeOrder?.version),
    onSuccess: (updated) => {
      queryClient.setQueryData(["pos-order", updated.id], updated);
      queryClient.invalidateQueries({ queryKey: ["pos-orders", branchId] });
      showNotification("success", "Đã xóa món khỏi đơn.");
    },
    onError: (err: unknown) => {
      showNotification("error", getErrorMessage(err, "Không thể xóa món."));
    },
  });

  const confirmOrderMutation = useMutation({
    mutationFn: (orderId: string) =>
      posApi.confirmOrder(orderId, activeOrder?.version),
    onSuccess: (updated) => {
      queryClient.setQueryData(["pos-order", updated.id], updated);
      queryClient.invalidateQueries({ queryKey: ["pos-orders", branchId] });
      queryClient.invalidateQueries({ queryKey: ["pos-tables", branchId] });
      showNotification(
        "success",
        `Đã gửi đơn #${updated.orderNumber} vào hệ thống Bếp (KDS) thành công!`
      );
    },
    onError: (err: unknown) => {
      showNotification("error", getErrorMessage(err, "Không thể gửi bếp."));
    },
  });

  const completeOrderMutation = useMutation({
    mutationFn: async (orderId: string) => {
      const amount = activeOrder?.totalAmount || 0;
      if (amount > 0) {
        await paymentApi
          .createPayment(orderId, {
            paymentMethod: PaymentMethod.Cash,
            amount,
            tenderedAmount: amount,
            note: `Thu tiền mặt tại quầy POS Bàn ${selectedTable?.tableNumber || "Mang về"}`,
          })
          .catch((err) => console.warn("Lỗi lưu phiếu thu tiền mặt:", err));
      }
      return await posApi.completeOrder(orderId);
    },
    onSuccess: (updated) => {
      const amount = activeOrder?.totalAmount || updated.totalAmount || 0;
      // Phát tiếng chuông và giọng đọc tiếng Việt thông báo số tiền
      announcePaymentSuccess(amount);

      // Cập nhật ngay trạng thái bàn thành TRỐNG (Available) trên sơ đồ
      const tableIdToRelease = selectedTable?.id || updated.diningTableId || activeOrder?.diningTableId;
      if (tableIdToRelease) {
        queryClient.setQueryData<DiningTable[]>(["pos-tables", branchId], (prev) =>
          prev ? prev.map((t) => (t.id === tableIdToRelease ? { ...t, status: TableStatus.Available } : t)) : []
        );
      }

      // Cập nhật danh sách đơn
      queryClient.setQueryData<OrderListItem[]>(["pos-orders", branchId], (prev) =>
        prev ? prev.map((o) => (o.id === updated.id ? { ...o, status: OrderStatus.Completed } : o)) : []
      );

      queryClient.removeQueries({ queryKey: ["pos-order", updated.id] });
      queryClient.invalidateQueries({ queryKey: ["pos-orders", branchId] });
      queryClient.invalidateQueries({ queryKey: ["pos-tables", branchId] });
      queryClient.invalidateQueries({ queryKey: ["branch-orders", branchId] });
      queryClient.invalidateQueries({ queryKey: ["branch-payments", branchId] });

      showNotification(
        "success",
        `Đã thanh toán ${amount.toLocaleString("vi-VN")} ₫ đơn #${updated.orderNumber}. Bàn đã được dọn trống thành công!`
      );
      handleBackToFloor();
    },
    onError: (err: unknown) => {
      showNotification("error", getErrorMessage(err, "Không thể hoàn tất đơn hàng."));
    },
  });

  const isOrderInactive = (status: any) =>
    status === OrderStatus.Completed ||
    status === OrderStatus.Cancelled ||
    status === 6 ||
    status === 7 ||
    status === "6" ||
    status === "7" ||
    status === "Completed" ||
    status === "Cancelled";

  // Tự động quay về sơ đồ bàn / phòng nếu đơn hàng hiện tại đã hoàn tất hoặc đã hủy (không kẹt lại màn hình đơn)
  useEffect(() => {
    if (activeOrder && isOrderInactive(activeOrder.status)) {
      handleBackToFloor();
    }
  }, [activeOrder]);

  const cancelOrderMutation = useMutation({
    mutationFn: (vars: { orderId: string; reason: string }) => {
      const isCompleted =
        activeOrder?.status === OrderStatus.Completed ||
        (activeOrder?.status as any) === 6 ||
        (activeOrder?.status as any) === "6" ||
        (activeOrder?.status as any) === "Completed";
      if (isCompleted) {
        throw new Error("Đơn hàng này đã thanh toán hoàn tất, không thể hủy.");
      }
      return posApi.cancelOrder(vars.orderId, {
        reason: vars.reason,
        expectedVersion: activeOrder?.version,
      });
    },
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ["pos-orders", branchId] });
      queryClient.invalidateQueries({ queryKey: ["pos-tables", branchId] });
      showNotification("success", `Đã hủy đơn hàng #${updated.orderNumber}.`);
      handleBackToFloor();
    },
    onError: (err: unknown) => {
      showNotification("error", getErrorMessage(err, "Không thể hủy đơn."));
    },
  });

  // Table selection logic
  const handleSelectTable = (table: DiningTable) => {
    setSelectedTable(table);

    // Check if table has an active open or confirmed order
    const tableActiveOrder = orders.find(
      (o) => o.diningTableId === table.id && !isOrderInactive(o.status)
    );

    if (tableActiveOrder) {
      setActiveOrderId(tableActiveOrder.id);
    } else {
      // Table is available or needs a new order
      setTargetTableForNewOrder(table);
      setIsTakeawayNewOrder(false);
      setGuestCount(table.capacity || 2);
      setGuestName("");
      setOrderNotes("");
      setNewOrderModalOpen(true);
    }
  };

  const handleCreateTakeaway = () => {
    setSelectedTable(null);
    setTargetTableForNewOrder(null);
    setIsTakeawayNewOrder(true);
    setGuestCount(1);
    setGuestName("");
    setOrderNotes("");
    setNewOrderModalOpen(true);
  };

  const handleConfirmNewOrder = () => {
    if (!branchId) return;

    let combinedNotes = orderNotes.trim();
    if (!isTakeawayNewOrder && guestCount > 0) {
      const guestPrefix = `[${guestCount} khách]`;
      if (!combinedNotes.includes("khách")) {
        combinedNotes = combinedNotes ? `${guestPrefix} ${combinedNotes}` : guestPrefix;
      }
    }

    if (isTakeawayNewOrder) {
      createOrderMutation.mutate({
        branchId,
        orderType: OrderType.Takeaway,
        diningTableId: null,
        customerNameSnapshot: guestName.trim() || undefined,
        notes: combinedNotes || undefined,
      });
    } else if (targetTableForNewOrder) {
      createOrderMutation.mutate({
        branchId,
        orderType: OrderType.DineIn,
        diningTableId: targetTableForNewOrder.id,
        customerNameSnapshot: guestName.trim() || undefined,
        notes: combinedNotes || undefined,
      });
    }
  };

  const handleBackToFloor = () => {
    setActiveOrderId(null);
    setSelectedTable(null);
    setTargetTableForNewOrder(null);
    setNewOrderModalOpen(false);
  };

  const handleAddItem = (params: {
    productId: string;
    variantId?: string | null;
    modifierIds: string[];
    quantity: number;
    notes?: string;
  }) => {
    if (!activeOrderId) return;
    addItemMutation.mutate({
      orderId: activeOrderId,
      ...params,
    });
  };

  const handleUpdateItemQuantity = (itemId: string, currentQty: number, delta: number) => {
    if (!activeOrder) return;
    const newQty = currentQty + delta;
    if (newQty <= 0) {
      removeItemMutation.mutate(itemId);
    } else {
      const item = activeOrder.items.find((i) => i.id === itemId);
      if (item) {
        updateItemMutation.mutate({ itemId, currentItem: item, newQty });
      }
    }
  };

  const handleRemoveItem = (itemId: string) => {
    removeItemMutation.mutate(itemId);
  };

  const handleSendToKitchen = () => {
    if (!activeOrderId) return;
    confirmOrderMutation.mutate(activeOrderId);
  };

  const handleCompleteOrder = () => {
    if (!activeOrderId) return;
    completeOrderMutation.mutate(activeOrderId);
  };

  const finalizeSepayPayment = async (orderId: string, amount: number) => {
    try {
      if (amount > 0) {
        const pay = await paymentApi
          .createPayment(orderId, {
            paymentMethod: PaymentMethod.QrPayment,
            amount,
            provider: "SePay",
            note: `Thanh toán VietQR SePay Bàn ${selectedTable?.tableNumber || "Mang về"}`,
          })
          .catch((err) => {
            console.warn("Lỗi lưu phiếu thu SePay:", err);
            return null;
          });
        if (pay?.id) {
          await paymentApi.completePayment(pay.id).catch(() => {});
        }
      }

      const updated = await posApi.completeOrder(orderId);
      const tableId = selectedTable?.id || updated.diningTableId || activeOrder?.diningTableId;
      if (tableId) {
        queryClient.setQueryData<DiningTable[]>(["pos-tables", branchId], (prev) =>
          prev
            ? prev.map((t) => (t.id === tableId ? { ...t, status: TableStatus.Available } : t))
            : []
        );
      }
      queryClient.setQueryData<OrderListItem[]>(["pos-orders", branchId], (prev) =>
        prev ? prev.map((o) => (o.id === updated.id ? { ...o, status: OrderStatus.Completed } : o)) : []
      );
      queryClient.removeQueries({ queryKey: ["pos-order", orderId] });

      queryClient.invalidateQueries({ queryKey: ["pos-orders", branchId] });
      queryClient.invalidateQueries({ queryKey: ["pos-tables", branchId] });
      queryClient.invalidateQueries({ queryKey: ["branch-orders", branchId] });
      queryClient.invalidateQueries({ queryKey: ["branch-payments", branchId] });
      showNotification(
        "success",
        `Thanh toán ${amount.toLocaleString("vi-VN")} ₫ thành công! Bàn đã được dọn trống.`
      );
    } catch (err) {
      console.error("Lỗi hoàn tất đơn SePay:", err);
      showNotification("error", getErrorMessage(err, "Có lỗi khi hoàn tất đơn hàng sau khi thanh toán."));
    } finally {
      setIsSepayLoading(false);
      handleBackToFloor();
    }
  };

  const handlePayWithSepay = async () => {
    if (!activeOrder) return;
    try {
      setIsSepayLoading(true);
      const mode = await submitSepayCheckout({
        orderId: activeOrder.id,
        orderNumber: activeOrder.orderNumber,
        amount: activeOrder.totalAmount,
        orderDescription: `Thanh toan don #${activeOrder.orderNumber}`,
        onPaid: ({ orderId, amount }) => finalizeSepayPayment(orderId, amount),
      });
      if (mode === "popup") setIsSepayLoading(false);
    } catch (err: unknown) {
      setIsSepayLoading(false);
      showNotification("error", getErrorMessage(err, "Không thể chuyển tới cổng SePay."));
    }
  };

  // Dự phòng: SePay quay lại cùng tab (khi trình duyệt chặn mở tab mới)
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (handleSepayPopupReturn()) return;
    const url = new URL(window.location.href);
    const sepayVerify = url.searchParams.get("sepay_verify") === "true";
    const sepaySuccess = url.searchParams.get("sepay_success") === "true";
    const invoice = url.searchParams.get("invoice");
    const orderId = url.searchParams.get("order_id");
    const amountStr = url.searchParams.get("amount");
    const amount = Number(amountStr) || 0;

    const cleanupUrl = () => {
      url.searchParams.delete("sepay_verify");
      url.searchParams.delete("sepay_success");
      url.searchParams.delete("sepay_popup");
      url.searchParams.delete("invoice");
      url.searchParams.delete("order_id");
      url.searchParams.delete("amount");
      window.history.replaceState({}, "", url.pathname);
    };

    if (invoice && orderId && (sepayVerify || sepaySuccess)) {
      fetch(`/api/sepay/status?invoiceNumber=${encodeURIComponent(invoice)}`)
        .then((r) => r.json())
        .then((res) => {
          if (res?.isPaid === true) {
            announcePaymentSuccess(amount);
            finalizeSepayPayment(orderId, amount);
          } else {
            showNotification("error", "Giao dịch SePay chưa hoàn tất hoặc khách đã thoát khỏi cổng quét mã.");
          }
        })
        .catch(() => {
          showNotification("error", "Không thể xác thực trạng thái giao dịch từ SePay.");
        })
        .finally(cleanupUrl);
    } else if (sepayVerify || sepaySuccess) {
      cleanupUrl();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [branchId, queryClient]);

  const handleCancelOrder = (reason: string) => {
    if (!activeOrderId) return;
    cancelOrderMutation.mutate({ orderId: activeOrderId, reason });
  };

  if (!branchId) {
    return (
      <EmptyState
        title="Chưa chọn chi nhánh"
        detail="Vui lòng chọn chi nhánh hoạt động ở thanh trên cùng để sử dụng POS."
      />
    );
  }

  const isLoading = areasLoading || tablesLoading || menuLoading;

  if (isLoading) {
    return <LoadingState fullscreen label="Đang tải dữ liệu Quán Bếp Nhậu..." />;
  }

  return (
    <div className="pos-root">
      {/* Toast Notification */}
      {notification && (
        <div
          className={`fixed top-6 right-6 z-[100] flex items-center gap-3 px-4 py-3 rounded-2xl border shadow-2xl backdrop-blur-xl animate-fade-in ${
            notification.type === "success"
              ? "bg-success-soft/95 text-emerald-200 border-emerald-500/50 shadow-[0_10px_30px_rgba(16,185,129,0.25)]"
              : "bg-danger-soft/95 text-rose-200 border-rose-500/50 shadow-[0_10px_30px_rgba(244,63,94,0.25)]"
          }`}
        >
          {notification.type === "success" ? (
            <CheckCircle size={20} className="text-emerald-400 shrink-0" />
          ) : (
            <AlertTriangle size={20} className="text-rose-400 shrink-0" />
          )}
          <span className="text-xs font-bold leading-snug">{notification.message}</span>
        </div>
      )}

      {/* Main Mode: Split View or Floor Plan */}
      {activeOrderId && activeOrder ? (
        <div className="flex flex-col gap-4 text-ink">
          {/* Subheader bar when inside an order */}
          <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-2xl bg-surface/90 backdrop-blur-md border border-line shadow-lg">
            <div className="flex items-center gap-3.5 flex-wrap">
              <button
                type="button"
                className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold text-ink-secondary hover:text-ink bg-raised hover:bg-surface-hover border border-line-strong transition-all cursor-pointer shadow-sm active:scale-95"
                onClick={handleBackToFloor}
              >
                <ArrowLeft size={15} />
                <span>Sơ đồ bàn</span>
              </button>

              <div className="flex items-center gap-2.5 flex-wrap">
                <span className="text-lg font-black text-ink tracking-tight flex items-center gap-1.5">
                  <Utensils size={18} className="text-orange-500" />
                  {activeOrder.orderType === OrderType.DineIn
                    ? selectedTable
                      ? `Bàn ${selectedTable.tableNumber}`
                      : "Bàn ăn"
                    : "Đơn Mang về"}
                </span>

                <span className="text-subtle">•</span>

                <span className="text-xs font-mono text-muted bg-well px-2.5 py-1 rounded-lg border border-line">
                  Mã đơn: #{activeOrder.orderNumber.length > 14 ? activeOrder.orderNumber.slice(-8) : activeOrder.orderNumber}
                </span>

                {activeOrder.status === OrderStatus.Confirmed ||
                activeOrder.status === OrderStatus.Preparing ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-500/15 text-amber-300 border border-amber-500/30">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                    Đã chuyển bếp
                  </span>
                ) : activeOrder.status === OrderStatus.Ready ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    Món đã xong
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-sky-500/15 text-sky-300 border border-sky-500/30">
                    <span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-ping" />
                    Đang chọn món
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2.5">
              {activeOrder.status === OrderStatus.Open && (
                <button
                  type="button"
                  disabled={activeOrder.items.length === 0 || confirmOrderMutation.isPending}
                  onClick={handleSendToKitchen}
                  className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm text-white bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600 hover:from-orange-400 hover:to-amber-500 shadow-md shadow-orange-500/25 active:scale-95 transition-all disabled:opacity-50 cursor-pointer"
                >
                  <span>{confirmOrderMutation.isPending ? "Đang gửi..." : "Gửi bếp ngay"}</span>
                </button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
            {/* Left: Menu & Product Selection */}
            <div className="lg:col-span-7 xl:col-span-8">
              {menu ? (
                <MenuSelector menu={menu} onAddItem={handleAddItem} />
              ) : (
                <EmptyState
                  title="Thực đơn trống"
                  detail="Chưa có món ăn nào được cấu hình cho chi nhánh này."
                />
              )}
            </div>

            {/* Right: Order Ticket / Cart */}
            <div className="lg:col-span-5 xl:col-span-4">
              <OrderTicket
                order={activeOrder}
                tableName={selectedTable ? `Bàn ${selectedTable.tableNumber}` : undefined}
                isSendingToKitchen={confirmOrderMutation.isPending}
                isProcessing={
                  addItemMutation.isPending ||
                  updateItemMutation.isPending ||
                  removeItemMutation.isPending ||
                  completeOrderMutation.isPending ||
                  cancelOrderMutation.isPending
                }
                onSendToKitchen={handleSendToKitchen}
                onCompleteOrder={handleCompleteOrder}
                isSepayLoading={isSepayLoading}
                onPayWithSepay={handlePayWithSepay}
                onCancelOrder={handleCancelOrder}
                onUpdateItemQuantity={handleUpdateItemQuantity}
                onRemoveItem={handleRemoveItem}
                onBackToFloor={handleBackToFloor}
              />
            </div>
          </div>
        </div>
      ) : (
        <div className="pos-floor-container">
          <div className="pos-page-title-row flex items-center justify-between gap-4">
            <div>
              <div className="eyebrow">{currentBranch?.name ?? "Chi nhánh"}</div>
              <h2>Điểm bán hàng (POS) &amp; Sơ đồ bàn</h2>
              <p className="pos-subtext">
                Chọn bàn để mở đơn món, hoặc tạo đơn mang về phục vụ khách.
              </p>
            </div>
            <Link
              href="/tables"
              className="px-3.5 py-2 bg-surface-hover hover:bg-surface-hover text-amber-400 hover:text-amber-300 border border-amber-500/30 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm shrink-0"
            >
              <Grid3X3 size={15} />
              <span>Quản lý Bàn &amp; Mã QR</span>
            </Link>
          </div>

          <TableFloorPlan
            areas={areas}
            tables={tables}
            orders={orders}
            onSelectTable={handleSelectTable}
            onCreateTakeaway={handleCreateTakeaway}
          />
        </div>
      )}

      {/* New Order Modal */}
      {newOrderModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-200"
          onClick={() => setNewOrderModalOpen(false)}
        >
          <div
            className="relative w-full max-w-lg bg-surface border border-line rounded-3xl shadow-2xl overflow-hidden transition-all text-ink animate-in zoom-in-95 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Ambient Top Gradient Accent Line */}
            <div
              className={`h-1.5 w-full bg-gradient-to-r ${
                isTakeawayNewOrder
                  ? "from-emerald-500 via-teal-500 to-cyan-500"
                  : "from-orange-500 via-amber-500 to-yellow-500"
              }`}
            />

            {/* Modal Header */}
            <div className="px-6 pt-5 pb-4 flex items-start justify-between border-b border-line/60">
              <div className="flex items-center gap-3.5">
                <div
                  className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-md ${
                    isTakeawayNewOrder
                      ? "bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-emerald-500/20"
                      : "bg-gradient-to-br from-orange-500 to-amber-600 text-white shadow-orange-500/20"
                  }`}
                >
                  {isTakeawayNewOrder ? <ShoppingBag size={24} /> : <UtensilsCrossed size={24} />}
                </div>
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[11px] font-black tracking-wide uppercase ${
                        isTakeawayNewOrder
                          ? "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20"
                          : "bg-orange-500/10 text-orange-600 dark:text-orange-400 border border-orange-500/20"
                      }`}
                    >
                      {isTakeawayNewOrder ? "Đơn mang về" : `Bàn ${targetTableForNewOrder?.tableNumber}`}
                    </span>
                    {!isTakeawayNewOrder && (
                      <span className="text-[11px] font-semibold text-muted bg-surface-raised px-2 py-0.5 rounded-full border border-line">
                        {areas.find((a) => a.id === targetTableForNewOrder?.areaId)?.name || "Khu vực chung"}
                      </span>
                    )}
                  </div>
                  <h3 className="text-lg font-bold text-ink">
                    {isTakeawayNewOrder ? "Tạo đơn mang về mới" : "Mở bàn & Tạo đơn mới"}
                  </h3>
                </div>
              </div>

              <button
                type="button"
                className="p-2 text-muted hover:text-ink hover:bg-surface-raised rounded-xl transition-all"
                onClick={() => setNewOrderModalOpen(false)}
                aria-label="Đóng"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 space-y-5">
              {/* Dine-in Table Info & Guest Stepper */}
              {!isTakeawayNewOrder && targetTableForNewOrder && (
                <div className="bg-sunken border border-line rounded-2xl p-4 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-600 dark:text-emerald-400">
                          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                          Bàn sẵn sàng phục vụ
                        </span>
                        <span className="text-xs text-muted">•</span>
                        <span className="text-xs text-muted font-medium">
                          Sức chứa {targetTableForNewOrder.capacity} chỗ
                        </span>
                      </div>
                      <p className="text-xs text-muted">Số lượng khách dùng bữa tại bàn:</p>
                    </div>

                    {/* Stepper */}
                    <div className="flex items-center bg-surface border border-line rounded-xl p-1 shadow-inner self-start sm:self-auto">
                      <button
                        type="button"
                        onClick={() => setGuestCount((c) => Math.max(1, c - 1))}
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-muted hover:text-ink hover:bg-surface-raised active:scale-95 transition-all"
                        aria-label="Giảm khách"
                      >
                        <Minus size={14} />
                      </button>
                      <div className="px-3 min-w-[70px] text-center">
                        <span className="text-sm font-black text-ink">{guestCount}</span>
                        <span className="text-[10px] text-muted ml-1 font-medium">khách</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => setGuestCount((c) => c + 1)}
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-muted hover:text-ink hover:bg-surface-raised active:scale-95 transition-all"
                        aria-label="Tăng khách"
                      >
                        <Plus size={14} />
                      </button>
                    </div>
                  </div>

                  {/* Preset quick buttons */}
                  <div className="flex items-center gap-1.5 pt-1 border-t border-line/40">
                    <span className="text-[11px] text-muted font-medium mr-1 flex items-center gap-1">
                      <Users size={12} /> Nhanh:
                    </span>
                    {[1, 2, 4, 6, 8, 10].map((num) => (
                      <button
                        key={num}
                        type="button"
                        onClick={() => setGuestCount(num)}
                        className={`text-xs px-2.5 py-1 rounded-lg font-bold transition-all ${
                          guestCount === num
                            ? "bg-orange-500 text-white shadow-sm"
                            : "bg-surface hover:bg-surface-raised border border-line text-muted hover:text-ink"
                        }`}
                      >
                        {num}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Guest Name Field */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold uppercase tracking-wider text-muted flex items-center gap-1.5">
                    <User size={14} className="text-orange-500" />
                    <span>Tên khách hàng / Ghi nhận</span>
                  </label>
                  <span className="text-[11px] text-muted italic">Không bắt buộc</span>
                </div>
                <div className="relative">
                  <input
                    type="text"
                    className="w-full bg-surface border border-line rounded-xl px-4 py-2.5 text-sm font-medium text-ink placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all shadow-sm"
                    placeholder="VD: Anh Nam, Chị Lan, Bàn VIP..."
                    value={guestName}
                    onChange={(e) => setGuestName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleConfirmNewOrder();
                      }
                    }}
                    autoFocus
                  />
                </div>
                {/* Quick Chips for Guest Name */}
                <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                  <span className="text-[11px] text-muted font-medium mr-1 flex items-center gap-1">
                    <Sparkles size={11} className="text-amber-500" /> Gợi ý:
                  </span>
                  {["Khách quen", "Khách VIP", "Khách đoàn", "Đặt trước"].map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => setGuestName((prev) => (prev ? `${prev} - ${tag}` : tag))}
                      className="text-xs px-2.5 py-1 rounded-lg bg-surface-raised hover:bg-orange-500/10 hover:text-orange-600 dark:hover:text-orange-400 hover:border-orange-500/30 border border-line text-muted font-medium transition-all active:scale-95"
                    >
                      +{tag}
                    </button>
                  ))}
                </div>
              </div>

              {/* Service Notes Field */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold uppercase tracking-wider text-muted flex items-center gap-1.5">
                    <FileText size={14} className="text-amber-500" />
                    <span>Ghi chú phục vụ bếp &amp; Pha chế</span>
                  </label>
                  <span className="text-[11px] text-muted italic">Gửi bếp / bar</span>
                </div>
                <div className="relative">
                  <input
                    type="text"
                    className="w-full bg-surface border border-line rounded-xl px-4 py-2.5 text-sm font-medium text-ink placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all shadow-sm"
                    placeholder="VD: Ít đá, không cay, chuẩn bị dĩa riêng..."
                    value={orderNotes}
                    onChange={(e) => setOrderNotes(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleConfirmNewOrder();
                      }
                    }}
                  />
                </div>
                {/* Quick kitchen chips */}
                <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                  <span className="text-[11px] text-muted font-medium mr-1">Yêu cầu:</span>
                  {["Ít đá", "Không cay", "Lên món nhanh", "Mang về sau", "Ưu tiên trẻ em"].map((noteTag) => (
                    <button
                      key={noteTag}
                      type="button"
                      onClick={() => {
                        setOrderNotes((prev) => (prev ? `${prev}, ${noteTag}` : noteTag));
                      }}
                      className="text-xs px-2.5 py-1 rounded-lg bg-surface-raised hover:bg-amber-500/10 hover:text-amber-600 dark:hover:text-amber-400 hover:border-amber-500/30 border border-line text-muted font-medium transition-all active:scale-95"
                    >
                      +{noteTag}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 bg-sunken/60 border-t border-line flex items-center justify-between gap-3">
              <button
                type="button"
                className="px-5 py-2.5 rounded-xl text-sm font-bold text-muted hover:text-ink hover:bg-surface-raised border border-line/60 transition-all active:scale-95"
                onClick={() => setNewOrderModalOpen(false)}
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                disabled={createOrderMutation.isPending}
                onClick={handleConfirmNewOrder}
                className="px-6 py-2.5 rounded-xl text-sm font-black text-white bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 active:scale-95 shadow-lg shadow-orange-500/25 hover:shadow-orange-500/35 transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <PlusCircle size={18} />
                <span>{createOrderMutation.isPending ? "Đang tạo đơn..." : "Bắt đầu chọn món"}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
