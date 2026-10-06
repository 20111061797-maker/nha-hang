import { AppShell } from "@/components/layout/app-shell";
import { EmployeesView } from "@/features/employees/employees-view";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Quản trị Nhân sự | Quán Bếp Nhậu",
  description: "Quản lý danh sách nhân sự, phân quyền vai trò và cấp tài khoản POS/KDS",
};

export default function EmployeesPage() {
  return (
    <AppShell>
      <EmployeesView />
    </AppShell>
  );
}
