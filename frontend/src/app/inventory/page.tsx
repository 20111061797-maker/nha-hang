import { AppShell } from "@/components/layout/app-shell";
import { InventoryView } from "@/features/inventory/inventory-view";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Quản lý Kho & Tồn kho | Quán Bếp Nhậu",
  description: "Theo dõi định mức nguyên vật liệu, giá trị vốn tồn kho và lịch sử nhập xuất hàng",
};

export default function InventoryPage() {
  return (
    <AppShell>
      <InventoryView />
    </AppShell>
  );
}
