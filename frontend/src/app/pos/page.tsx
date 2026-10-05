import { AppShell } from "@/components/layout/app-shell";
import { PosView } from "@/features/pos/pos-view";

export const metadata = {
  title: "Điểm bán hàng (POS) | Plate & Place",
  description: "Sơ đồ bàn ăn, chọn thực đơn, tạo đơn hàng và gửi bếp",
};

export default function PosPage() {
  return (
    <AppShell>
      <PosView />
    </AppShell>
  );
}
