import { AppShell } from "@/components/layout/app-shell";
import { TablesManagementView } from "@/features/tables/tables-management-view";

export const metadata = {
  title: "Sơ Đồ Bàn Ăn & Khu Vực | Quán Bếp Nhậu",
  description: "Quản lý danh sách bàn ăn, khu vực và mã QR đặt món trực tiếp tại bàn",
};

export default function TablesPage() {
  return (
    <AppShell>
      <TablesManagementView />
    </AppShell>
  );
}
