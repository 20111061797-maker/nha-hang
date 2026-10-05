import { QrMenuView } from "@/features/qr-order/qr-menu-view";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Quét mã đặt món | Quán Nhậu Bếp Lửa",
  description: "Đặt món trực tiếp tại bàn qua mã QR",
};

type Props = {
  params: Promise<{ id: string }>;
};

export default async function QrOrderPage({ params }: Props) {
  const { id } = await params;
  return <QrMenuView tableIdentifier={id} />;
}
