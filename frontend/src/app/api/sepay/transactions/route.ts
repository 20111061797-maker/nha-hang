import { NextResponse } from "next/server";
import { sepayClient } from "@/lib/sepay/sepay-client";

export async function GET() {
  try {
    const res = await sepayClient.order.all();
    const orders = Array.isArray(res?.data?.data)
      ? res.data.data
      : Array.isArray(res?.data)
      ? res.data
      : Array.isArray(res)
      ? res
      : [];

    return NextResponse.json({
      success: true,
      data: orders,
    });
  } catch (error: any) {
    console.error("Error fetching SePay orders list:", error?.message || error);
    return NextResponse.json(
      {
        success: false,
        data: [],
        message: error?.message || "Không thể lấy lịch sử SePay từ cổng thanh toán",
      },
      { status: 200 }
    );
  }
}
