"use client";

import { useAuth } from "@/features/auth/auth-provider";
import { LoginForm } from "@/features/auth/login-form";
import { useBranch } from "@/features/branches/branch-provider";
import { PermissionGate } from "@/components/auth/permission-gate";
import { LoadingState } from "@/components/feedback/states";
import { Building2, ChefHat, CreditCard, LayoutDashboard, LogOut, Menu, Package, Search, ShoppingCart, Users, X } from "lucide-react";
import { useState } from "react";
import { useEffect } from "react";

const navigation = [
  { label: "Dashboard", permission: "restaurant.read", icon: LayoutDashboard, active: true },
  { label: "POS", permission: "order.create", icon: ShoppingCart },
  { label: "Kitchen", permission: "kitchen.order.read", icon: ChefHat },
  { label: "Orders", permission: "order.read", icon: Package },
  { label: "Payments", permission: "payment.read", icon: CreditCard },
  { label: "Products", permission: "product.read", icon: Package },
  { label: "Customers", permission: "customer.read", icon: Users },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  const { user, isLoading, logout } = useAuth();
  const { branches, branchId, isLoading: branchesLoading, selectBranch } = useBranch();
  const [mobileOpen, setMobileOpen] = useState(false);

  if (isLoading || (user && branchesLoading)) return <LoadingState />;
  if (!user) return <LoginRedirect />;

  return <div className="app-frame">
    <aside className={`sidebar ${mobileOpen ? "sidebar-open" : ""}`}>
      <div className="brand"><span className="brand-mark"><Building2 size={18} /></span><span>Plate &amp; Place</span><button className="icon-button mobile-close" onClick={() => setMobileOpen(false)} aria-label="Close navigation"><X size={18} /></button></div>
      <div className="sidebar-label">Workspace</div>
      <nav className="nav-list">
        {navigation.map((item) => <PermissionGate key={item.label} permission={item.permission} fallback={null}><button className={`nav-item ${item.active ? "nav-active" : "nav-disabled"}`} disabled={!item.active} onClick={() => setMobileOpen(false)}><item.icon size={18} /><span>{item.label}</span>{!item.active ? <small>Soon</small> : null}</button></PermissionGate>)}
      </nav>
      <div className="sidebar-footer"><div className="connection-dot"><span /> API connected</div><button className="nav-item" onClick={() => void logout()}><LogOut size={18} /><span>Sign out</span></button></div>
    </aside>
    {mobileOpen ? <button className="scrim" onClick={() => setMobileOpen(false)} aria-label="Close navigation" /> : null}
    <main className="main-area">
      <header className="topbar"><button className="icon-button mobile-menu" onClick={() => setMobileOpen(true)} aria-label="Open navigation"><Menu size={20} /></button><div className="branch-control"><span className="muted-label">Operating branch</span><select value={branchId ?? ""} onChange={(event) => selectBranch(event.target.value)} aria-label="Select branch">{branches.map((branch) => <option key={branch.id} value={branch.id}>{branch.name}</option>)}</select></div><div className="topbar-tools"><button className="icon-button" aria-label="Search"><Search size={18} /></button><div className="user-chip"><span className="avatar">{user.username.slice(0, 1).toUpperCase()}</span><span>{user.username}</span></div></div></header>
      <div className="content-wrap"><div className="crumb">Restaurant operations <span>/</span> Overview</div>{children}</div>
    </main>
  </div>;
}

function LoginRedirect() {
  useEffect(() => { window.location.replace("/login"); }, []);
  return <LoginForm />;
}