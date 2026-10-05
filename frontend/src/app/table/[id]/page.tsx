import { QrMenuView } from "@/features/qr-order/qr-menu-view";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Gọi món tại bàn | Quán Nhậu Bếp Lửa",
  description: "Thực đơn gọi món trực tuyến tại bàn không cần cài app hay đăng nhập",
};

type Props = {
  params: Promise<{ id: string }>;
};

export default async function TableOrderPage({ params }: Props) {
  const { id } = await params;
  return <QrMenuView tableIdentifier={id} />;
}
