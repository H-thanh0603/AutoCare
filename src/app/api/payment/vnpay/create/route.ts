import { NextResponse } from "next/server";
import { ProductCode, VnpLocale } from "vnpay";
import { getSessionUser } from "@/lib/auth";
import { AppError } from "@/lib/errors";
import { assertRateLimit, getClientIp } from "@/lib/rate-limit";
import { requireGarageScope, requirePermission } from "@/lib/rbac";
import { vnpay } from "@/lib/vnpay";
import { getInvoiceById, recordPayment } from "@/features/invoices/service";

export async function POST(request: Request) {
  try {
    const clientIp = getClientIp(request);
    await assertRateLimit({
      identifier: `vnpay-create:${clientIp}`,
      maxRequests: 10,
      windowMs: 60_000,
    });

    const user = requirePermission(await getSessionUser(), "payment:write");
    const { garageId } = requireGarageScope(user);

    const body = await request.json();
    const { invoiceId, returnUrl } = body as {
      invoiceId?: string;
      returnUrl?: string;
    };

    if (!invoiceId) {
      throw new AppError("VALIDATION_ERROR", "Thiếu invoiceId.", 400);
    }

    const invoice = await getInvoiceById(invoiceId, garageId);

    if (invoice.status === "DRAFT") {
      throw new AppError("BUSINESS_RULE_VIOLATION", "Hóa đơn nháp chưa được phát hành.", 400);
    }
    if (invoice.status === "CANCELLED" || invoice.status === "REFUNDED") {
      throw new AppError("BUSINESS_RULE_VIOLATION", "Hóa đơn đã hủy/hoàn tiền.", 400);
    }

    const balance = invoice.totalAmount - invoice.paidAmount;
    if (balance <= 0) {
      throw new AppError("BUSINESS_RULE_VIOLATION", "Hóa đơn đã thanh toán đủ.", 400);
    }

    const origin = new URL(request.url).origin;
    const callbackReturnUrl = returnUrl || `${origin}/api/payment/vnpay/return`;

    const paymentUrl = vnpay.buildPaymentUrl({
      vnp_Amount: balance,
      vnp_IpAddr: clientIp,
      vnp_TxnRef: `${invoice.code}-${Date.now()}`,
      vnp_OrderInfo: `Thanh toan hoa don ${invoice.code} - ${invoice.customer.name}`,
      vnp_OrderType: ProductCode.Other,
      vnp_ReturnUrl: callbackReturnUrl,
      vnp_Locale: VnpLocale.VN,
    });

    return NextResponse.json({ ok: true, paymentUrl });
  } catch (error) {
    if (error instanceof AppError) {
      return NextResponse.json(
        { ok: false, message: error.message },
        { status: error.httpStatus },
      );
    }
    console.error("VNPay create error:", error);
    return NextResponse.json(
      { ok: false, message: "Lỗi tạo link thanh toán VNPay." },
      { status: 500 },
    );
  }
}
