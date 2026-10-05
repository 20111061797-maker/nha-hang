import { AppShell } from "@/components/layout/app-shell";
import { CustomersView } from "@/features/customers/customers-view";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Quản lý Khách hàng & Hội viên | Plate & Place",
  description: "Chăm sóc khách hàng, phân hạng hội viên và tích điểm ưu đãi",
};

export default function CustomersPage() {
  return (
    <AppShell>
      <CustomersView />
    </AppShell>
  );
}
