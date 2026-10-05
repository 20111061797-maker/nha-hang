"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { paymentApi } from "@/lib/api/payment-api";
import { useBranch } from "@/features/branches/branch-provider";
import { PaymentMethod, PaymentStatus, type PaymentResponse } from "@/types/payments";
import { LoadingState, EmptyState } from "@/components/feedback/states";
import {
  CreditCard,
  Search,
  CheckCircle2,
  Receipt,
  X,
  Wallet,
  Smartphone,
} from "lucide-react";

export function PaymentsView() {
  const { branchId } = useBranch();

  const [searchTerm, setSearchTerm] = useState("");
  const [methodFilter, setMethodFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedPayment, setSelectedPayment] = useState<PaymentResponse | null>(null);
  const [toastMessage] = useState<string | null>(null);

  // Fetch branch payments
  const { data: payments = [], isLoading: paymentsLoading } = useQuery({
    queryKey: ["branch-payments", branchId],
    queryFn: () => (branchId ? paymentApi.getBranchPayments(branchId) : Promise.resolve([])),
    enabled: Boolean(branchId),
    refetchInterval: 12000,
  });

  const filteredPayments = useMemo(() => {
    return payments.filter((p) => {
      if (methodFilter !== "all" && p.paymentMethod !== methodFilter) return false;
      if (statusFilter !== "all" && p.status !== statusFilter) return false;
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        return (
          p.paymentNumber.toLowerCase().includes(term) ||
          p.orderId.toLowerCase().includes(term) ||
          (p.note && p.note.toLowerCase().includes(term))
        );
      }
      return true;
    });
  }, [payments, methodFilter, statusFilter, searchTerm]);

  // Aggregate stats
  const stats = useMemo(() => {
    const totalCount = payments.length;
    const completedPayments = payments.filter((p) => p.status === PaymentStatus.Completed);
    const totalAmount = completedPayments.reduce((sum, p) => sum + p.amount, 0);

    const cashAmount = completedPayments
      .filter((p) => p.paymentMethod === PaymentMethod.Cash)
      .reduce((sum, p) => sum + p.amount, 0);

    const qrAmount = completedPayments
      .filter((p) => p.paymentMethod === PaymentMethod.QrPayment || p.paymentMethod === PaymentMethod.BankTransfer)
      .reduce((sum, p) => sum + p.amount, 0);

    const cardAmount = completedPayments
      .filter((p) => p.paymentMethod === PaymentMethod.Card)
      .reduce((sum, p) => sum + p.amount, 0);

    return { totalCount, totalAmount, cashAmount, qrAmount, cardAmount };
  }, [payments]);

  const getMethodBadge = (method: PaymentMethod) => {
    switch (method) {
      case PaymentMethod.Cash:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-950/70 text-emerald-300 border border-emerald-800/60">
            💵 Tiền mặt
          </span>
        );
      case PaymentMethod.QrPayment:
      case PaymentMethod.BankTransfer:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-950/70 text-amber-300 border border-amber-800/60">
            📱 VietQR / CK
          </span>
        );
      case PaymentMethod.Card:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-sky-950/70 text-sky-300 border border-sky-800/60">
            💳 Quẹt thẻ POS
          </span>
        );
      default:
        return (
          <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-gray-800 text-gray-300">
            {method}
          </span>
        );
    }
  };

  const getStatusBadge = (status: PaymentStatus) => {
    switch (status) {
      case PaymentStatus.Completed:
        return (
          <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-950/70 text-emerald-300 border border-emerald-800/60">
            Thành công
          </span>
        );
      case PaymentStatus.Pending:
        return (
          <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-amber-950/70 text-amber-300 border border-amber-800/60">
            Chờ xử lý
          </span>
        );
      case PaymentStatus.Refunded:
        return (
          <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-purple-950/70 text-purple-300 border border-purple-800/60">
            Đã hoàn tiền
          </span>
        );
      case PaymentStatus.Cancelled:
        return (
          <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-rose-950/70 text-rose-300 border border-rose-800/60">
            Đã hủy
          </span>
        );
      default:
        return <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-gray-800 text-gray-300">{status}</span>;
    }
  };

  if (!branchId) {
    return (
      <EmptyState
        title="Chưa chọn chi nhánh"
        detail="Vui lòng chọn chi nhánh ở thanh trên cùng để xem sổ quỹ thanh toán."
      />
    );
  }

  if (paymentsLoading) {
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

      {/* Top Financial Breakdown Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total revenue */}
        <div className="bg-[#241e1b] border border-[#443329] rounded-2xl p-4 sm:p-5 flex justify-between items-start shadow-lg">
          <div>
            <span className="text-xs text-[#a99182] font-semibold">Tổng thực thu hôm nay</span>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-2xl sm:text-3xl font-black text-[#fef3c7] font-mono">
                {stats.totalAmount.toLocaleString("vi-VN")}
              </span>
              <span className="text-xs font-bold text-amber-400">VNĐ</span>
            </div>
            <span className="text-[11px] text-gray-400 font-mono mt-1 block">
              {stats.totalCount} giao dịch thanh toán
            </span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-[#382b24] border border-[#533f34] flex items-center justify-center text-2xl shadow-inner">
            💰
          </div>
        </div>

        {/* Cash */}
        <div className="bg-[#1c1e22] border border-[#2d3138] rounded-2xl p-4 sm:p-5 flex justify-between items-start shadow-lg">
          <div>
            <span className="text-xs text-emerald-400 font-semibold flex items-center gap-1">
              <Wallet size={13} /> Tiền mặt (Cash)
            </span>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-xl sm:text-2xl font-black text-white font-mono">
                {stats.cashAmount.toLocaleString("vi-VN")}
              </span>
              <span className="text-xs font-bold text-gray-400">đ</span>
            </div>
            <span className="text-[11px] text-gray-400 font-mono mt-1 block">
              Thu trực tiếp tại quầy thu ngân
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-emerald-950/40 border border-emerald-800/40 flex items-center justify-center text-xl">
            💵
          </div>
        </div>

        {/* VietQR / Transfer */}
        <div className="bg-[#1c1e22] border border-[#2d3138] rounded-2xl p-4 sm:p-5 flex justify-between items-start shadow-lg">
          <div>
            <span className="text-xs text-amber-400 font-semibold flex items-center gap-1">
              <Smartphone size={13} /> VietQR / Chuyển khoản
            </span>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-xl sm:text-2xl font-black text-white font-mono">
                {stats.qrAmount.toLocaleString("vi-VN")}
              </span>
              <span className="text-xs font-bold text-gray-400">đ</span>
            </div>
            <span className="text-[11px] text-gray-400 font-mono mt-1 block">
              Quét mã ngân hàng 24/7
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-amber-950/40 border border-amber-800/40 flex items-center justify-center text-xl">
            📱
          </div>
        </div>

        {/* Card POS */}
        <div className="bg-[#1c1e22] border border-[#2d3138] rounded-2xl p-4 sm:p-5 flex justify-between items-start shadow-lg">
          <div>
            <span className="text-xs text-sky-400 font-semibold flex items-center gap-1">
              <CreditCard size={13} /> Quẹt thẻ máy POS
            </span>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-xl sm:text-2xl font-black text-white font-mono">
                {stats.cardAmount.toLocaleString("vi-VN")}
              </span>
              <span className="text-xs font-bold text-gray-400">đ</span>
            </div>
            <span className="text-[11px] text-gray-400 font-mono mt-1 block">
              Thẻ ATM nội địa / Visa / Master
            </span>
          </div>
          <div className="w-10 h-10 rounded-xl bg-sky-950/40 border border-sky-800/40 flex items-center justify-center text-xl">
            💳
          </div>
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
              placeholder="Tìm theo mã giao dịch PAY-..."
              className="w-full pl-9 pr-3 py-1.5 bg-[#22252b] border border-[#383d47] rounded-xl text-xs text-white placeholder-gray-500 focus:outline-none focus:border-amber-500"
            />
          </div>

          {/* Payment Method Filter */}
          <select
            value={methodFilter}
            onChange={(e) => setMethodFilter(e.target.value)}
            className="bg-[#22252b] border border-[#383d47] text-gray-200 text-xs rounded-xl px-3 py-1.5 font-bold focus:outline-none"
          >
            <option value="all">Tất cả phương thức</option>
            <option value={PaymentMethod.Cash}>Tiền mặt</option>
            <option value={PaymentMethod.QrPayment}>VietQR / Chuyển khoản</option>
            <option value={PaymentMethod.Card}>Thẻ POS</option>
          </select>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="bg-[#22252b] border border-[#383d47] text-gray-200 text-xs rounded-xl px-3 py-1.5 font-bold focus:outline-none"
          >
            <option value="all">Tất cả trạng thái</option>
            <option value={PaymentStatus.Completed}>Thành công</option>
            <option value={PaymentStatus.Pending}>Chờ xử lý</option>
            <option value={PaymentStatus.Refunded}>Đã hoàn tiền</option>
          </select>
        </div>

        <span className="text-xs text-gray-400 font-mono">
          Hiển thị <strong>{filteredPayments.length}</strong> / {payments.length} phiếu thu
        </span>
      </div>

      {/* Transactions Table List */}
      <div className="bg-[#1c1e22] border border-[#2d3138] rounded-2xl overflow-hidden shadow-lg">
        {filteredPayments.length === 0 ? (
          <div className="p-12 text-center text-gray-400 flex flex-col items-center gap-2">
            <Receipt size={36} className="text-gray-500 mb-1" />
            <span className="text-sm font-bold text-gray-300">Chưa có giao dịch thanh toán nào</span>
            <span className="text-xs text-gray-500">
              Các phiếu thu tiền từ màn hình POS hoặc đơn hàng sẽ xuất hiện tự động tại đây.
            </span>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-[#17181c] border-b border-[#2d3138] text-gray-400 uppercase tracking-wider font-extrabold text-[10px]">
                  <th className="py-3 px-4">Mã Phiếu Thu</th>
                  <th className="py-3 px-4">Thời Gian</th>
                  <th className="py-3 px-4">Phương Thức</th>
                  <th className="py-3 px-4">Số Tiền</th>
                  <th className="py-3 px-4">Tiền Đưa / Thối</th>
                  <th className="py-3 px-4">Trạng Thái</th>
                  <th className="py-3 px-4 text-right">Chi Tiết</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#282b33]">
                {filteredPayments.map((p) => (
                  <tr
                    key={p.id}
                    className="hover:bg-[#23262e] transition-colors cursor-pointer group"
                    onClick={() => setSelectedPayment(p)}
                  >
                    <td className="py-3 px-4 font-mono font-bold text-white group-hover:text-amber-400">
                      #{p.paymentNumber}
                    </td>
                    <td className="py-3 px-4 text-gray-400 font-mono">
                      {new Date(p.createdAt).toLocaleTimeString("vi-VN", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                    <td className="py-3 px-4">{getMethodBadge(p.paymentMethod)}</td>
                    <td className="py-3 px-4 font-mono font-bold text-[#fef3c7]">
                      {p.amount.toLocaleString("vi-VN")} đ
                    </td>
                    <td className="py-3 px-4 text-gray-400 font-mono">
                      {p.tenderedAmount ? (
                        <span>
                          {p.tenderedAmount.toLocaleString("vi-VN")} đ{" "}
                          {p.changeAmount ? (
                            <span className="text-emerald-400 font-bold">
                              (thối {p.changeAmount.toLocaleString("vi-VN")} đ)
                            </span>
                          ) : null}
                        </span>
                      ) : (
                        "-"
                      )}
                    </td>
                    <td className="py-3 px-4">{getStatusBadge(p.status)}</td>
                    <td className="py-3 px-4 text-right">
                      <button
                        type="button"
                        className="px-2.5 py-1 rounded-lg bg-[#2b2f3a] hover:bg-amber-500 hover:text-black font-bold text-gray-200 transition-colors"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedPayment(p);
                        }}
                      >
                        Xem
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Payment Receipt Modal */}
      {selectedPayment && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setSelectedPayment(null)}
        >
          <div
            className="bg-[#1c1e22] border border-[#383d47] rounded-2xl w-full max-w-md p-5 shadow-2xl flex flex-col gap-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-3 border-b border-[#2d3138]">
              <div className="flex items-center gap-2 font-bold text-white text-sm">
                <Receipt size={18} className="text-amber-400" />
                <span>Phiếu Thu #{selectedPayment.paymentNumber}</span>
              </div>
              <button type="button" className="icon-button" onClick={() => setSelectedPayment(null)}>
                <X size={16} />
              </button>
            </div>

            <div className="bg-[#24272e] p-4 rounded-xl flex flex-col gap-2 font-mono text-xs">
              <div className="flex justify-between text-gray-400">
                <span>Số tiền thanh toán:</span>
                <strong className="text-base text-amber-300 font-bold">
                  {selectedPayment.amount.toLocaleString("vi-VN")} đ
                </strong>
              </div>
              <div className="flex justify-between text-gray-400">
                <span>Phương thức:</span>
                <span>{selectedPayment.paymentMethod}</span>
              </div>
              <div className="flex justify-between text-gray-400">
                <span>Trạng thái:</span>
                <span>{selectedPayment.status}</span>
              </div>
              <div className="flex justify-between text-gray-400">
                <span>Mã giao dịch / Ref:</span>
                <span>{selectedPayment.transactionReference ?? "N/A"}</span>
              </div>
              <div className="flex justify-between text-gray-400">
                <span>Thời gian:</span>
                <span>{new Date(selectedPayment.createdAt).toLocaleString("vi-VN")}</span>
              </div>
              {selectedPayment.note && (
                <div className="flex justify-between text-gray-400 pt-2 border-t border-[#383d47]">
                  <span>Ghi chú:</span>
                  <span className="italic">{selectedPayment.note}</span>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                className="secondary-button text-xs py-1.5 px-3"
                onClick={() => setSelectedPayment(null)}
              >
                Đóng
              </button>
              <button
                type="button"
                className="primary-button text-xs py-1.5 px-4 font-bold"
                onClick={() => {
                  window.print();
                }}
              >
                In phiếu thu
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
