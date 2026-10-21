import { AppShell } from "@/components/layout/app-shell";
import { AuditLogsView } from "@/features/audit-logs/audit-logs-view";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Lịch sử thao tác tài khoản | Quán Bếp Nhậu",
  description: "Theo dõi nhật ký hoạt động, thao tác bán hàng, thanh toán và quản trị hệ thống",
};

export default function AuditLogsPage() {
  return (
    <AppShell>
      <AuditLogsView />
    </AppShell>
  );
}
