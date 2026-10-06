"use client";

import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { posApi } from "@/lib/api/pos-api";
import { paymentApi } from "@/lib/api/payment-api";
import { useBranch } from "@/features/branches/branch-provider";
import { OrderStatus, OrderType } from "@/types/pos";
import { PaymentMethod } from "@/types/payments";
import { LoadingState, EmptyState } from "@/components/feedback/states";
import {
  Package,
  Search,
  CheckCircle2,
  AlertCircle,
  Printer,
  CreditCard,
  X,
  Flame,
  Ban,
  QrCode,
} from "lucide-react";
import { announcePaymentSuccess } from "@/lib/audio/payment-sound";
import { handleSepayPopupReturn, submitSepayCheckout } from "@/lib/sepay/checkout-redirect";
import { useEffect } from "react";

export function OrdersView() {
  const { branchId, currentBranch } = useBranch();
  const queryClient = useQueryClient();

  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [paymentModalOpen, setPaymentModalOpen] = useState(false);
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(PaymentMethod.Cash);
  const [tenderedAmount, setTenderedAmount] = useState<number>(0);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 4000);
  };

  const finalizeSepayPayment = (orderId: string, amount: number) => {
    paymentApi
      .createPayment(orderId, {
        paymentMethod: PaymentMethod.QrPayment,
        amount: amount,
      })
      .then(() => posApi.completeOrder(orderId))
      .then(() => {
        queryClient.invalidateQueries({ queryKey: ["branch-orders", branchId] });
        queryClient.invalidateQueries({ queryKey: ["pos-tables", branchId] });
        showToast(`Thanh toán ${amount.toLocaleString("vi-VN")} ₫ thành công! Bàn đã dọn trống.`);
      })
      .catch((err) => {
        console.error("Lỗi hoàn tất đơn SePay:", err);
      });
  };

  // Dự phòng: SePay quay lại cùng tab (khi trình duyệt chặn mở tab mới)
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (handleSepayPopupReturn()) return;
    const url = new URL(window.location.href);
    const sepaySuccess = url.searchParams.get("sepay_success");
    const orderId = url.searchParams.get("order_id");
    const amountStr = url.searchParams.get("amount");

    if (sepaySuccess === "true" && orderId) {
      const amount = Number(amountStr) || 0;
      announcePaymentSuccess(amount);
      finalizeSepayPayment(orderId, amount);

      url.searchParams.delete("sepay_success");
      url.searchParams.delete("order_id");
      url.searchParams.delete("amount");
      window.history.replaceState({}, "", url.pathname);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [branchId, queryClient]);

  const { data: tables = [] } = useQuery({
    queryKey: ["pos-tables", branchId],
    queryFn: () => (branchId ? posApi.getTables(branchId) : Promise.resolve([])),
    enabled: Boolean(branchId),
  });

  const tableMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const t of tables) {
      map.set(t.id, `Bàn ${t.tableNumber}`);
    }
    return map;
  }, [tables]);

  const { data: orders = [], isLoading: ordersLoading } = useQuery({
    queryKey: ["branch-orders", branchId],
    queryFn: () => (branchId ? posApi.getBranchOrders(branchId) : Promise.resolve([])),
    enabled: Boolean(branchId),
    refetchInterval: 10000,
  });

  const { data: activeOrder, isLoading: orderDetailLoading } = useQuery({
    queryKey: ["order-detail", selectedOrderId],
    queryFn: () => (selectedOrderId ? posApi.getOrder(selectedOrderId) : Promise.resolve(null)),
    enabled: Boolean(selectedOrderId),
  });

  // Cancel mutation
  const cancelMutation = useMutation({
    mutationFn: (vars: { orderId: string; reason: string }) =>
      posApi.cancelOrder(vars.orderId, {
        reason: vars.reason,
        expectedVersion: activeOrder?.version,
      }),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ["branch-orders", branchId] });
      queryClient.setQueryData(["order-detail", updated.id], updated);
      showToast(`Đã hủy đơn #${updated.orderNumber}.`);
      setCancelModalOpen(false);
      setCancelReason("");
    },
    onError: (err: unknown) => {
      showToast(err instanceof Error ? err.message : "Không thể hủy đơn hàng.");
    },
  });

  // Pay mutation
  const payMutation = useMutation({
    mutationFn: async () => {
      if (!activeOrder) return;
      await paymentApi.createPayment(activeOrder.id, {
        paymentMethod,
        amount: activeOrder.totalAmount,
        tenderedAmount: paymentMethod === PaymentMethod.Cash ? tenderedAmount || activeOrder.totalAmount : undefined,
      });
      await posApi.completeOrder(activeOrder.id, activeOrder.version);
    },
    onSuccess: () => {
      if (activeOrder) {
        announcePaymentSuccess(activeOrder.totalAmount);
      }
      queryClient.invalidateQueries({ queryKey: ["branch-orders", branchId] });
      queryClient.invalidateQueries({ queryKey: ["pos-tables", branchId] });
      if (selectedOrderId) {
        queryClient.invalidateQueries({ queryKey: ["order-detail", selectedOrderId] });
      }
      showToast(`Thanh toán đơn hàng thành công!`);
      setPaymentModalOpen(false);
    },
    onError: (err: unknown) => {
      showToast(err instanceof Error ? err.message : "Lỗi xử lý thanh toán.");
    },
  });

  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      if (statusFilter !== "all" && o.status !== Number(statusFilter)) return false;
      if (typeFilter !== "all" && o.orderType !== Number(typeFilter)) return false;
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const matchNum = o.orderNumber.toLowerCase().includes(term);
        const tableName = o.diningTableId ? tableMap.get(o.diningTableId) : "";
        const matchTable = tableName ? tableName.toLowerCase().includes(term) : false;
        if (!matchNum && !matchTable) return false;
      }
      return true;
    });
  }, [orders, statusFilter, typeFilter, searchTerm, tableMap]);

  const stats = useMemo(() => {
    const total = orders.length;
    const active = orders.filter(
      (o) =>
        o.status === OrderStatus.Open ||
        o.status === OrderStatus.Confirmed ||
        o.status === OrderStatus.Preparing ||
        o.status === OrderStatus.Ready
    ).length;
    const completed = orders.filter((o) => o.status === OrderStatus.Completed).length;
    const cancelled = orders.filter((o) => o.status === OrderStatus.Cancelled).length;
    const totalRevenue = orders
      .filter((o) => o.status === OrderStatus.Completed)
      .reduce((sum, o) => sum + (o.totalAmount || 0), 0);
    return { total, active, completed, cancelled, totalRevenue };
  }, [orders]);

  const getStatusBadge = (status: OrderStatus) => {
    switch (status) {
      case OrderStatus.Open:
        return <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-amber-950/70 text-amber-300 border border-amber-800/60">Mới tạo</span>;
      case OrderStatus.Confirmed:
        return <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-sky-950/70 text-sky-300 border border-sky-800/60">Chờ bếp</span>;
      case OrderStatus.Preparing:
        return <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-orange-950/70 text-orange-300 border border-orange-800/60 flex items-center gap-1"><Flame size={11} /> Đang nấu</span>;
      case OrderStatus.Ready:
        return <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-teal-950/70 text-teal-300 border border-teal-800/60">Đã lên món</span>;
      case OrderStatus.Completed:
        return <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-950/70 text-emerald-300 border border-emerald-800/60">Đã thanh toán</span>;
      case OrderStatus.Cancelled:
        return <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-rose-950/70 text-rose-300 border border-rose-800/60">Đã hủy</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-gray-800 text-gray-300">Đơn hàng</span>;
    }
  };

  const handlePrintBill = () => {
    window.print();
  };

  if (!branchId) {
    return <EmptyState title="Chưa chọn chi nhánh" detail="Vui lòng chọn chi nhánh ở thanh trên cùng để xem đơn hàng." />;
  }

  if (ordersLoading) {
    return <LoadingState fullscreen label="Đang tải dữ liệu Quán Bếp Nhậu..." />;
  }

  return (
    <div className="flex flex-col gap-5">
      {/* Toast */}
      {toastMessage && (
        <div className="fixed top-20 right-6 z-50 bg-[#1c2e24] border border-emerald-600 text-emerald-100 px-4 py-3 rounded-xl shadow-2xl flex items-center gap-2 text-xs font-bold animate-in fade-in slide-in-from-top-4">
          <CheckCircle2 size={16} className="text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Top Stats Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-[#1c1e22] border border-[#2d3138] rounded-2xl p-4 flex flex-col justify-between">
          <span className="text-xs text-gray-400 font-medium">Tổng đơn hôm nay</span>
          <span className="text-2xl font-black text-white font-mono mt-1">{stats.total}</span>
        </div>
        <div className="bg-[#1c1e22] border border-[#2d3138] rounded-2xl p-4 flex flex-col justify-between">
          <span className="text-xs text-amber-400 font-medium">Đang phục vụ</span>
          <span className="text-2xl font-black text-amber-300 font-mono mt-1">{stats.active}</span>
        </div>
        <div className="bg-[#1c1e22] border border-[#2d3138] rounded-2xl p-4 flex flex-col justify-between">
          <span className="text-xs text-emerald-400 font-medium">Đã thanh toán</span>
          <span className="text-2xl font-black text-emerald-300 font-mono mt-1">{stats.completed}</span>
        </div>
        <div className="bg-[#1c1e22] border border-[#2d3138] rounded-2xl p-4 flex flex-col justify-between">
          <span className="text-xs text-gray-400 font-medium">Doanh thu hoàn tất</span>
          <span className="text-xl sm:text-2xl font-black text-[#fef3c7] font-mono mt-1">
            {stats.totalRevenue.toLocaleString("vi-VN")} đ
          </span>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-[#1a1c1e] border border-[#2d3035] p-3 sm:p-4 rounded-2xl flex flex-wrap items-center justify-between gap-3 shadow-md">
        <div className="flex flex-wrap items-center gap-2 sm:gap-3 flex-1 min-w-[260px]">
          {/* Search Box */}
          <div className="relative flex-1 min-w-[180px] max-w-xs">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Tìm theo số bàn, mã đơn..."
              className="w-full pl-9 pr-3 py-1.5 bg-[#22252b] border border-[#383d47] rounded-xl text-xs text-white placeholder-gray-500 focus:outline-none focus:border-amber-500"
            />
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-[#22252b] border border-[#383d47] text-gray-200 text-xs rounded-xl px-3 py-1.5 font-bold focus:outline-none"
          >
            <option value="all">Tất cả trạng thái</option>
            <option value={OrderStatus.Open}>Mới tạo</option>
            <option value={OrderStatus.Confirmed}>Chờ bếp</option>
            <option value={OrderStatus.Preparing}>Đang nấu</option>
            <option value={OrderStatus.Ready}>Đã lên món</option>
            <option value={OrderStatus.Completed}>Đã thanh toán</option>
            <option value={OrderStatus.Cancelled}>Đã hủy</option>
          </select>

          {/* Type Filter */}
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="bg-[#22252b] border border-[#383d47] text-gray-200 text-xs rounded-xl px-3 py-1.5 font-bold focus:outline-none"
          >
            <option value="all">Tất cả loại đơn</option>
            <option value={OrderType.DineIn}>Tại bàn</option>
            <option value={OrderType.Takeaway}>Mang về</option>
            <option value={OrderType.Delivery}>Giao hàng</option>
          </select>
        </div>

        <span className="text-xs text-gray-400 font-mono">
          Hiển thị <strong>{filteredOrders.length}</strong> / {orders.length} đơn
        </span>
      </div>

      {/* Orders Table List */}
      <div className="bg-[#1c1e22] border border-[#2d3138] rounded-2xl overflow-hidden shadow-lg">
        {filteredOrders.length === 0 ? (
          <div className="p-12 text-center text-gray-400 flex flex-col items-center gap-2">
            <Package size={36} className="text-gray-500 mb-1" />
            <span className="text-sm font-bold text-gray-300">Không có đơn hàng nào</span>
            <span className="text-xs text-gray-500">Thử thay đổi bộ lọc hoặc tạo đơn mới từ màn hình POS.</span>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-[#17181c] border-b border-[#2d3138] text-gray-400 uppercase tracking-wider font-extrabold text-[10px]">
                  <th className="py-3 px-4">Mã Đơn</th>
                  <th className="py-3 px-4">Bàn / Loại</th>
                  <th className="py-3 px-4">Thời Gian</th>
                  <th className="py-3 px-4">Tổng Tiền</th>
                  <th className="py-3 px-4">Trạng Thái</th>
                  <th className="py-3 px-4 text-right">Thao Tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#282b33]">
                {filteredOrders.map((order) => {
                  const isTakeaway = order.orderType === OrderType.Takeaway;
                  const tableName = order.diningTableId ? tableMap.get(order.diningTableId) : null;
                  return (
                    <tr
                      key={order.id}
                      className="hover:bg-[#23262e] transition-colors cursor-pointer group"
                      onClick={() => setSelectedOrderId(order.id)}
                    >
                      <td className="py-3 px-4 font-mono font-bold text-white group-hover:text-amber-400">
                        #{order.orderNumber}
                      </td>
                      <td className="py-3 px-4 font-semibold text-gray-200">
                        {isTakeaway ? (
                          <span className="text-amber-400">Mang về</span>
                        ) : (
                          <span>{tableName ?? "Tại bàn"}</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-gray-400 font-mono">
                        {new Date(order.createdAt).toLocaleTimeString("vi-VN", {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>
                      <td className="py-3 px-4 font-mono font-bold text-[#fef3c7]">
                        {order.totalAmount.toLocaleString("vi-VN")} đ
                      </td>
                      <td className="py-3 px-4">
                        {getStatusBadge(order.status)}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          type="button"
                          className="px-2.5 py-1 rounded-lg bg-[#2b2f3a] hover:bg-amber-500 hover:text-black font-bold text-gray-200 transition-colors"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedOrderId(order.id);
                          }}
                        >
                          Chi tiết
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Order Detail Modal / Invoice Drawer */}
      {selectedOrderId && (
        <div
          className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5"
          onClick={() => setSelectedOrderId(null)}
        >
          <div
            className="bg-[#1c1e22] border border-[#383d47] rounded-2xl w-full max-w-xl max-h-[92vh] overflow-y-auto shadow-2xl flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {orderDetailLoading || !activeOrder ? (
              <div className="p-12">
                <LoadingState label="Đang tải chi tiết đơn hàng..." />
              </div>
            ) : (
              <>
                {/* Modal Header */}
                <div className="flex items-center justify-between p-4 sm:p-5 border-b border-[#2d3138]">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-xl">
                      🧾
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h2 className="text-base font-bold text-white font-mono">
                          ĐƠN HÀNG #{activeOrder.orderNumber}
                        </h2>
                        {getStatusBadge(activeOrder.status)}
                      </div>
                      <span className="text-xs text-gray-400">
                        {activeOrder.diningTableId && tableMap.has(activeOrder.diningTableId)
                          ? tableMap.get(activeOrder.diningTableId)
                          : activeOrder.orderType === OrderType.Takeaway
                          ? "Đơn mang về"
                          : "Tại bàn"}{" "}
                        •{" "}
                        {new Date(activeOrder.createdAt).toLocaleTimeString("vi-VN", {
                          hour: "2-digit",
                          minute: "2-digit",
                          second: "2-digit",
                        })}
                      </span>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="icon-button"
                    onClick={() => setSelectedOrderId(null)}
                    aria-label="Đóng"
                  >
                    <X size={18} />
                  </button>
                </div>

                {/* Bill Paper View */}
                <div className="p-4 sm:p-5 flex flex-col gap-4 font-sans">
                  {/* Quán Bếp Nhậu Header */}
                  <div className="text-center pb-3 border-b border-dashed border-[#383d47]">
                    <span className="text-sm font-black tracking-wider text-amber-400 uppercase font-heading">
                      🔥 QUÁN BẾP NHẬU 🍺
                    </span>
                    <p className="text-[11px] text-gray-400 mt-0.5 m-0">
                      {currentBranch?.name ?? "Chi nhánh trung tâm"} • Ẩm thực Bia &amp; Món Nướng
                    </p>
                  </div>

                  {/* Items List */}
                  <div className="flex flex-col gap-2">
                    <div className="flex justify-between text-[11px] font-bold text-gray-400 uppercase pb-1 border-b border-[#2d3138]">
                      <span>Món Ăn / Đồ Uống</span>
                      <div className="flex gap-6">
                        <span>SL</span>
                        <span className="w-20 text-right">Thành Tiền</span>
                      </div>
                    </div>

                    {activeOrder.items.map((item) => (
                      <div key={item.id} className="flex justify-between items-start text-xs py-1.5 border-b border-[#282b33]">
                        <div className="flex flex-col">
                          <span className="font-bold text-white">{item.productNameSnapshot}</span>
                          {item.variantNameSnapshot && (
                            <span className="text-[10px] text-amber-400">{item.variantNameSnapshot}</span>
                          )}
                          {item.notes && (
                            <span className="text-[10px] text-gray-400 italic">Ghi chú: {item.notes}</span>
                          )}
                        </div>
                        <div className="flex gap-6 items-center">
                          <span className="font-mono text-gray-300">x{item.quantity}</span>
                          <span className="w-20 text-right font-mono font-bold text-gray-100">
                            {item.lineTotal.toLocaleString("vi-VN")} đ
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Bill Summary */}
                  <div className="bg-[#24272e] p-3 rounded-xl flex flex-col gap-1.5 text-xs font-mono">
                    <div className="flex justify-between text-gray-300">
                      <span>Tạm tính ({activeOrder.items.length} món):</span>
                      <span>{activeOrder.subtotal.toLocaleString("vi-VN")} đ</span>
                    </div>
                    {activeOrder.discountAmount > 0 && (
                      <div className="flex justify-between text-rose-400">
                        <span>Giảm giá:</span>
                        <span>-{activeOrder.discountAmount.toLocaleString("vi-VN")} đ</span>
                      </div>
                    )}
                    {activeOrder.taxAmount > 0 && (
                      <div className="flex justify-between text-gray-400">
                        <span>Thuế VAT:</span>
                        <span>+{activeOrder.taxAmount.toLocaleString("vi-VN")} đ</span>
                      </div>
                    )}
                    <div className="flex justify-between text-base font-black text-amber-300 pt-2 border-t border-[#383d47]">
                      <span>TỔNG CỘNG:</span>
                      <span>{activeOrder.totalAmount.toLocaleString("vi-VN")} đ</span>
                    </div>
                  </div>
                </div>

                {/* Modal Footer Actions */}
                <div className="p-4 sm:p-5 bg-[#17181c] border-t border-[#2d3138] flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      className="secondary-button text-xs py-2 px-3 flex items-center gap-1.5"
                      onClick={handlePrintBill}
                      title="In hóa đơn"
                    >
                      <Printer size={15} />
                      <span>In Phiếu Tính Tiền</span>
                    </button>

                    {activeOrder.status !== OrderStatus.Cancelled && activeOrder.status !== OrderStatus.Completed && (
                      <button
                        type="button"
                        className="px-3 py-2 rounded-xl text-xs font-bold text-rose-400 hover:bg-rose-950/40 border border-rose-900/60 transition-colors flex items-center gap-1.5"
                        onClick={() => setCancelModalOpen(true)}
                      >
                        <Ban size={15} />
                        <span>Hủy đơn</span>
                      </button>
                    )}
                  </div>

                  {activeOrder.status !== OrderStatus.Completed && activeOrder.status !== OrderStatus.Cancelled && (
                    <button
                      type="button"
                      className="primary-button text-xs py-2 px-4 flex items-center gap-1.5 font-black shadow-lg shadow-orange-950/40"
                      onClick={() => {
                        setTenderedAmount(activeOrder.totalAmount);
                        setPaymentModalOpen(true);
                      }}
                    >
                      <CreditCard size={15} />
                      <span>Thanh toán ngay</span>
                    </button>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Payment Processing Modal */}
      {paymentModalOpen && activeOrder && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#1c1e22] border border-[#383d47] rounded-2xl w-full max-w-md p-5 shadow-2xl flex flex-col gap-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#2d3138]">
              <div className="flex items-center gap-2 font-bold text-white text-sm">
                <CreditCard size={18} className="text-amber-400" />
                <span>Thanh Toán Đơn #{activeOrder.orderNumber}</span>
              </div>
              <button type="button" className="icon-button" onClick={() => setPaymentModalOpen(false)}>
                <X size={16} />
              </button>
            </div>

            <div className="bg-[#24272e] p-3 rounded-xl text-center">
              <span className="text-xs text-gray-400 font-medium">Số tiền cần thanh toán</span>
              <div className="text-2xl font-black text-amber-400 font-mono mt-0.5">
                {activeOrder.totalAmount.toLocaleString("vi-VN")} VNĐ
              </div>
            </div>

            {/* Payment Method Selector */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs text-gray-300 font-bold">Phương thức thanh toán:</label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { id: PaymentMethod.Cash, label: "Tiền mặt", icon: "💵" },
                  { id: PaymentMethod.QrPayment, label: "VietQR", icon: "📱" },
                  { id: PaymentMethod.Card, label: "Quẹt thẻ", icon: "💳" },
                ].map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setPaymentMethod(m.id)}
                    className={`p-2.5 rounded-xl border text-xs font-bold flex flex-col items-center gap-1 transition-all ${
                      paymentMethod === m.id
                        ? "bg-amber-950/60 border-amber-500 text-amber-300 shadow-md"
                        : "bg-[#22252c] border-[#383d47] text-gray-300 hover:bg-[#2b2f38]"
                    }`}
                  >
                    <span className="text-xl">{m.icon}</span>
                    <span>{m.label}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Quick SePay Payment Option */}
            {paymentMethod !== PaymentMethod.Cash && (
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/25 text-xs text-amber-200 flex flex-col gap-2">
                <span className="leading-relaxed">Khách có thể quét mã VietQR ngân hàng hoặc thanh toán thẻ tự động qua cổng SePay:</span>
                <button
                  type="button"
                  onClick={async () => {
                    if (!activeOrder) return;
                    setPaymentModalOpen(false);
                    try {
                      await submitSepayCheckout({
                        orderId: activeOrder.id,
                        orderNumber: activeOrder.orderNumber,
                        amount: activeOrder.totalAmount,
                        orderDescription: `Thanh toan don #${activeOrder.orderNumber}`,
                        returnUrl: `${window.location.origin}/orders?sepay_success=true&order_id=${activeOrder.id}&amount=${Math.round(activeOrder.totalAmount)}`,
                        onPaid: ({ orderId, amount }) => finalizeSepayPayment(orderId, amount),
                      });
                    } catch (err: unknown) {
                      showToast(err instanceof Error ? err.message : "Lỗi mở cổng SePay");
                    }
                  }}
                  className="w-full py-2.5 px-3 rounded-xl font-bold text-xs text-white bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 flex items-center justify-center gap-2 cursor-pointer shadow-md transition-all"
                >
                  <QrCode size={16} />
                  <span>Mở cổng SePay (Tự động nhận tiền VietQR / Thẻ)</span>
                </button>
              </div>
            )}

            {/* Cash Tendered Amount input */}
            {paymentMethod === PaymentMethod.Cash && (
              <div className="flex flex-col gap-1.5">
                <label className="text-xs text-gray-300 font-bold">Tiền khách đưa (VNĐ):</label>
                <input
                  type="number"
                  value={tenderedAmount || ""}
                  onChange={(e) => setTenderedAmount(Number(e.target.value))}
                  placeholder="Nhập số tiền..."
                  className="w-full px-3 py-2 bg-[#22252b] border border-[#383d47] rounded-xl text-sm font-mono text-white focus:outline-none focus:border-amber-500"
                />
                {tenderedAmount > activeOrder.totalAmount && (
                  <div className="flex justify-between text-xs text-emerald-400 font-bold pt-1">
                    <span>Tiền thối lại:</span>
                    <span>{(tenderedAmount - activeOrder.totalAmount).toLocaleString("vi-VN")} đ</span>
                  </div>
                )}
              </div>
            )}

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                className="secondary-button text-xs py-2 px-3"
                onClick={() => setPaymentModalOpen(false)}
              >
                Hủy
              </button>
              <button
                type="button"
                className="primary-button text-xs py-2 px-5 font-bold"
                disabled={payMutation.isPending}
                onClick={() => payMutation.mutate()}
              >
                {payMutation.isPending ? "Đang xử lý..." : "Xác nhận đã thanh toán"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cancel Order Modal */}
      {cancelModalOpen && activeOrder && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#1c1e22] border border-[#383d47] rounded-2xl w-full max-w-sm p-5 shadow-2xl flex flex-col gap-4">
            <div className="flex items-center gap-2 text-rose-400 font-bold text-sm">
              <AlertCircle size={18} />
              <span>Hủy Đơn Hàng #{activeOrder.orderNumber}</span>
            </div>
            <p className="text-xs text-gray-300 m-0">
              Vui lòng nhập lý do hủy đơn (ví dụ: Khách đổi ý, trùng đơn, v.v.):
            </p>
            <textarea
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              placeholder="Nhập lý do hủy..."
              rows={3}
              className="w-full p-2.5 bg-[#22252b] border border-[#383d47] rounded-xl text-xs text-white placeholder-gray-500 focus:outline-none focus:border-rose-500"
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                className="secondary-button text-xs py-1.5 px-3"
                onClick={() => setCancelModalOpen(false)}
              >
                Quay lại
              </button>
              <button
                type="button"
                className="px-4 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs transition-colors"
                disabled={!cancelReason.trim() || cancelMutation.isPending}
                onClick={() => cancelMutation.mutate({ orderId: activeOrder.id, reason: cancelReason })}
              >
                {cancelMutation.isPending ? "Đang hủy..." : "Xác nhận hủy"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
