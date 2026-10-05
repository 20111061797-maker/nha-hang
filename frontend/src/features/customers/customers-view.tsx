"use client";

import { useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { customerApi } from "@/lib/api/customer-api";
import type { CustomerListItem, CustomerDetails } from "@/types/customers";
import {
  Users,
  UserPlus,
  Search,
  Award,
  Crown,
  Sparkles,
  Phone,
  Mail,
  Calendar,
  CreditCard,
  Plus,
  Minus,
  X,
  History,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";

function formatCurrency(amount: number) {
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
  }).format(amount);
}

function getTierBadge(code: string, name: string) {
  switch (code.toUpperCase()) {
    case "DIAMOND":
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-cyan-950/80 text-cyan-300 border border-cyan-700/50 shadow-sm shadow-cyan-900/40">
          <Sparkles size={12} className="text-cyan-300 animate-pulse" />
          {name}
        </span>
      );
    case "GOLD":
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-950/80 text-amber-300 border border-amber-600/50 shadow-sm shadow-amber-900/40">
          <Crown size={12} className="text-amber-400" />
          {name}
        </span>
      );
    case "SILVER":
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-800 text-slate-300 border border-slate-600/50">
          <Award size={12} className="text-slate-400" />
          {name}
        </span>
      );
    default:
      return (
        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-900/30 text-amber-500/90 border border-amber-800/40">
          <Award size={12} className="text-amber-600" />
          {name}
        </span>
      );
  }
}

export function CustomersView() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [selectedTier, setSelectedTier] = useState<string>("ALL");
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<CustomerDetails | null>(null);
  const [pointsAdjustDelta, setPointsAdjustDelta] = useState<number>(50);
  const [pointsAdjustReason, setPointsAdjustReason] = useState("");
  const [notice, setNotice] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Form states
  const [formName, setFormName] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [formAddress, setFormAddress] = useState("");
  const [formInitialPoints, setFormInitialPoints] = useState(20);

  const showToast = (type: "success" | "error", message: string) => {
    setNotice({ type, message });
    setTimeout(() => setNotice(null), 4000);
  };

  const getErrorMessage = (err: unknown, fallback: string) =>
    err instanceof Error ? err.message : fallback;

  // Queries
  const { data: customers = [], isLoading } = useQuery({
    queryKey: ["customers", search],
    queryFn: () => customerApi.getCustomers(search),
  });

  const { data: membershipLevels = [] } = useQuery({
    queryKey: ["membership-levels"],
    queryFn: customerApi.getMembershipLevels,
  });

  // Mutations
  const createMutation = useMutation({
    mutationFn: customerApi.createCustomer,
    onSuccess: (newCust) => {
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      setCreateModalOpen(false);
      setFormName("");
      setFormPhone("");
      setFormEmail("");
      setFormAddress("");
      showToast("success", `Đã thêm hội viên ${newCust.fullName} thành công!`);
    },
    onError: (err: unknown) => {
      showToast("error", getErrorMessage(err, "Không thể tạo thông tin khách hàng."));
    },
  });

  const adjustPointsMutation = useMutation({
    mutationFn: ({ id, delta, reason }: { id: string; delta: number; reason: string }) =>
      customerApi.adjustPoints(id, { pointsDelta: delta, reason }),
    onSuccess: (updated) => {
      queryClient.invalidateQueries({ queryKey: ["customers"] });
      setSelectedCustomer(updated);
      setPointsAdjustReason("");
      showToast("success", `Cập nhật điểm thành công: ${updated.loyaltyPoints} điểm.`);
    },
    onError: (err: unknown) => {
      showToast("error", getErrorMessage(err, "Không thể điều chỉnh điểm."));
    },
  });

  const filteredCustomers = useMemo(() => {
    return customers.filter((c) => {
      if (selectedTier !== "ALL" && c.membershipLevelCode.toUpperCase() !== selectedTier) {
        return false;
      }
      return true;
    });
  }, [customers, selectedTier]);

  const stats = useMemo(() => {
    const total = customers.length;
    const vipCount = customers.filter(
      (c) => c.membershipLevelCode === "GOLD" || c.membershipLevelCode === "DIAMOND"
    ).length;
    const totalPoints = customers.reduce((sum, c) => sum + c.loyaltyPoints, 0);
    const totalRevenue = customers.reduce((sum, c) => sum + c.totalSpent, 0);
    return { total, vipCount, totalPoints, totalRevenue };
  }, [customers]);

  const handleOpenDetail = async (c: CustomerListItem) => {
    try {
      const full = await customerApi.getCustomer(c.id);
      setSelectedCustomer(full);
    } catch {
      showToast("error", "Không thể tải chi tiết khách hàng.");
    }
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formPhone.trim()) {
      showToast("error", "Vui lòng nhập họ tên và số điện thoại.");
      return;
    }
    createMutation.mutate({
      fullName: formName.trim(),
      phone: formPhone.trim(),
      email: formEmail.trim() || undefined,
      address: formAddress.trim() || undefined,
      initialPoints: Number(formInitialPoints) || 0,
    });
  };

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {notice && (
        <div
          className={`pos-notification-banner ${
            notice.type === "success" ? "pos-notification-success" : "pos-notification-error"
          }`}
        >
          {notice.type === "success" ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
          <span>{notice.message}</span>
        </div>
      )}

      {/* Header & KPI Summary */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            <Users className="text-amber-500" size={26} /> Quản lý Khách hàng &amp; Hội viên
          </h1>
          <p className="text-sm text-gray-400 mt-1">
            Chăm sóc khách quen, quản lý tích điểm thưởng và phân hạng thành viên quán.
          </p>
        </div>

        <button
          type="button"
          onClick={() => setCreateModalOpen(true)}
          className="flex items-center justify-center gap-2 bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white font-medium px-4 py-2.5 rounded-xl shadow-lg shadow-amber-900/20 transition-all cursor-pointer active:scale-95"
        >
          <UserPlus size={18} />
          <span>Thêm hội viên mới</span>
        </button>
      </div>

      {/* Top Stats Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#1c1e22] border border-[#2d3138] rounded-2xl p-4.5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-gray-400 text-xs font-medium">
            <span>Tổng hội viên</span>
            <Users size={16} className="text-amber-500" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-white">{stats.total}</span>
            <span className="text-xs text-gray-400">khách hàng</span>
          </div>
        </div>

        <div className="bg-[#1c1e22] border border-[#2d3138] rounded-2xl p-4.5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-gray-400 text-xs font-medium">
            <span>Hội viên VIP (Vàng/Kim Cương)</span>
            <Crown size={16} className="text-yellow-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-amber-400">{stats.vipCount}</span>
            <span className="text-xs text-amber-500/80">khách thân thiết</span>
          </div>
        </div>

        <div className="bg-[#1c1e22] border border-[#2d3138] rounded-2xl p-4.5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-gray-400 text-xs font-medium">
            <span>Tổng điểm tích lũy</span>
            <Sparkles size={16} className="text-cyan-400" />
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold text-cyan-400">{stats.totalPoints.toLocaleString("vi-VN")}</span>
            <span className="text-xs text-gray-400">điểm</span>
          </div>
        </div>

        <div className="bg-[#1c1e22] border border-[#2d3138] rounded-2xl p-4.5 flex flex-col justify-between">
          <div className="flex items-center justify-between text-gray-400 text-xs font-medium">
            <span>Doanh thu từ hội viên</span>
            <CreditCard size={16} className="text-emerald-400" />
          </div>
          <div className="mt-2">
            <span className="text-xl font-bold text-emerald-400">{formatCurrency(stats.totalRevenue)}</span>
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="bg-[#1c1e22] border border-[#2d3138] rounded-2xl p-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
        {/* Search Input */}
        <div className="relative flex-1 max-w-md">
          <Search size={18} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm theo tên khách, số điện thoại..."
            className="w-full bg-[#141517] border border-[#2d3138] rounded-xl pl-10 pr-4 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-amber-500 transition-colors"
          />
        </div>

        {/* Tier filter pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
          {[
            { id: "ALL", label: "Tất cả" },
            { id: "BRONZE", label: "Đồng" },
            { id: "SILVER", label: "Bạc" },
            { id: "GOLD", label: "Vàng" },
            { id: "DIAMOND", label: "Kim Cương" },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setSelectedTier(tab.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap cursor-pointer ${
                selectedTier === tab.id
                  ? "bg-amber-500 text-black font-semibold shadow-md shadow-amber-900/30"
                  : "bg-[#141517] text-gray-400 hover:text-white hover:bg-[#24272e]"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Customers List / Table */}
      <div className="bg-[#1c1e22] border border-[#2d3138] rounded-2xl overflow-hidden shadow-xl">
        {isLoading ? (
          <div className="py-16 text-center text-gray-400">
            <div className="animate-spin inline-block w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full mb-3" />
            <p>Đang tải danh sách khách hàng...</p>
          </div>
        ) : filteredCustomers.length === 0 ? (
          <div className="py-16 text-center text-gray-400 space-y-3">
            <Users size={40} className="mx-auto text-gray-600" />
            <p className="text-base font-medium text-gray-300">Không tìm thấy khách hàng nào</p>
            <p className="text-xs text-gray-500 max-w-sm mx-auto">
              Thử tìm kiếm với số điện thoại khác hoặc đăng ký thành viên mới vào hệ thống.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-gray-300">
              <thead className="bg-[#141517] text-xs font-semibold text-gray-400 uppercase tracking-wider border-b border-[#2d3138]">
                <tr>
                  <th className="py-3.5 px-4">Khách hàng</th>
                  <th className="py-3.5 px-4">Số điện thoại</th>
                  <th className="py-3.5 px-4">Hạng hội viên</th>
                  <th className="py-3.5 px-4 text-right">Điểm tích lũy</th>
                  <th className="py-3.5 px-4 text-right">Số lần đến</th>
                  <th className="py-3.5 px-4 text-right">Tổng chi tiêu</th>
                  <th className="py-3.5 px-4 text-center">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#2d3138]">
                {filteredCustomers.map((c) => (
                  <tr
                    key={c.id}
                    className="hover:bg-[#24272e]/50 transition-colors group cursor-pointer"
                    onClick={() => handleOpenDetail(c)}
                  >
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-amber-500/20 to-orange-500/10 border border-amber-500/30 flex items-center justify-center font-bold text-amber-400 text-sm">
                          {c.fullName.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-semibold text-white group-hover:text-amber-400 transition-colors">
                            {c.fullName}
                          </p>
                          {c.email && (
                            <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                              <Mail size={11} /> {c.email}
                            </p>
                          )}
                        </div>
                      </div>
                    </td>

                    <td className="py-3.5 px-4 font-mono font-medium text-gray-200">
                      <span className="flex items-center gap-1.5">
                        <Phone size={13} className="text-gray-500" />
                        {c.phone}
                      </span>
                    </td>

                    <td className="py-3.5 px-4">
                      {getTierBadge(c.membershipLevelCode, c.membershipLevelName)}
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <span className="font-bold text-amber-400 flex items-center justify-end gap-1">
                        <Sparkles size={13} />
                        {c.loyaltyPoints.toLocaleString("vi-VN")}
                      </span>
                    </td>

                    <td className="py-3.5 px-4 text-right font-medium text-gray-300">
                      {c.totalOrders} đơn
                    </td>

                    <td className="py-3.5 px-4 text-right font-semibold text-emerald-400">
                      {formatCurrency(c.totalSpent)}
                    </td>

                    <td className="py-3.5 px-4 text-center">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleOpenDetail(c);
                        }}
                        className="px-2.5 py-1 rounded-lg text-xs font-medium bg-[#141517] hover:bg-amber-500 hover:text-black border border-[#2d3138] hover:border-amber-500 transition-all cursor-pointer text-gray-300"
                      >
                        Hồ sơ &amp; Điểm
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Create Customer Modal */}
      {createModalOpen && (
        <div className="pos-modal-backdrop" onClick={() => setCreateModalOpen(false)}>
          <div
            className="pos-modal-card pos-modal-sm bg-[#1c1e22] border border-[#2d3138]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="pos-modal-header border-b border-[#2d3138] pb-3 flex items-center justify-between">
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <UserPlus className="text-amber-500" size={20} /> Đăng ký hội viên mới
              </h3>
              <button
                type="button"
                onClick={() => setCreateModalOpen(false)}
                className="text-gray-400 hover:text-white"
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-4 pt-4">
              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">
                  Họ và tên khách hàng <span className="text-amber-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="Ví dụ: Anh Nam - Bàn VIP"
                  className="w-full bg-[#141517] border border-[#2d3138] rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">
                  Số điện thoại <span className="text-amber-500">*</span>
                </label>
                <input
                  type="tel"
                  required
                  value={formPhone}
                  onChange={(e) => setFormPhone(e.target.value)}
                  placeholder="Ví dụ: 0988123456"
                  className="w-full bg-[#141517] border border-[#2d3138] rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-amber-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">Email</label>
                <input
                  type="email"
                  value={formEmail}
                  onChange={(e) => setFormEmail(e.target.value)}
                  placeholder="Ví dụ: customer@gmail.com"
                  className="w-full bg-[#141517] border border-[#2d3138] rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">
                  Địa chỉ thường trú / Giao hàng
                </label>
                <input
                  type="text"
                  value={formAddress}
                  onChange={(e) => setFormAddress(e.target.value)}
                  placeholder="Ví dụ: 123 Nguyễn Thị Minh Khai, Q.1"
                  className="w-full bg-[#141517] border border-[#2d3138] rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-400 mb-1">
                  Điểm thưởng tặng khi mở thẻ
                </label>
                <input
                  type="number"
                  min="0"
                  value={formInitialPoints}
                  onChange={(e) => setFormInitialPoints(Number(e.target.value))}
                  className="w-full bg-[#141517] border border-[#2d3138] rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              {membershipLevels.length > 0 && (
                <div className="text-[11px] text-gray-400 bg-[#141517] p-2.5 rounded-xl border border-[#2d3138] flex flex-wrap gap-2">
                  <span className="text-gray-500 font-medium">Hạng thẻ:</span>
                  {membershipLevels.map((lvl) => (
                    <span key={lvl.id} className="text-amber-400/90 font-mono">
                      {lvl.name} (≥{lvl.minimumPoints}đ)
                    </span>
                  ))}
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#2d3138]">
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-sm font-medium bg-[#141517] hover:bg-[#24272e] text-gray-300 transition-colors"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending}
                  className="px-4 py-2 rounded-xl text-sm font-semibold bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-white shadow-lg shadow-amber-900/20 disabled:opacity-50 transition-all cursor-pointer"
                >
                  {createMutation.isPending ? "Đang lưu..." : "Xác nhận tạo thẻ"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Customer Detail & Points Drawer/Modal */}
      {selectedCustomer && (
        <div className="pos-modal-backdrop" onClick={() => setSelectedCustomer(null)}>
          <div
            className="pos-modal-card bg-[#1c1e22] border border-[#2d3138] max-w-xl w-full"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="pos-modal-header border-b border-[#2d3138] pb-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center font-bold text-white text-lg shadow-md shadow-amber-900/30">
                  {selectedCustomer.fullName.charAt(0).toUpperCase()}
                </div>
                <div>
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    {selectedCustomer.fullName}
                  </h3>
                  <div className="flex items-center gap-2 mt-1">
                    {getTierBadge(
                      selectedCustomer.membershipLevelCode,
                      selectedCustomer.membershipLevelName
                    )}
                    <span className="text-xs text-gray-400 font-mono flex items-center gap-1">
                      <Phone size={12} /> {selectedCustomer.phone}
                    </span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSelectedCustomer(null)}
                className="text-gray-400 hover:text-white"
              >
                <X size={20} />
              </button>
            </div>

            {/* Quick Metrics */}
            <div className="grid grid-cols-3 gap-3 my-4">
              <div className="bg-[#141517] p-3 rounded-xl border border-[#2d3138] text-center">
                <span className="text-xs text-gray-400 block">Điểm tích lũy</span>
                <span className="text-lg font-bold text-amber-400 mt-1 block">
                  {selectedCustomer.loyaltyPoints.toLocaleString("vi-VN")}
                </span>
              </div>
              <div className="bg-[#141517] p-3 rounded-xl border border-[#2d3138] text-center">
                <span className="text-xs text-gray-400 block">Số lần ghé quán</span>
                <span className="text-lg font-bold text-white mt-1 block">
                  {selectedCustomer.totalOrders} đơn
                </span>
              </div>
              <div className="bg-[#141517] p-3 rounded-xl border border-[#2d3138] text-center">
                <span className="text-xs text-gray-400 block">Tổng chi tiêu</span>
                <span className="text-sm font-bold text-emerald-400 mt-1 block truncate">
                  {formatCurrency(selectedCustomer.totalSpent)}
                </span>
              </div>
            </div>

            {/* Adjust Points Box */}
            <div className="bg-[#141517] p-4 rounded-xl border border-[#2d3138] mb-4">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-amber-400 mb-2.5 flex items-center gap-1.5">
                <Sparkles size={14} /> Cộng / Trừ điểm thưởng
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Số điểm thay đổi (+ hoặc -)</label>
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setPointsAdjustDelta((prev) => -Math.abs(prev || 50))}
                      className={`px-2 py-1.5 rounded-lg text-xs font-bold border transition-colors cursor-pointer ${
                        pointsAdjustDelta < 0
                          ? "bg-red-950/80 border-red-600 text-red-300"
                          : "bg-[#1c1e22] border-[#2d3138] text-gray-400"
                      }`}
                    >
                      <Minus size={14} />
                    </button>
                    <input
                      type="number"
                      value={pointsAdjustDelta}
                      onChange={(e) => setPointsAdjustDelta(Number(e.target.value))}
                      className="w-full bg-[#1c1e22] border border-[#2d3138] rounded-lg px-2.5 py-1.5 text-sm text-white focus:outline-none focus:border-amber-500 font-mono text-center"
                    />
                    <button
                      type="button"
                      onClick={() => setPointsAdjustDelta((prev) => Math.abs(prev || 50))}
                      className={`px-2 py-1.5 rounded-lg text-xs font-bold border transition-colors cursor-pointer ${
                        pointsAdjustDelta > 0
                          ? "bg-emerald-950/80 border-emerald-600 text-emerald-300"
                          : "bg-[#1c1e22] border-[#2d3138] text-gray-400"
                      }`}
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs text-gray-400 mb-1">Lý do điều chỉnh</label>
                  <input
                    type="text"
                    value={pointsAdjustReason}
                    onChange={(e) => setPointsAdjustReason(e.target.value)}
                    placeholder="Ví dụ: Tặng quà sinh nhật, đổi thưởng"
                    className="w-full bg-[#1c1e22] border border-[#2d3138] rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-amber-500"
                  />
                </div>
              </div>

              <div className="mt-3 flex justify-end">
                <button
                  type="button"
                  disabled={adjustPointsMutation.isPending || !pointsAdjustDelta}
                  onClick={() =>
                    adjustPointsMutation.mutate({
                      id: selectedCustomer.id,
                      delta: pointsAdjustDelta,
                      reason: pointsAdjustReason || "Điều chỉnh thủ công từ quản lý",
                    })
                  }
                  className="px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-amber-500 hover:bg-amber-600 text-black shadow transition-all cursor-pointer disabled:opacity-50"
                >
                  {adjustPointsMutation.isPending ? "Đang xử lý..." : "Cập nhật điểm"}
                </button>
              </div>
            </div>

            {/* Point Transaction History */}
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2 flex items-center gap-1.5">
                <History size={14} /> Lịch sử điểm thưởng gần đây
              </h4>
              <div className="max-h-48 overflow-y-auto space-y-2 pr-1">
                {selectedCustomer.pointTransactions.length === 0 ? (
                  <p className="text-xs text-gray-500 italic py-2 text-center">
                    Chưa có giao dịch tích điểm nào.
                  </p>
                ) : (
                  selectedCustomer.pointTransactions.map((tx) => (
                    <div
                      key={tx.id}
                      className="bg-[#141517] p-2.5 rounded-lg border border-[#2d3138] flex items-center justify-between text-xs"
                    >
                      <div>
                        <p className="font-medium text-gray-200">{tx.reason}</p>
                        <p className="text-[11px] text-gray-500 flex items-center gap-1 mt-0.5">
                          <Calendar size={10} />
                          {new Date(tx.createdAt).toLocaleDateString("vi-VN", {
                            day: "2-digit",
                            month: "2-digit",
                            year: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                      </div>

                      <span
                        className={`font-bold font-mono text-sm ${
                          tx.pointsDelta >= 0 ? "text-emerald-400" : "text-rose-400"
                        }`}
                      >
                        {tx.pointsDelta >= 0 ? `+${tx.pointsDelta}` : tx.pointsDelta}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
