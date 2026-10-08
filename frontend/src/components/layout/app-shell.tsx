"use client";

import { useAuth } from "@/features/auth/auth-provider";
import { LoginForm } from "@/features/auth/login-form";
import { useBranch } from "@/features/branches/branch-provider";
import { PermissionGate } from "@/components/auth/permission-gate";
import { LoadingState } from "@/components/feedback/states";
import {
  ChefHat,
  Boxes,
  CreditCard,
  Grid3X3,
  LayoutDashboard,
  LogOut,
  Menu,
  Package,
  ShoppingCart,
  UserCheck,
  Users,
  UtensilsCrossed,
  X,
} from "lucide-react";
import { useState, useEffect } from "react";
import { WaiterNotifications } from "@/features/notifications/waiter-notifications";
import { ThemeToggle } from "@/components/common/theme-toggle";
import Link from "next/link";
import { usePathname } from "next/navigation";

const navigation = [
  { label: "Bảng điều khiển", href: "/", permission: "restaurant.read", icon: LayoutDashboard, enabled: true },
  { label: "POS Bán hàng", href: "/pos", permission: "order.create", icon: ShoppingCart, enabled: true },
  { label: "Trạm Bếp KDS", href: "/kitchen", permission: "kitchen.order.read", icon: ChefHat, enabled: true },
  { label: "Bàn ăn & Khu vực", href: "/tables", permission: "table.read", icon: Grid3X3, enabled: true },
  { label: "Đơn hàng", href: "/orders", permission: "order.read", icon: Package, enabled: true },
  { label: "Thanh toán", href: "/payments", permission: "payment.read", icon: CreditCard, enabled: true },
  { label: "Thực đơn món", href: "/products", permission: "product.read", icon: UtensilsCrossed, enabled: true },
  { label: "Tồn kho", href: "/inventory", permission: "inventory.read", icon: Boxes, enabled: true },
  { label: "Khách hàng", href: "/customers", permission: "customer.read", icon: Users, enabled: true },
  { label: "Nhân viên", href: "/employees", permission: "employee.read", icon: UserCheck, enabled: true },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user, isLoading, logout } = useAuth();
  const { branches, branchId, isLoading: branchesLoading, selectBranch } = useBranch();
  const [mobileOpen, setMobileOpen] = useState(false);

  if (isLoading || (user && branchesLoading)) return <LoadingState fullscreen label="Đang tải dữ liệu Quán Bếp Nhậu..." />;
  if (!user) return <LoginRedirect />;

  const currentNav = navigation.find((item) => item.href === pathname);
  const pageTitle = pathname === "/tables" ? "Bàn ăn & Khu vực" : (currentNav?.label ?? "Tổng quan");

  return (
    <div className="app-frame bg-[#141517] text-[#e5e7eb]">
      <aside className={`sidebar ${mobileOpen ? "sidebar-open" : ""}`}>
        {/* Brand Header */}
        <div className="brand">
          <div className="flex items-center gap-2">
            <span className="text-xl">🔥</span>
            <div className="flex flex-col leading-tight">
              <span className="text-[9px] font-extrabold tracking-widest text-amber-500 uppercase">QUÁN</span>
              <span className="text-base font-black tracking-tight text-white font-heading">BẾP NHẬU</span>
            </div>
            <span className="text-xl ml-0.5">🍺</span>
          </div>
          <button className="icon-button mobile-close" onClick={() => setMobileOpen(false)} aria-label="Close navigation">
            <X size={18} />
          </button>
        </div>

        <div className="sidebar-label text-amber-500/80">Menu Điều Hành</div>
        <nav className="nav-list">
          {navigation.map((item) => {
            const isActive = pathname === item.href;
            return (
              <PermissionGate key={item.label} permission={item.permission} fallback={null}>
                {item.enabled ? (
                  <Link
                    href={item.href}
                    className={`nav-item ${isActive ? "nav-active" : ""}`}
                    onClick={() => setMobileOpen(false)}
                  >
                    <item.icon size={18} />
                    <span>{item.label}</span>
                  </Link>
                ) : (
                  <button className="nav-item nav-disabled" disabled>
                    <item.icon size={18} />
                    <span>{item.label}</span>
                    <small>Sắp có</small>
                  </button>
                )}
              </PermissionGate>
            );
          })}
        </nav>

        <div className="sidebar-footer">
          <div className="connection-dot">
            <span /> SignalR KDS Trực tuyến
          </div>
          <button className="nav-item hover:text-rose-400" onClick={() => void logout()}>
            <LogOut size={18} />
            <span>Đăng xuất</span>
          </button>
        </div>
      </aside>

      {mobileOpen ? <button className="scrim" onClick={() => setMobileOpen(false)} aria-label="Close navigation" /> : null}

      <main className="main-area bg-[#141517]">
        <header className="topbar">
          <div className="flex items-center gap-2 shrink min-w-0">
            <button className="icon-button mobile-menu shrink-0" onClick={() => setMobileOpen(true)} aria-label="Open navigation">
              <Menu size={20} />
            </button>
            
            <div className="branch-control shrink min-w-0">
              <span className="muted-label hidden md:inline">Chi nhánh:</span>
              <select
                value={branchId ?? ""}
                onChange={(event) => selectBranch(event.target.value)}
                aria-label="Chọn chi nhánh"
                className="max-w-[105px] sm:max-w-[170px] truncate text-xs sm:text-sm py-1 px-2"
              >
                {branches.map((branch) => (
                  <option key={branch.id} value={branch.id}>
                    {branch.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Central Module TabBar (Dashboard, POS, Kitchen KDS) */}
          <div className="flex items-center gap-0.5 sm:gap-1 bg-[#1f2229] border border-[#353a45] p-1 rounded-xl shadow-inner shrink-0">
            <Link
              href="/"
              className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                pathname === "/"
                  ? "bg-gradient-to-b from-[#e44d13] to-[#b82d02] text-white shadow-md shadow-orange-950/40"
                  : "text-gray-400 hover:text-white hover:bg-[#282c35]"
              }`}
              title="Dashboard Quản lý"
            >
              <LayoutDashboard size={15} />
              <span className="hidden md:inline">Dashboard</span>
            </Link>

            <Link
              href="/pos"
              className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                pathname === "/pos"
                  ? "bg-gradient-to-b from-[#e44d13] to-[#b82d02] text-white shadow-md shadow-orange-950/40"
                  : "text-gray-400 hover:text-white hover:bg-[#282c35]"
              }`}
              title="Điểm bán hàng (POS)"
            >
              <ShoppingCart size={15} />
              <span className="hidden md:inline">POS Bán Hàng</span>
            </Link>

            <Link
              href="/kitchen"
              className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                pathname === "/kitchen"
                  ? "bg-gradient-to-b from-[#e44d13] to-[#b82d02] text-white shadow-md shadow-orange-950/40"
                  : "text-gray-400 hover:text-white hover:bg-[#282c35]"
              }`}
              title="Trạm Bếp KDS"
            >
              <ChefHat size={15} />
              <span className="hidden md:inline">Trạm Bếp KDS</span>
            </Link>

            <Link
              href="/tables"
              className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                pathname === "/tables"
                  ? "bg-gradient-to-b from-[#e44d13] to-[#b82d02] text-white shadow-md shadow-orange-950/40"
                  : "text-gray-400 hover:text-white hover:bg-[#282c35]"
              }`}
              title="Bàn ăn & Khu vực"
            >
              <Grid3X3 size={15} />
              <span className="hidden md:inline">Bàn ăn &amp; Khu vực</span>
            </Link>
          </div>

          <div className="topbar-tools shrink-0 flex items-center gap-1.5 sm:gap-3">
            <ThemeToggle />
            <div className="user-chip">
              <span className="avatar">{user.username.slice(0, 1).toUpperCase()}</span>
              <span className="hidden md:inline">{user.username}</span>
            </div>
            <button
              type="button"
              onClick={() => void logout()}
              className="icon-button hover:text-rose-400 p-1.5"
              title="Đăng xuất"
            >
              <LogOut size={16} />
            </button>
          </div>
        </header>

        <div className="content-wrap">
          <div className="crumb">
            Quán Bếp Nhậu <span>/</span> <span className="text-amber-400">{pageTitle}</span>
          </div>
          {children}
        </div>

        {/* Global Waiter Real-time Audio & Popup Notification System */}
        <WaiterNotifications />
      </main>
    </div>
  );
}

function LoginRedirect() {
  useEffect(() => {
    window.location.replace("/login");
  }, []);
  return <LoginForm />;
}