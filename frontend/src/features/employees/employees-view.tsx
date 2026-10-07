"use client";

import { useMemo, useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { employeeApi } from "@/lib/api/employee-api";
import { Pagination } from "@/components/common/pagination";
import { useBranch } from "@/features/branches/branch-provider";
import type { EmployeeItem, CreateEmployeePayload, UpdateEmployeePayload } from "@/types/employees";
import {
  Users,
  UserPlus,
  Search,
  ChefHat,
  CreditCard,
  UtensilsCrossed,
  Shield,
  Crown,
  Key,
  Phone,
  Building,
  CheckCircle2,
  AlertCircle,
  X,
  Edit2,
  Lock,
  UserCheck,
  UserX,
  Eye,
  EyeOff,
  Sparkles,
  RefreshCw,
  MoreVertical,
} from "lucide-react";

const ROLE_OPTIONS = [
  { value: "Manager", label: "Quản lý", icon: Crown, color: "text-amber-400 bg-amber-500/10 border-amber-500/30" },
  { value: "Cashier", label: "Thu ngân (POS)", icon: CreditCard, color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/30" },
  { value: "Kitchen", label: "Đầu bếp (KDS)", icon: ChefHat, color: "text-orange-400 bg-orange-500/10 border-orange-500/30" },
  { value: "Waiter", label: "Nhân viên Phục vụ", icon: UtensilsCrossed, color: "text-sky-400 bg-sky-500/10 border-sky-500/30" },
];

function getRoleBadge(roles: string[]) {
  if (!roles || roles.length === 0) {
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-800 text-gray-400 border border-gray-700">
        Chưa phân quyền
      </span>
    );
  }

  const primaryRole = roles[0];
  const matched = ROLE_OPTIONS.find((r) => r.value.toLowerCase() === primaryRole.toLowerCase());

  if (matched) {
    const Icon = matched.icon;
    return (
      <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${matched.color}`}>
        <Icon size={12} />
        {matched.label}
      </span>
    );
  }

  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-purple-500/10 text-purple-400 border border-purple-500/30">
      <Shield size={12} />
      {primaryRole}
    </span>
  );
}

export function EmployeesView() {
  const queryClient = useQueryClient();
  const { branches, branchId: currentBranchId } = useBranch();

  const [search, setSearch] = useState("");
  const [selectedBranchId, setSelectedBranchId] = useState<string>("ALL");
  const [selectedRole, setSelectedRole] = useState<string>("ALL");
  const [selectedStatus, setSelectedStatus] = useState<string>("ALL");
  const [page, setPage] = useState(1);

  // Reset về trang 1 khi đổi bộ lọc hoặc tìm kiếm
  useEffect(() => {
    setPage(1);
  }, [search, selectedBranchId, selectedRole, selectedStatus]);

  // Modals state
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [editingEmployee, setEditingEmployee] = useState<EmployeeItem | null>(null);

  // Form states for Create
  const [formFullName, setFormFullName] = useState("");
  const [formPhone, setFormPhone] = useState("");
  const [formEmployeeCode, setFormEmployeeCode] = useState("");
  const [formBranchId, setFormBranchId] = useState("");
  const [formRole, setFormRole] = useState("Waiter");
  const [formCreateAccount, setFormCreateAccount] = useState(false);
  const [formUsername, setFormUsername] = useState("");
  const [formPassword, setFormPassword] = useState("");
  const [formEmail, setFormEmail] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Form states for Edit
  const [editFullName, setEditFullName] = useState("");
  const [editPhone, setEditPhone] = useState("");
  const [editBranchId, setEditBranchId] = useState("");
  const [editRole, setEditRole] = useState("");
  const [editIsActive, setEditIsActive] = useState(true);
  const [editNewPassword, setEditNewPassword] = useState("");

  const [notice, setNotice] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const showNotice = (type: "success" | "error", message: string) => {
    setNotice({ type, message });
    setTimeout(() => setNotice(null), 4000);
  };

  // Queries
  const { data: employees = [], isLoading } = useQuery({
    queryKey: ["employees", selectedBranchId, search, selectedStatus],
    queryFn: () =>
      employeeApi.getEmployees({
        branchId: selectedBranchId !== "ALL" ? selectedBranchId : undefined,
        search: search.trim() || undefined,
        isActive: selectedStatus === "ACTIVE" ? true : selectedStatus === "INACTIVE" ? false : undefined,
      }),
  });

  // Create Mutation
  const createMutation = useMutation({
    mutationFn: employeeApi.createEmployee,
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["employees"] });
      setCreateModalOpen(false);
      resetCreateForm();
      showNotice("success", `Đã thêm nhân viên ${res.fullName} (${res.employeeCode}) thành công!`);
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : "Không thể tạo nhân viên.";
      showNotice("error", msg);
    },
  });

  // Update Mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: UpdateEmployeePayload }) =>
      employeeApi.updateEmployee(id, payload),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["employees"] });
      setEditingEmployee(null);
      showNotice("success", `Đã cập nhật thông tin nhân viên ${res.fullName} thành công!`);
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : "Không thể cập nhật nhân viên.";
      showNotice("error", msg);
    },
  });

  // Deactivate Mutation
  const deactivateMutation = useMutation({
    mutationFn: employeeApi.deleteEmployee,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["employees"] });
      showNotice("success", "Đã ngưng hoạt động nhân viên thành công.");
    },
    onError: (err: unknown) => {
      const msg = err instanceof Error ? err.message : "Thao tác thất bại.";
      showNotice("error", msg);
    },
  });

  const resetCreateForm = () => {
    setFormFullName("");
    setFormPhone("");
    setFormEmployeeCode("");
    setFormBranchId(currentBranchId || (branches[0]?.id ?? ""));
    setFormRole("Waiter");
    setFormCreateAccount(false);
    setFormUsername("");
    setFormPassword("");
    setFormEmail("");
  };

  const openCreateModal = () => {
    resetCreateForm();
    setCreateModalOpen(true);
  };

  const openEditModal = (emp: EmployeeItem) => {
    setEditingEmployee(emp);
    setEditFullName(emp.fullName);
    setEditPhone(emp.phone ?? "");
    setEditBranchId(emp.branchId);
    setEditRole(emp.roles[0] ?? "Waiter");
    setEditIsActive(emp.isActive);
    setEditNewPassword("");
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formFullName.trim()) {
      showNotice("error", "Vui lòng nhập họ và tên nhân viên.");
      return;
    }
    const branchToUse = formBranchId || currentBranchId || branches[0]?.id;
    if (!branchToUse) {
      showNotice("error", "Vui lòng chọn chi nhánh.");
      return;
    }

    createMutation.mutate({
      branchId: branchToUse,
      employeeCode: formEmployeeCode.trim() || undefined,
      fullName: formFullName.trim(),
      phone: formPhone.trim() || undefined,
      role: formRole,
      createLoginAccount: formCreateAccount,
      username: formCreateAccount ? formUsername.trim() : undefined,
      password: formCreateAccount ? formPassword.trim() : undefined,
      email: formCreateAccount && formEmail.trim() ? formEmail.trim() : undefined,
    });
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEmployee) return;
    if (!editFullName.trim()) {
      showNotice("error", "Vui lòng nhập họ và tên nhân viên.");
      return;
    }

    updateMutation.mutate({
      id: editingEmployee.id,
      payload: {
        branchId: editBranchId,
        fullName: editFullName.trim(),
        phone: editPhone.trim() || undefined,
        isActive: editIsActive,
        role: editRole,
        newPassword: editNewPassword.trim() || undefined,
      },
    });
  };

  // Filter employees
  const filteredEmployees = useMemo(() => {
    return employees.filter((emp) => {
      if (selectedRole !== "ALL") {
        const hasRole = emp.roles.some((r) => r.toLowerCase() === selectedRole.toLowerCase());
        if (!hasRole) return false;
      }
      return true;
    });
  }, [employees, selectedRole]);

  const PAGE_SIZE = 10;
  const paginatedEmployees = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filteredEmployees.slice(start, start + PAGE_SIZE);
  }, [filteredEmployees, page]);

  // Stats counters
  const totalCount = employees.length;
  const activeCount = employees.filter((e) => e.isActive).length;
  const posCount = employees.filter((e) => e.roles.some((r) => ["cashier", "waiter"].includes(r.toLowerCase()))).length;
  const kitchenCount = employees.filter((e) => e.roles.some((r) => r.toLowerCase() === "kitchen")).length;

  return (
    <div className="space-y-6">
      {/* Toast Notice */}
      {notice && (
        <div
          className={`fixed top-5 right-5 z-50 flex items-center gap-3 p-4 rounded-2xl shadow-2xl border text-sm font-bold backdrop-blur-xl animate-in slide-in-from-top-4 ${
            notice.type === "success"
              ? "bg-emerald-950/90 border-emerald-500/50 text-emerald-200"
              : "bg-rose-950/90 border-rose-500/50 text-rose-200"
          }`}
        >
          {notice.type === "success" ? <CheckCircle2 size={18} className="text-emerald-400 shrink-0" /> : <AlertCircle size={18} className="text-rose-400 shrink-0" />}
          <span>{notice.message}</span>
        </div>
      )}

      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-[#171a22] via-[#1c212c] to-[#171a22] p-6 rounded-3xl border border-[#2b3345] shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 -mt-8 -mr-8 w-44 h-44 bg-orange-500/10 rounded-full blur-3xl pointer-events-none" />
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-orange-500/20 text-orange-400 border border-orange-500/30">
              Quản trị nhân sự
            </span>
            <span className="text-xs text-gray-400 font-mono">Quán Bếp Nhậu</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-white font-heading tracking-tight">
            Đội ngũ Nhân viên
          </h1>
          <p className="text-xs sm:text-sm text-gray-400 mt-1 max-w-xl">
            Quản lý danh sách nhân sự, phân quyền vai trò (Thu ngân, Phục vụ, Đầu bếp) và cấp tài khoản đăng nhập hệ thống POS/KDS.
          </p>
        </div>

        <button
          type="button"
          onClick={openCreateModal}
          className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-extrabold text-xs shadow-lg shadow-orange-950/40 active:scale-95 transition-all cursor-pointer shrink-0"
        >
          <UserPlus size={16} />
          <span>Thêm nhân viên mới</span>
        </button>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-[#181c25] border border-[#272e3d] p-4.5 rounded-2xl flex items-center gap-3.5 shadow-md">
          <div className="w-12 h-12 rounded-xl bg-orange-500/15 border border-orange-500/30 text-orange-400 flex items-center justify-center shrink-0">
            <Users size={22} />
          </div>
          <div>
            <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block">
              Tổng nhân sự
            </span>
            <span className="text-2xl font-black text-white font-mono">{totalCount}</span>
          </div>
        </div>

        <div className="bg-[#181c25] border border-[#272e3d] p-4.5 rounded-2xl flex items-center gap-3.5 shadow-md">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center justify-center shrink-0 relative">
            <UserCheck size={22} />
            <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-emerald-400 rounded-full animate-ping" />
          </div>
          <div>
            <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block">
              Đang làm việc
            </span>
            <span className="text-2xl font-black text-emerald-400 font-mono">{activeCount}</span>
          </div>
        </div>

        <div className="bg-[#181c25] border border-[#272e3d] p-4.5 rounded-2xl flex items-center gap-3.5 shadow-md">
          <div className="w-12 h-12 rounded-xl bg-sky-500/15 border border-sky-500/30 text-sky-400 flex items-center justify-center shrink-0">
            <CreditCard size={22} />
          </div>
          <div>
            <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block">
              Thu ngân &amp; Phục vụ
            </span>
            <span className="text-2xl font-black text-sky-400 font-mono">{posCount}</span>
          </div>
        </div>

        <div className="bg-[#181c25] border border-[#272e3d] p-4.5 rounded-2xl flex items-center gap-3.5 shadow-md">
          <div className="w-12 h-12 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-400 flex items-center justify-center shrink-0">
            <ChefHat size={22} />
          </div>
          <div>
            <span className="text-[11px] font-bold text-gray-400 uppercase tracking-wider block">
              Đầu bếp KDS
            </span>
            <span className="text-2xl font-black text-amber-400 font-mono">{kitchenCount}</span>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-[#181c25] border border-[#272e3d] p-4 rounded-2xl flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 shadow-md">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm theo tên, mã nhân viên (NV001), số điện thoại..."
            className="w-full bg-[#12151d] border border-[#262c3b] rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-orange-500 transition-colors"
          />
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Branch filter */}
          <select
            value={selectedBranchId}
            onChange={(e) => setSelectedBranchId(e.target.value)}
            className="bg-[#12151d] border border-[#262c3b] rounded-xl px-3 py-2.5 text-xs text-gray-200 focus:outline-none focus:border-orange-500 transition-colors cursor-pointer"
          >
            <option value="ALL">Tất cả chi nhánh</option>
            {branches.map((b) => (
              <option key={b.id} value={b.id}>
                {b.name}
              </option>
            ))}
          </select>

          {/* Role filter */}
          <select
            value={selectedRole}
            onChange={(e) => setSelectedRole(e.target.value)}
            className="bg-[#12151d] border border-[#262c3b] rounded-xl px-3 py-2.5 text-xs text-gray-200 focus:outline-none focus:border-orange-500 transition-colors cursor-pointer"
          >
            <option value="ALL">Tất cả vai trò</option>
            {ROLE_OPTIONS.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>

          {/* Status filter */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="bg-[#12151d] border border-[#262c3b] rounded-xl px-3 py-2.5 text-xs text-gray-200 focus:outline-none focus:border-orange-500 transition-colors cursor-pointer"
          >
            <option value="ALL">Mọi trạng thái</option>
            <option value="ACTIVE">Đang làm việc</option>
            <option value="INACTIVE">Đã ngưng việc</option>
          </select>
        </div>
      </div>

      {/* Employees Table */}
      <div className="bg-[#181c25] border border-[#272e3d] rounded-2xl shadow-xl overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-gray-400 flex flex-col items-center justify-center gap-2">
            <RefreshCw size={24} className="animate-spin text-orange-400" />
            <span className="text-xs font-semibold">Đang tải danh sách nhân viên...</span>
          </div>
        ) : filteredEmployees.length === 0 ? (
          <div className="p-12 text-center text-gray-400 flex flex-col items-center justify-center gap-3">
            <div className="w-16 h-16 rounded-2xl bg-gray-800/50 border border-gray-700/60 flex items-center justify-center text-gray-500">
              <Users size={28} />
            </div>
            <div>
              <p className="text-sm font-bold text-gray-200">Không tìm thấy nhân viên nào</p>
              <p className="text-xs text-gray-500 mt-0.5">
                {search ? "Thử tìm kiếm với từ khóa khác hoặc xóa bộ lọc." : "Chưa có nhân viên nào trong danh sách. Hãy thêm nhân viên mới!"}
              </p>
            </div>
            {!search && (
              <button
                type="button"
                onClick={openCreateModal}
                className="mt-2 px-4 py-2 rounded-xl bg-orange-500/20 text-orange-400 hover:bg-orange-500/30 border border-orange-500/40 text-xs font-bold transition-all cursor-pointer"
              >
                + Thêm nhân viên đầu tiên
              </button>
            )}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-[#262c3b] bg-[#141720] text-gray-400 uppercase text-[10px] font-bold tracking-wider">
                  <th className="py-3.5 px-4">Mã NV</th>
                  <th className="py-3.5 px-4">Nhân viên</th>
                  <th className="py-3.5 px-4">Vai trò / Chức vụ</th>
                  <th className="py-3.5 px-4">Chi nhánh</th>
                  <th className="py-3.5 px-4">Tài khoản đăng nhập</th>
                  <th className="py-3.5 px-4">Trạng thái</th>
                  <th className="py-3.5 px-4 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#262c3b]/60">
                {paginatedEmployees.map((emp) => (
                  <tr key={emp.id} className="hover:bg-[#1f2430]/60 transition-colors">
                    {/* Code */}
                    <td className="py-3.5 px-4">
                      <span className="font-mono font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20">
                        {emp.employeeCode}
                      </span>
                    </td>

                    {/* Name & Phone */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-orange-500/30 to-amber-500/20 text-orange-300 border border-orange-500/30 flex items-center justify-center font-bold text-xs shrink-0 font-heading">
                          {emp.fullName.slice(0, 1).toUpperCase()}
                        </div>
                        <div>
                          <span className="font-bold text-white text-sm block leading-tight">
                            {emp.fullName}
                          </span>
                          {emp.phone ? (
                            <span className="text-[11px] text-gray-400 font-mono flex items-center gap-1 mt-0.5">
                              <Phone size={10} className="text-gray-500" />
                              {emp.phone}
                            </span>
                          ) : (
                            <span className="text-[10px] text-gray-600 italic">Chưa có SĐT</span>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Role */}
                    <td className="py-3.5 px-4">{getRoleBadge(emp.roles)}</td>

                    {/* Branch */}
                    <td className="py-3.5 px-4">
                      <span className="inline-flex items-center gap-1 text-gray-300 text-xs">
                        <Building size={12} className="text-gray-500" />
                        {emp.branchName}
                      </span>
                    </td>

                    {/* User Account */}
                    <td className="py-3.5 px-4">
                      {emp.username ? (
                        <div className="flex items-center gap-1.5 text-emerald-400 font-mono text-[11px]">
                          <UserCheck size={13} className="text-emerald-400" />
                          <span className="font-bold">{emp.username}</span>
                        </div>
                      ) : (
                        <span className="text-gray-500 text-[11px] flex items-center gap-1">
                          <UserX size={12} className="text-gray-600" />
                          Chưa cấp
                        </span>
                      )}
                    </td>

                    {/* Status */}
                    <td className="py-3.5 px-4">
                      {emp.isActive ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                          Đang làm việc
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-gray-800 text-gray-400 border border-gray-700">
                          Đã ngưng việc
                        </span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right">
                      <div className="inline-flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => openEditModal(emp)}
                          className="px-2.5 py-1.5 rounded-lg bg-[#252b39] hover:bg-[#2d3546] text-gray-200 hover:text-white font-semibold text-xs border border-white/5 transition-colors cursor-pointer flex items-center gap-1"
                        >
                          <Edit2 size={12} />
                          <span>Sửa</span>
                        </button>

                        {emp.isActive && (
                          <button
                            type="button"
                            onClick={() => {
                              if (confirm(`Bạn có chắc muốn ngưng hoạt động nhân viên "${emp.fullName}"?`)) {
                                deactivateMutation.mutate(emp.id);
                              }
                            }}
                            className="px-2 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 font-semibold text-xs border border-rose-500/20 transition-colors cursor-pointer"
                            title="Ngưng hoạt động"
                          >
                            <UserX size={12} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {filteredEmployees.length > 0 && (
          <Pagination
            currentPage={page}
            totalItems={filteredEmployees.length}
            pageSize={PAGE_SIZE}
            onPageChange={setPage}
            itemLabel="nhân viên"
          />
        )}
      </div>

      {/* CREATE EMPLOYEE MODAL */}
      {createModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-[#181c25] border border-[#2c3446] w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95">
            {/* Modal Header */}
            <div className="p-5 border-b border-[#252c3c] flex items-center justify-between bg-gradient-to-r from-orange-500/10 to-amber-500/5">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-orange-500/20 border border-orange-500/30 text-orange-400 flex items-center justify-center">
                  <UserPlus size={18} />
                </div>
                <div>
                  <h3 className="text-base font-black text-white font-heading">Thêm Nhân Viên Mới</h3>
                  <p className="text-[11px] text-gray-400">Điền thông tin nhân sự và thiết lập vai trò làm việc</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setCreateModalOpen(false)}
                className="w-8 h-8 rounded-full bg-[#202533] hover:bg-[#282f40] text-gray-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleCreateSubmit} className="p-5 space-y-4 overflow-y-auto flex-1">
              {/* Branch */}
              <div>
                <label className="block text-[11px] font-bold text-gray-300 mb-1">Chi nhánh làm việc *</label>
                <select
                  value={formBranchId}
                  onChange={(e) => setFormBranchId(e.target.value)}
                  className="w-full bg-[#12151d] border border-[#262c3b] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-orange-500"
                  required
                >
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Full Name & Phone */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-gray-300 mb-1">Họ và tên *</label>
                  <input
                    type="text"
                    value={formFullName}
                    onChange={(e) => setFormFullName(e.target.value)}
                    placeholder="Ví dụ: Nguyễn Văn Hưng"
                    className="w-full bg-[#12151d] border border-[#262c3b] rounded-xl px-3 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-orange-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-gray-300 mb-1">Số điện thoại</label>
                  <input
                    type="tel"
                    value={formPhone}
                    onChange={(e) => setFormPhone(e.target.value)}
                    placeholder="09xx..."
                    className="w-full bg-[#12151d] border border-[#262c3b] rounded-xl px-3 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-orange-500 font-mono"
                  />
                </div>
              </div>

              {/* Code & Role */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-gray-300 mb-1">
                    Mã nhân viên (Tùy chọn)
                  </label>
                  <input
                    type="text"
                    value={formEmployeeCode}
                    onChange={(e) => setFormEmployeeCode(e.target.value)}
                    placeholder="Để trống sẽ tự sinh (NV001...)"
                    className="w-full bg-[#12151d] border border-[#262c3b] rounded-xl px-3 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-orange-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-gray-300 mb-1">Vai trò / Chức danh *</label>
                  <select
                    value={formRole}
                    onChange={(e) => setFormRole(e.target.value)}
                    className="w-full bg-[#12151d] border border-[#262c3b] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-orange-500"
                  >
                    {ROLE_OPTIONS.map((r) => (
                      <option key={r.value} value={r.value}>
                        {r.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Switch Create Login Account */}
              <div className="pt-2 border-t border-[#252c3c]">
                <label className="flex items-center justify-between p-3 rounded-xl bg-[#131620] border border-[#262d3e] cursor-pointer">
                  <div className="flex items-center gap-2.5">
                    <Key size={16} className="text-amber-400" />
                    <div>
                      <span className="text-xs font-bold text-white block">Cấp tài khoản đăng nhập hệ thống</span>
                      <span className="text-[10px] text-gray-400">Cho phép nhân viên đăng nhập vào POS / KDS</span>
                    </div>
                  </div>
                  <input
                    type="checkbox"
                    checked={formCreateAccount}
                    onChange={(e) => {
                      setFormCreateAccount(e.target.checked);
                      if (e.target.checked && !formUsername && formFullName) {
                        const slug = formFullName
                          .toLowerCase()
                          .normalize("NFD")
                          .replace(/[\u0300-\u036f]/g, "")
                          .replace(/[^a-z0-9]/g, "");
                        setFormUsername(slug || "nhanvien");
                      }
                    }}
                    className="w-4 h-4 rounded text-orange-500 focus:ring-orange-500 border-gray-700 cursor-pointer"
                  />
                </label>
              </div>

              {/* Login Account Details */}
              {formCreateAccount && (
                <div className="space-y-3 bg-[#131620] p-3.5 rounded-xl border border-amber-500/20 animate-in slide-in-from-top-2">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold text-gray-300 mb-1">Tên đăng nhập *</label>
                      <input
                        type="text"
                        value={formUsername}
                        onChange={(e) => setFormUsername(e.target.value)}
                        placeholder="ví dụ: hung_nv"
                        className="w-full bg-[#1b1f2b] border border-[#2d3548] rounded-xl px-3 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-orange-500 font-mono"
                        required={formCreateAccount}
                      />
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-gray-300 mb-1">Mật khẩu * (Tối thiểu 6 ký tự)</label>
                      <div className="relative">
                        <input
                          type={showPassword ? "text" : "password"}
                          value={formPassword}
                          onChange={(e) => setFormPassword(e.target.value)}
                          placeholder="Mật khẩu..."
                          className="w-full bg-[#1b1f2b] border border-[#2d3548] rounded-xl px-3 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-orange-500 font-mono pr-8"
                          required={formCreateAccount}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white"
                        >
                          {showPassword ? <EyeOff size={13} /> : <Eye size={13} />}
                        </button>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-gray-300 mb-1">Email liên hệ (Tùy chọn)</label>
                    <input
                      type="email"
                      value={formEmail}
                      onChange={(e) => setFormEmail(e.target.value)}
                      placeholder="email@example.com"
                      className="w-full bg-[#1b1f2b] border border-[#2d3548] rounded-xl px-3 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-orange-500"
                    />
                  </div>
                </div>
              )}

              {/* Submit Buttons */}
              <div className="pt-3 border-t border-[#252c3c] flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setCreateModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-[#202533] hover:bg-[#282f40] text-gray-300 font-bold text-xs transition-colors cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  disabled={createMutation.isPending}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-extrabold text-xs shadow-lg shadow-orange-950/40 active:scale-95 transition-all cursor-pointer flex items-center gap-1.5"
                >
                  {createMutation.isPending && <RefreshCw size={14} className="animate-spin" />}
                  <span>Lưu Nhân Viên</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT EMPLOYEE MODAL */}
      {editingEmployee && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-[#181c25] border border-[#2c3446] w-full max-w-lg rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in zoom-in-95">
            {/* Modal Header */}
            <div className="p-5 border-b border-[#252c3c] flex items-center justify-between bg-gradient-to-r from-sky-500/10 to-indigo-500/5">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-sky-500/20 border border-sky-500/30 text-sky-400 flex items-center justify-center">
                  <Edit2 size={18} />
                </div>
                <div>
                  <h3 className="text-base font-black text-white font-heading">
                    Chỉnh sửa: {editingEmployee.fullName}
                  </h3>
                  <p className="text-[11px] text-gray-400 font-mono">Mã NV: {editingEmployee.employeeCode}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setEditingEmployee(null)}
                className="w-8 h-8 rounded-full bg-[#202533] hover:bg-[#282f40] text-gray-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleEditSubmit} className="p-5 space-y-4 overflow-y-auto flex-1">
              {/* Branch */}
              <div>
                <label className="block text-[11px] font-bold text-gray-300 mb-1">Chi nhánh làm việc *</label>
                <select
                  value={editBranchId}
                  onChange={(e) => setEditBranchId(e.target.value)}
                  className="w-full bg-[#12151d] border border-[#262c3b] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-orange-500"
                  required
                >
                  {branches.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Full Name & Phone */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-gray-300 mb-1">Họ và tên *</label>
                  <input
                    type="text"
                    value={editFullName}
                    onChange={(e) => setEditFullName(e.target.value)}
                    className="w-full bg-[#12151d] border border-[#262c3b] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-orange-500"
                    required
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-gray-300 mb-1">Số điện thoại</label>
                  <input
                    type="tel"
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    className="w-full bg-[#12151d] border border-[#262c3b] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-orange-500 font-mono"
                  />
                </div>
              </div>

              {/* Role & Status */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-bold text-gray-300 mb-1">Vai trò / Chức danh</label>
                  <select
                    value={editRole}
                    onChange={(e) => setEditRole(e.target.value)}
                    className="w-full bg-[#12151d] border border-[#262c3b] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-orange-500"
                  >
                    {ROLE_OPTIONS.map((r) => (
                      <option key={r.value} value={r.value}>
                        {r.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-gray-300 mb-1">Trạng thái làm việc</label>
                  <select
                    value={editIsActive ? "true" : "false"}
                    onChange={(e) => setEditIsActive(e.target.value === "true")}
                    className="w-full bg-[#12151d] border border-[#262c3b] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-orange-500"
                  >
                    <option value="true">Đang làm việc</option>
                    <option value="false">Đã ngưng việc</option>
                  </select>
                </div>
              </div>

              {/* Reset Password if user account linked */}
              {editingEmployee.username && (
                <div className="pt-2 border-t border-[#252c3c]">
                  <div className="bg-[#131620] p-3 rounded-xl border border-gray-800">
                    <div className="flex items-center gap-2 mb-2 text-xs text-amber-400 font-bold">
                      <Lock size={14} />
                      <span>Đổi mật khẩu tài khoản ({editingEmployee.username})</span>
                    </div>
                    <input
                      type="password"
                      value={editNewPassword}
                      onChange={(e) => setEditNewPassword(e.target.value)}
                      placeholder="Để trống nếu không muốn đổi mật khẩu"
                      className="w-full bg-[#1b1f2b] border border-[#2d3548] rounded-xl px-3 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-orange-500 font-mono"
                    />
                  </div>
                </div>
              )}

              {/* Submit Buttons */}
              <div className="pt-3 border-t border-[#252c3c] flex items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setEditingEmployee(null)}
                  className="px-4 py-2.5 rounded-xl bg-[#202533] hover:bg-[#282f40] text-gray-300 font-bold text-xs transition-colors cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button
                  type="submit"
                  disabled={updateMutation.isPending}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-extrabold text-xs shadow-lg shadow-orange-950/40 active:scale-95 transition-all cursor-pointer flex items-center gap-1.5"
                >
                  {updateMutation.isPending && <RefreshCw size={14} className="animate-spin" />}
                  <span>Cập nhật</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
