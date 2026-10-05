import { AppShell } from "@/components/layout/app-shell";
import { PaymentsView } from "@/features/payments/payments-view";

export const metadata = {
  title: "Sổ quỹ & Thanh toán | Quán Bếp Nhậu",
  description: "Lịch sử giao dịch thanh toán, doanh thu tiền mặt, chuyển khoản và thẻ",
};

export default function PaymentsPage() {
  return (
    <AppShell>
      <PaymentsView />
    </AppShell>
  );
}
