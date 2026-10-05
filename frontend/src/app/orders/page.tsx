import { AppShell } from "@/components/layout/app-shell";
import { OrdersView } from "@/features/orders/orders-view";

export const metadata = {
  title: "Quản lý Đơn hàng | Quán Bếp Nhậu",
  description: "Sổ đơn hàng điều hành, chi tiết hóa đơn, trạng thái phục vụ và thanh toán",
};

export default function OrdersPage() {
  return (
    <AppShell>
      <OrdersView />
    </AppShell>
  );
}
