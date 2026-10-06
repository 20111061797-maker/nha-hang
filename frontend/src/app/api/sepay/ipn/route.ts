import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    console.log("SePay IPN Webhook received:", JSON.stringify(body, null, 2));

    // SePay IPN delivers payment notification
    // Fields include: order_invoice_number, order_amount, payment_status, transaction_id, etc.
    const { order_invoice_number, payment_status, custom_data } = body;

    let parsedCustomData = null;
    if (custom_data) {
      try {
        parsedCustomData = typeof custom_data === "string" ? JSON.parse(custom_data) : custom_data;
      } catch {
        // ignore parse error
      }
    }

    return NextResponse.json({
      success: true,
      message: "IPN received successfully",
      orderInvoiceNumber: order_invoice_number,
      paymentStatus: payment_status,
      customData: parsedCustomData,
    });
  } catch (error: any) {
    console.error("SePay IPN processing error:", error);
    return NextResponse.json(
      { success: false, message: error?.message || "Internal server error" },
      { status: 500 }
    );
  }
}
