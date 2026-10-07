import { NextRequest, NextResponse } from "next/server";
import { sepayClient } from "@/lib/sepay/sepay-client";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const invoiceNumber = searchParams.get("invoiceNumber");

    if (!invoiceNumber) {
      return NextResponse.json(
        { message: "invoiceNumber is required" },
        { status: 400 }
      );
    }

    const orderData = await sepayClient.order.retrieve(invoiceNumber);
    const rawOrder = (orderData as any)?.data?.data || (orderData as any)?.data || orderData;
    const status = String(rawOrder?.order_status ?? rawOrder?.status ?? "").toUpperCase();
    const isPaid = ["PAID", "CAPTURED", "COMPLETED", "SUCCESS", "APPROVED"].includes(status);

    return NextResponse.json({
      success: true,
      isPaid,
      status,
      data: rawOrder,
    });
  } catch (error: any) {
    console.error("SePay order status retrieve error:", error);
    return NextResponse.json(
      {
        success: false,
        isPaid: false,
        status: "ERROR",
        message: error?.response?.data?.message || error?.message || "Không thể kiểm tra trạng thái đơn hàng từ SePay",
      },
      { status: 500 }
    );
  }
}
