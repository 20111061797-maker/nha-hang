import { AppShell } from "@/components/layout/app-shell";
import { KitchenView } from "@/features/kitchen/kitchen-view";

export const metadata = {
  title: "Màn hình Bếp (KDS) | Plate & Place",
  description: "Kitchen Display System cho trạm bếp nhận đơn và cập nhật tiến độ chế biến theo thời gian thực",
};

export default function KitchenPage() {
  return (
    <AppShell>
      <KitchenView />
    </AppShell>
  );
}
