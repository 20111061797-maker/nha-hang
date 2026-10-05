import { AppShell } from "@/components/layout/app-shell";
import { ProductsView } from "@/features/products/products-view";

export const metadata = {
  title: "Thực đơn món | Quán Bếp Nhậu",
  description: "Quản lý danh sách món ăn, giá bán và trạng thái còn món theo thời gian thực",
};

export default function ProductsPage() {
  return (
    <AppShell>
      <ProductsView />
    </AppShell>
  );
}
