import { NextRequest, NextResponse } from "next/server";
import { sepayClient } from "@/lib/sepay/sepay-client";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      orderId,
      orderInvoiceNumber,
      orderAmount,
      orderDescription,
      successUrl,
      cancelUrl,
      customerName,
      customerPhone,
    } = body;

    if (!orderInvoiceNumber || !orderAmount) {
      return NextResponse.json(
        { message: "Mã hóa đơn và số tiền là bắt buộc" },
        { status: 400 }
      );
    }

    const amount = Math.round(Number(orderAmount));
    if (isNaN(amount) || amount <= 0) {
      return NextResponse.json(
        { message: "Số tiền thanh toán không hợp lệ" },
        { status: 400 }
      );
    }

    // Sanitize invoice number (remove characters that might break URLs)
    const sanitizedInvoice = String(orderInvoiceNumber)
      .replace(/[^a-zA-Z0-9_-]/g, "")
      .slice(0, 50);

    const description = orderDescription
      ? String(orderDescription).slice(0, 150)
      : `Thanh toan don hang ${sanitizedInvoice}`;

    const host = req.headers.get("host") || "nha-hang-beta.vercel.app";
    const proto = req.headers.get("x-forwarded-proto") || "https";
    const baseUrl = `${proto}://${host}`;

    const finalSuccessUrl = successUrl || `${baseUrl}/orders?payment=success&invoice=${sanitizedInvoice}`;
    const finalCancelUrl = cancelUrl || `${baseUrl}/orders?payment=cancelled&invoice=${sanitizedInvoice}`;

    const checkoutUrl = sepayClient.checkout.initCheckoutUrl();

    const fields = sepayClient.checkout.initOneTimePaymentFields({
      operation: "PURCHASE",
      order_invoice_number: sanitizedInvoice,
      order_amount: amount,
      currency: "VND",
      order_description: description,
      success_url: finalSuccessUrl,
      cancel_url: finalCancelUrl,
      error_url: finalCancelUrl,
      customer_id: customerPhone || undefined,
      custom_data: JSON.stringify({
        orderId,
        customerName: customerName || "",
        customerPhone: customerPhone || "",
      }),
    });

    return NextResponse.json({
      checkoutUrl,
      fields,
      invoiceNumber: sanitizedInvoice,
      amount,
    });
  } catch (error: any) {
    console.error("SePay checkout initialization error:", error);
    return NextResponse.json(
      { message: error?.message || "Không thể khởi tạo cổng thanh toán SePay" },
      { status: 500 }
    );
  }
}
