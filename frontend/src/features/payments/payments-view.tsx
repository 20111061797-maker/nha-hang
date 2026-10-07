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
  RefreshCw,
} from "lucide-react";

interface SepayOrderItem {
  id?: string;
  order_id?: string;
  order_invoice_number?: string;
  order_status?: string;
  order_amount?: string | number;
  order_currency?: string;
  order_description?: string;
  created_at?: string;
  updated_at?: string;
}

export function PaymentsView() {
  const { branchId } = useBranch();

  const [searchTerm, setSearchTerm] = useState("");
  const [methodFilter, setMethodFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedPayment, setSelectedPayment] = useState<PaymentResponse | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // 1. Lấy dữ liệu thanh toán nội bộ từ backend (Tiền mặt, thẻ, v.v.)
  const {
    data: dbPayments = [],
    isLoading: dbLoading,
    refetch: refetchDb,
    isFetching: isDbFetching,
  } = useQuery({
    queryKey: ["branch-payments", branchId],
    queryFn: () => (branchId ? paymentApi.getBranchPayments(branchId) : Promise.resolve([])),
    enabled: Boolean(branchId),
    refetchInterval: 12000,
  });

  // 2. Lấy dữ liệu giao dịch trực tiếp từ cổng SePay (VietQR / Chuyển khoản)
  const {
    data: sepayOrders = [],
    isLoading: sepayLoading,
    refetch: refetchSepay,
    isFetching: isSepayFetching,
  } = useQuery({
    queryKey: ["sepay-pg-transactions"],
    queryFn: async () => {
      try {
        const res = await fetch("/api/sepay/transactions");
        if (!res.ok) return [];
        const json = await res.json();
        return Array.isArray(json?.data) ? (json.data as SepayOrderItem[]) : [];
      } catch (err) {
        console.warn("Lỗi tải lịch sử giao dịch SePay:", err);
        return [];
      }
    },
    refetchInterval: 12000,
  });

  // Các helper phân loại chuẩn xác giao dịch (hỗ trợ cả enum dạng số lẫn chuỗi từ API / SePay)
  const isCompletedPayment = (status: any): boolean => {
    if (status === PaymentStatus.Completed) return true;
    if (status === 2 || status === "2") return true;
    if (typeof status === "string") {
      const s = status.toUpperCase();
      return s === "COMPLETED" || s === "CAPTURED" || s === "PAID" || s === "SUCCESS" || s === "APPROVED";
    }
    return false;
  };

  const isQrPayment = (payment: PaymentResponse): boolean => {
    if (payment.provider?.toLowerCase() === "sepay") return true;
    const method = payment.paymentMethod as any;
    if (
      method === PaymentMethod.QrPayment ||
      method === PaymentMethod.BankTransfer ||
      method === PaymentMethod.Online ||
      method === 1 ||
      method === "1" ||
      method === 2 ||
      method === "2" ||
      method === 5 ||
      method === "5"
    ) {
      return true;
    }
    if (typeof method === "string") {
      const m = method.toLowerCase();
      if (m.includes("qr") || m.includes("bank") || m.includes("sepay") || m.includes("online")) {
        return true;
      }
    }
    const text = `${payment.paymentNumber || ""} ${payment.orderId || ""} ${payment.note || ""} ${payment.transactionReference || ""}`.toLowerCase();
    return (
      text.includes("sepay") ||
      text.includes("vietqr") ||
      text.includes("chuyển khoản") ||
      text.includes("quét mã") ||
      text.includes("-qr-") ||
      text.startsWith("qr-") ||
      text.includes("qr")
    );
  };

  const isCardPayment = (payment: PaymentResponse): boolean => {
    if (isQrPayment(payment)) return false;
    const method = payment.paymentMethod as any;
    if (method === PaymentMethod.Card || method === 3 || method === "3") return true;
    if (typeof method === "string" && method.toLowerCase().includes("card")) return true;
    const text = `${payment.paymentNumber || ""} ${payment.note || ""}`.toLowerCase();
    return text.includes("thẻ") || text.includes("pos") || text.includes("card");
  };

  const isCashPayment = (payment: PaymentResponse): boolean => {
    if (isQrPayment(payment) || isCardPayment(payment)) return false;
    const method = payment.paymentMethod as any;
    if (method === PaymentMethod.Cash || method === 0 || method === "0") return true;
    return true; // Mặc định thu ngân tại quán là tiền mặt nếu không phải QR/thẻ
  };

  // Hợp nhất dữ liệu thanh toán: Tiền mặt + SePay (khử trùng lặp và phân loại chính xác SePay)
  const allPayments = useMemo(() => {
    // 1. Đối soát các bản ghi nội bộ dbPayments với dữ liệu giao dịch trực tiếp từ cổng SePay
    const matchedSepayInvoiceKeys = new Set<string>();

    const reconciledDbPayments: PaymentResponse[] = dbPayments.map((p) => {
      const pNumber = (p.paymentNumber || "").toLowerCase();
      const pOrderId = (p.orderId || "").toLowerCase();
      const pRef = (p.transactionReference || "").toLowerCase();
      const pProvId = (p.providerTransactionId || "").toLowerCase();
      const pNote = (p.note || "").toLowerCase();

      // Trích xuất mã đơn hàng, ví dụ: "PAY-20261007-ORD-20261007145044-13AEE4E9" -> "ORD-20261007145044-13AEE4E9"
      const orderMatch = (pNumber + " " + pNote).match(/(ord-[a-z0-9-]+|qr-[a-z0-9-]+)/i);
      const extractedOrderCode = orderMatch ? orderMatch[1].toLowerCase() : "";

      const matchedSepay = sepayOrders.find((s) => {
        const desc = (s.order_description || "").toLowerCase();
        const invoice = (s.order_invoice_number || "").toLowerCase();
        const sOrderId = (s.order_id || "").toLowerCase();

        if (extractedOrderCode && desc.includes(extractedOrderCode)) return true;
        if (invoice && (pNumber.includes(invoice) || pProvId.includes(invoice))) return true;
        if (sOrderId && (pNumber.includes(sOrderId) || pRef.includes(sOrderId) || pOrderId.includes(sOrderId))) return true;
        return false;
      });

      if (matchedSepay) {
        matchedSepayInvoiceKeys.add((matchedSepay.order_invoice_number || matchedSepay.id || "").toLowerCase());
        matchedSepayInvoiceKeys.add((matchedSepay.order_id || "").toLowerCase());
        return {
          ...p,
          paymentMethod: PaymentMethod.QrPayment,
          provider: "SePay",
          providerTransactionId: matchedSepay.order_invoice_number || p.providerTransactionId,
          transactionReference: matchedSepay.order_id || p.transactionReference,
          note: matchedSepay.order_description || p.note || "Thanh toán quét mã SePay VietQR",
          status: PaymentStatus.Completed,
        };
      }

      return p;
    });

    const list: PaymentResponse[] = [...reconciledDbPayments];

    // 2. Thêm các giao dịch SePay trực tiếp chưa có trong dbPayments
    const existingKeys = new Set(
      reconciledDbPayments.map((p) =>
        (p.providerTransactionId || p.transactionReference || p.paymentNumber || p.orderId || "").toLowerCase()
      )
    );

    for (const s of sepayOrders) {
      const invoice = (s.order_invoice_number || "").toLowerCase();
      const orderId = (s.order_id || "").toLowerCase();
      const sId = (s.id || "").toLowerCase();

      // Nếu đã được đối soát vào bản ghi nội bộ thì không thêm trùng
      if (
        (invoice && matchedSepayInvoiceKeys.has(invoice)) ||
        (orderId && matchedSepayInvoiceKeys.has(orderId)) ||
        (sId && matchedSepayInvoiceKeys.has(sId)) ||
        (invoice && existingKeys.has(invoice)) ||
        (orderId && existingKeys.has(orderId))
      ) {
        continue;
      }

      const isCompleted =
        s.order_status === "CAPTURED" ||
        s.order_status === "PAID" ||
        s.order_status === "SUCCESS" ||
        s.order_status === "APPROVED";

      list.push({
        id: `sepay-${s.id || s.order_id || s.order_invoice_number}`,
        orderId: s.order_invoice_number || s.order_id || "",
        branchId: branchId || "",
        paymentNumber: s.order_id || s.order_invoice_number || "SEPAY-TXN",
        paymentMethod: PaymentMethod.QrPayment,
        status: isCompleted ? PaymentStatus.Completed : PaymentStatus.Pending,
        amount: Number(s.order_amount) || 0,
        currencyCode: s.order_currency || "VND",
        provider: "SePay",
        providerTransactionId: s.order_invoice_number,
        transactionReference: s.order_id,
        note: s.order_description || "Thanh toán qua cổng SePay VietQR",
        createdAt: s.created_at || s.updated_at || new Date().toISOString(),
        completedAt: isCompleted ? (s.updated_at || s.created_at) : undefined,
      });
    }

    // Sắp xếp thời gian giảm dần (giao dịch mới nhất lên đầu)
    return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [dbPayments, sepayOrders, branchId]);

  const handleRefreshAll = async () => {
    await Promise.all([refetchDb(), refetchSepay()]);
    showToast("Đã đồng bộ dữ liệu giao dịch SePay & Tiền mặt mới nhất!");
  };

  const filteredPayments = useMemo(() => {
    return allPayments.filter((p) => {
      if (methodFilter !== "all") {
        if (methodFilter === PaymentMethod.Cash && !isCashPayment(p)) return false;
        if (methodFilter === PaymentMethod.QrPayment && !isQrPayment(p)) return false;
        if (methodFilter === PaymentMethod.Card && !isCardPayment(p)) return false;
      }
      if (statusFilter !== "all") {
        if (statusFilter === PaymentStatus.Completed && !isCompletedPayment(p.status)) return false;
        if (statusFilter === PaymentStatus.Pending) {
          const isPending =
            p.status === PaymentStatus.Pending ||
            (p.status as any) === 0 ||
            (p.status as any) === "0" ||
            (typeof p.status === "string" && p.status.toUpperCase() === "PENDING");
          if (!isPending) return false;
        }
        if (statusFilter === PaymentStatus.Refunded) {
          const isRefunded =
            p.status === PaymentStatus.Refunded ||
            (p.status as any) === 5 ||
            (p.status as any) === "5" ||
            (typeof p.status === "string" && p.status.toUpperCase() === "REFUNDED");
          if (!isRefunded) return false;
        }
      }
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        return (
          p.paymentNumber?.toLowerCase().includes(term) ||
          p.orderId?.toLowerCase().includes(term) ||
          (p.providerTransactionId && p.providerTransactionId.toLowerCase().includes(term)) ||
          (p.note && p.note.toLowerCase().includes(term))
        );
      }
      return true;
    });
  }, [allPayments, methodFilter, statusFilter, searchTerm]);

  // Tổng hợp thống kê doanh thu tài chính chuẩn xác
  const stats = useMemo(() => {
    const totalCount = allPayments.length;
    const completedPayments = allPayments.filter((p) => isCompletedPayment(p.status));
    const totalAmount = completedPayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

    const cashAmount = completedPayments
      .filter((p) => isCashPayment(p))
      .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

    const qrAmount = completedPayments
      .filter((p) => isQrPayment(p))
      .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

    const cardAmount = completedPayments
      .filter((p) => isCardPayment(p))
      .reduce((sum, p) => sum + (Number(p.amount) || 0), 0);

    return { totalCount, totalAmount, cashAmount, qrAmount, cardAmount };
  }, [allPayments]);

  const getMethodBadge = (payment: PaymentResponse) => {
    if (isQrPayment(payment)) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-950/70 text-amber-300 border border-amber-800/60 shadow-sm">
          📱 SePay VietQR
        </span>
      );
    }
    if (isCardPayment(payment)) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-sky-950/70 text-sky-300 border border-sky-800/60 shadow-sm">
          💳 Quẹt thẻ POS
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-950/70 text-emerald-300 border border-emerald-800/60 shadow-sm">
        💵 Tiền mặt
      </span>
    );
  };

  const getStatusBadge = (status: any) => {
    if (isCompletedPayment(status)) {
      return (
        <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-emerald-950/70 text-emerald-300 border border-emerald-800/60">
          Thành công
        </span>
      );
    }
    if (
      status === PaymentStatus.Pending ||
      status === 0 ||
      status === "0" ||
      (typeof status === "string" && status.toUpperCase() === "PENDING")
    ) {
      return (
        <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-amber-950/70 text-amber-300 border border-amber-800/60">
          Chờ xử lý
        </span>
      );
    }
    if (
      status === PaymentStatus.Refunded ||
      status === 5 ||
      status === "5" ||
      (typeof status === "string" && status.toUpperCase() === "REFUNDED")
    ) {
      return (
        <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-purple-950/70 text-purple-300 border border-purple-800/60">
          Đã hoàn tiền
        </span>
      );
    }
    if (
      status === PaymentStatus.Cancelled ||
      status === 6 ||
      status === "6" ||
      (typeof status === "string" && status.toUpperCase() === "CANCELLED")
    ) {
      return (
        <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-rose-950/70 text-rose-300 border border-rose-800/60">
          Đã hủy
        </span>
      );
    }
    return <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-gray-800 text-gray-300">{status}</span>;
  };

  if (!branchId) {
    return (
      <EmptyState
        title="Chưa chọn chi nhánh"
        detail="Vui lòng chọn chi nhánh ở thanh trên cùng để xem sổ quỹ thanh toán."
      />
    );
  }

  const isLoading = dbLoading && sepayLoading;

  if (isLoading) {
    return <LoadingState fullscreen label="Đang tải dữ liệu thanh toán SePay & Tiền mặt..." />;
  }

  const isRefreshing = isDbFetching || isSepayFetching;

  return (
    <div className="flex flex-col gap-5">
      {/* Toast Notification */}
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
            <span className="text-xs text-[#a99182] font-semibold">Tổng thực thu</span>
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

        {/* VietQR / SePay Transfer */}
        <div className="bg-[#1c1e22] border border-[#2d3138] rounded-2xl p-4 sm:p-5 flex justify-between items-start shadow-lg">
          <div>
            <span className="text-xs text-amber-400 font-semibold flex items-center gap-1">
              <Smartphone size={13} /> VietQR / SePay
            </span>
            <div className="flex items-baseline gap-1 mt-1">
              <span className="text-xl sm:text-2xl font-black text-white font-mono">
                {stats.qrAmount.toLocaleString("vi-VN")}
              </span>
              <span className="text-xs font-bold text-gray-400">đ</span>
            </div>
            <span className="text-[11px] text-gray-400 font-mono mt-1 block">
              Cổng thanh toán tự động SePay 24/7
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

      {/* Filter, Search and Refresh Bar */}
      <div className="bg-[#1a1c1e] border border-[#2d3035] p-3 sm:p-4 rounded-2xl flex flex-wrap items-center justify-between gap-3 shadow-md">
        <div className="flex flex-wrap items-center gap-2 sm:gap-3 flex-1 min-w-[260px]">
          {/* Search Box */}
          <div className="relative flex-1 min-w-[180px] max-w-xs">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Tìm theo mã giao dịch, đơn hàng, hóa đơn..."
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
            <option value={PaymentMethod.Cash}>Tiền mặt (Cash)</option>
            <option value={PaymentMethod.QrPayment}>VietQR / SePay</option>
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

          {/* Sync Button */}
          <button
            type="button"
            disabled={isRefreshing}
            onClick={handleRefreshAll}
            className="px-3 py-1.5 rounded-xl border border-amber-500/40 bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer disabled:opacity-50"
            title="Đồng bộ giao dịch SePay và tiền mặt"
          >
            <RefreshCw size={13} className={isRefreshing ? "animate-spin" : ""} />
            <span>Đồng bộ SePay & Tiền mặt</span>
          </button>
        </div>

        <span className="text-xs text-gray-400 font-mono">
          Hiển thị <strong>{filteredPayments.length}</strong> / {allPayments.length} giao dịch
        </span>
      </div>

      {/* Transactions Table List */}
      <div className="bg-[#1c1e22] border border-[#2d3138] rounded-2xl overflow-hidden shadow-lg">
        {filteredPayments.length === 0 ? (
          <div className="p-12 text-center text-gray-400 flex flex-col items-center gap-2">
            <Receipt size={36} className="text-gray-500 mb-1" />
            <span className="text-sm font-bold text-gray-300">Chưa có giao dịch thanh toán nào phù hợp</span>
            <span className="text-xs text-gray-500">
              Các giao dịch từ cổng SePay và thu tiền mặt tại quầy sẽ tự động hiển thị tại đây.
            </span>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-[#17181c] border-b border-[#2d3138] text-gray-400 uppercase tracking-wider font-extrabold text-[10px]">
                  <th className="py-3 px-4">Mã Giao Dịch / Hóa Đơn</th>
                  <th className="py-3 px-4">Thời Gian</th>
                  <th className="py-3 px-4">Phương Thức</th>
                  <th className="py-3 px-4">Số Tiền</th>
                  <th className="py-3 px-4">Nội Dung / Đơn Hàng</th>
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
                      <div>#{p.paymentNumber}</div>
                      {p.providerTransactionId && p.providerTransactionId !== p.paymentNumber && (
                        <div className="text-[10px] text-gray-500 font-mono">{p.providerTransactionId}</div>
                      )}
                    </td>
                    <td className="py-3 px-4 text-gray-300 font-mono">
                      <div>
                        {new Date(p.createdAt).toLocaleDateString("vi-VN", {
                          day: "2-digit",
                          month: "2-digit",
                          year: "numeric",
                        })}
                      </div>
                      <div className="text-[11px] text-gray-500">
                        {new Date(p.createdAt).toLocaleTimeString("vi-VN", {
                          hour: "2-digit",
                          minute: "2-digit",
                          second: "2-digit",
                        })}
                      </div>
                    </td>
                    <td className="py-3 px-4">{getMethodBadge(p)}</td>
                    <td className="py-3 px-4 font-mono font-bold text-[#fef3c7] text-sm">
                      {p.amount.toLocaleString("vi-VN")} đ
                    </td>
                    <td className="py-3 px-4 text-gray-300 max-w-xs truncate">
                      <span title={p.note || ""}>{p.note || "Thanh toán đơn hàng"}</span>
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
                <span>Chi Tiết Giao Dịch #{selectedPayment.paymentNumber}</span>
              </div>
              <button type="button" className="icon-button" onClick={() => setSelectedPayment(null)}>
                <X size={16} />
              </button>
            </div>

            <div className="bg-[#24272e] p-4 rounded-xl flex flex-col gap-2.5 font-mono text-xs">
              <div className="flex justify-between items-center text-gray-300">
                <span>Số tiền thanh toán:</span>
                <strong className="text-lg text-amber-300 font-black">
                  {selectedPayment.amount.toLocaleString("vi-VN")} đ
                </strong>
              </div>
              <div className="flex justify-between text-gray-300">
                <span>Phương thức:</span>
                <span>
                  {isQrPayment(selectedPayment)
                    ? "📱 Cổng SePay VietQR"
                    : isCardPayment(selectedPayment)
                    ? "💳 Quẹt thẻ máy POS"
                    : "💵 Tiền mặt (Cash)"}
                </span>
              </div>
              <div className="flex justify-between text-gray-300">
                <span>Trạng thái:</span>
                <span>{getStatusBadge(selectedPayment.status)}</span>
              </div>
              {selectedPayment.providerTransactionId && (
                <div className="flex justify-between text-gray-300">
                  <span>Mã hóa đơn SePay:</span>
                  <span className="text-amber-400 font-bold">{selectedPayment.providerTransactionId}</span>
                </div>
              )}
              {selectedPayment.transactionReference && (
                <div className="flex justify-between text-gray-300">
                  <span>Mã tham chiếu SePay:</span>
                  <span className="text-gray-400">{selectedPayment.transactionReference}</span>
                </div>
              )}
              <div className="flex justify-between text-gray-300">
                <span>Thời gian:</span>
                <span>{new Date(selectedPayment.createdAt).toLocaleString("vi-VN")}</span>
              </div>
              {selectedPayment.note && (
                <div className="flex flex-col gap-1 text-gray-300 pt-2 border-t border-[#383d47]">
                  <span className="text-gray-400">Nội dung thanh toán:</span>
                  <span className="text-amber-200/90 font-sans italic">{selectedPayment.note}</span>
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
