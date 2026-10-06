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
    return NextResponse.json({
      success: true,
      data: orderData,
    });
  } catch (error: any) {
    console.error("SePay order status retrieve error:", error);
    return NextResponse.json(
      {
        success: false,
        message: error?.response?.data?.message || error?.message || "Không thể kiểm tra trạng thái đơn hàng từ SePay",
      },
      { status: 500 }
    );
  }
}
