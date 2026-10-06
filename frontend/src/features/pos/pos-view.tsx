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
import { announcePaymentSuccess } from "@/lib/audio/payment-sound";
import { submitSepayCheckout } from "@/lib/sepay/checkout-redirect";
import { TableFloorPlan } from "./table-floor-plan";
import { MenuSelector } from "./menu-selector";
import { OrderTicket } from "./order-ticket";
import { LoadingState, EmptyState } from "@/components/feedback/states";
import Link from "next/link";
import {
  ArrowLeft,
  CheckCircle,
  AlertTriangle,
  Utensils,
  PlusCircle,
  X,
  Grid3X3,
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
    refetchInterval: 15000,
  });

  const { data: activeOrder } = useQuery({
    queryKey: ["pos-order", activeOrderId],
    queryFn: () => (activeOrderId ? posApi.getOrder(activeOrderId) : Promise.resolve(null)),
    enabled: Boolean(activeOrderId),
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
    mutationFn: (orderId: string) =>
      posApi.completeOrder(orderId, activeOrder?.version),
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

      queryClient.invalidateQueries({ queryKey: ["pos-orders", branchId] });
      queryClient.invalidateQueries({ queryKey: ["pos-tables", branchId] });
      queryClient.invalidateQueries({ queryKey: ["branch-orders", branchId] });

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

  const cancelOrderMutation = useMutation({
    mutationFn: (vars: { orderId: string; reason: string }) =>
      posApi.cancelOrder(vars.orderId, {
        reason: vars.reason,
        expectedVersion: activeOrder?.version,
      }),
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
      (o) =>
        o.diningTableId === table.id &&
        o.status !== OrderStatus.Completed &&
        o.status !== OrderStatus.Cancelled
    );

    if (tableActiveOrder) {
      setActiveOrderId(tableActiveOrder.id);
    } else {
      // Table is available or needs a new order
      setTargetTableForNewOrder(table);
      setIsTakeawayNewOrder(false);
      setNewOrderModalOpen(true);
    }
  };

  const handleCreateTakeaway = () => {
    setSelectedTable(null);
    setTargetTableForNewOrder(null);
    setIsTakeawayNewOrder(true);
    setNewOrderModalOpen(true);
  };

  const handleConfirmNewOrder = () => {
    if (!branchId) return;

    if (isTakeawayNewOrder) {
      createOrderMutation.mutate({
        branchId,
        orderType: OrderType.Takeaway,
        diningTableId: null,
        customerNameSnapshot: guestName.trim() || undefined,
        notes: orderNotes.trim() || undefined,
      });
    } else if (targetTableForNewOrder) {
      createOrderMutation.mutate({
        branchId,
        orderType: OrderType.DineIn,
        diningTableId: targetTableForNewOrder.id,
        customerNameSnapshot: guestName.trim() || undefined,
        notes: orderNotes.trim() || undefined,
      });
    }
  };

  const handleBackToFloor = () => {
    setActiveOrderId(null);
    setSelectedTable(null);
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

  const handlePayWithSepay = async () => {
    if (!activeOrder) return;
    try {
      setIsSepayLoading(true);
      await submitSepayCheckout({
        orderId: activeOrder.id,
        orderNumber: activeOrder.orderNumber,
        amount: activeOrder.totalAmount,
        orderDescription: `Thanh toan don #${activeOrder.orderNumber}`,
      });
    } catch (err: unknown) {
      setIsSepayLoading(false);
      showNotification("error", getErrorMessage(err, "Không thể chuyển tới cổng SePay."));
    }
  };

  // Tự động xử lý khi SePay thanh toán thành công và quay lại /pos
  useEffect(() => {
    if (typeof window === "undefined") return;
    const url = new URL(window.location.href);
    const sepaySuccess = url.searchParams.get("sepay_success");
    const orderId = url.searchParams.get("order_id");
    const amountStr = url.searchParams.get("amount");

    if (sepaySuccess === "true" && orderId) {
      const amount = Number(amountStr) || 0;
      announcePaymentSuccess(amount);

      posApi
        .completeOrder(orderId)
        .then((updated) => {
          const tableId = updated.diningTableId;
          if (tableId) {
            queryClient.setQueryData<DiningTable[]>(["pos-tables", branchId], (prev) =>
              prev
                ? prev.map((t) => (t.id === tableId ? { ...t, status: TableStatus.Available } : t))
                : []
            );
          }
          queryClient.invalidateQueries({ queryKey: ["pos-orders", branchId] });
          queryClient.invalidateQueries({ queryKey: ["pos-tables", branchId] });
          queryClient.invalidateQueries({ queryKey: ["branch-orders", branchId] });
          showNotification(
            "success",
            `Thanh toán ${amount.toLocaleString("vi-VN")} ₫ thành công! Bàn đã được dọn trống.`
          );
        })
        .catch((err) => {
          console.error("Lỗi hoàn tất đơn SePay:", err);
        });

      url.searchParams.delete("sepay_success");
      url.searchParams.delete("order_id");
      url.searchParams.delete("amount");
      window.history.replaceState({}, "", url.pathname);
    }
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
              ? "bg-[#0d2218]/95 text-emerald-200 border-emerald-500/50 shadow-[0_10px_30px_rgba(16,185,129,0.25)]"
              : "bg-[#280f14]/95 text-rose-200 border-rose-500/50 shadow-[0_10px_30px_rgba(244,63,94,0.25)]"
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
        <div className="flex flex-col gap-4 text-gray-100">
          {/* Subheader bar when inside an order */}
          <div className="flex flex-wrap items-center justify-between gap-4 p-4 rounded-2xl bg-[#141822]/90 backdrop-blur-md border border-[#252c3c] shadow-lg">
            <div className="flex items-center gap-3.5 flex-wrap">
              <button
                type="button"
                className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold text-gray-300 hover:text-white bg-[#1c2230] hover:bg-[#252c3e] border border-[#2e374c] transition-all cursor-pointer shadow-sm active:scale-95"
                onClick={handleBackToFloor}
              >
                <ArrowLeft size={15} />
                <span>Sơ đồ bàn</span>
              </button>

              <div className="flex items-center gap-2.5 flex-wrap">
                <span className="text-lg font-black text-white tracking-tight flex items-center gap-1.5">
                  <Utensils size={18} className="text-orange-500" />
                  {activeOrder.orderType === OrderType.DineIn
                    ? selectedTable
                      ? `Bàn ${selectedTable.tableNumber}`
                      : "Bàn ăn"
                    : "Đơn Mang về"}
                </span>

                <span className="text-gray-500">•</span>

                <span className="text-xs font-mono text-gray-400 bg-[#10131a] px-2.5 py-1 rounded-lg border border-[#252c3c]">
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
              className="px-3.5 py-2 bg-[#252a35] hover:bg-[#2e3442] text-amber-400 hover:text-amber-300 border border-amber-500/30 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-sm shrink-0"
            >
              <Grid3X3 size={15} />
              <span>Quản lý Bàn &amp; Mã QR</span>
            </Link>
          </div>

          <TableFloorPlan
            areas={areas}
            tables={tables}
            onSelectTable={handleSelectTable}
            onCreateTakeaway={handleCreateTakeaway}
          />
        </div>
      )}

      {/* New Order Modal */}
      {newOrderModalOpen && (
        <div className="pos-modal-backdrop" onClick={() => setNewOrderModalOpen(false)}>
          <div className="pos-modal-card pos-modal-sm" onClick={(e) => e.stopPropagation()}>
            <div className="pos-modal-header">
              <div>
                <div className="eyebrow">
                  {isTakeawayNewOrder ? "Mang về" : `Bàn ${targetTableForNewOrder?.tableNumber}`}
                </div>
                <h3>Tạo đơn hàng mới</h3>
              </div>
              <button
                type="button"
                className="icon-button"
                onClick={() => setNewOrderModalOpen(false)}
                aria-label="Đóng"
              >
                <X size={18} />
              </button>
            </div>

            <div className="pos-modal-body">
              {!isTakeawayNewOrder && targetTableForNewOrder && (
                <div className="pos-modal-table-summary">
                  <Utensils size={18} className="text-green" />
                  <span>
                    Bàn số <strong>{targetTableForNewOrder.tableNumber}</strong> (Sức chứa:{" "}
                    {targetTableForNewOrder.capacity} khách)
                  </span>
                </div>
              )}

              <div className="pos-form-field">
                <label className="pos-section-title">Tên khách / Ghi nhận</label>
                <input
                  type="text"
                  className="pos-input"
                  placeholder="VD: Anh Nam, Khách quen..."
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                  autoFocus
                />
              </div>

              <div className="pos-form-field">
                <label className="pos-section-title">Ghi chú phục vụ</label>
                <input
                  type="text"
                  className="pos-input"
                  placeholder="VD: Khách VIP, đặt trước nước suối..."
                  value={orderNotes}
                  onChange={(e) => setOrderNotes(e.target.value)}
                />
              </div>
            </div>

            <div className="pos-modal-footer">
              <button
                type="button"
                className="secondary-button"
                onClick={() => setNewOrderModalOpen(false)}
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                className="primary-button"
                disabled={createOrderMutation.isPending}
                onClick={handleConfirmNewOrder}
              >
                <PlusCircle size={16} />
                {createOrderMutation.isPending ? "Đang tạo đơn..." : "Bắt đầu chọn món"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
