import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { vnpay } from "@/lib/vnpay";

/**
 * VNPay return URL — customer is redirected here after payment.
 *
 * We use vnpay.verifyReturnUrl() to verify the hash and extract result fields.
 * On success, record the payment and redirect to /hoa-don with success param.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const params = Object.fromEntries(url.searchParams.entries());

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const result = vnpay.verifyReturnUrl(params as any);

  // Extract invoice code from vnp_TxnRef (format: "INV-YYYY-NNNN-timestamp")
  const invoiceCode = result.vnp_TxnRef?.split("-").slice(0, 3).join("-");

  const invoice = invoiceCode
    ? await prisma.invoice.findFirst({
        where: { code: invoiceCode },
        select: { id: true, garageId: true, code: true, totalAmount: true, paidAmount: true, status: true },
      })
    : null;

  if (!invoice) {
    return NextResponse.redirect(new URL("/hoa-don?payment=error&reason=not-found", url.origin));
  }

  if (!result.isVerified || !result.isSuccess) {
    return NextResponse.redirect(
      new URL(`/hoa-don?payment=error&invoiceId=${invoice.id}&code=${result.vnp_ResponseCode}`, url.origin),
    );
  }

  // Idempotency: skip if this transaction was already recorded
  const txnRef = result.vnp_TxnRef;
  const existingPayment = await prisma.payment.findFirst({
    where: { invoiceId: invoice.id, reference: txnRef },
  });

  if (!existingPayment) {
    // result.vnp_Amount is already divided by 100 by the library
    const vnpAmount = Number(result.vnp_Amount);

    await prisma.$transaction(async (tx) => {
      const lockedInvoice = await tx.$queryRaw<{ paidAmount: number; totalAmount: number }[]>`
        SELECT "paidAmount", "totalAmount" FROM "invoices"
        WHERE id = ${invoice.id} FOR UPDATE
      `;
      const current = lockedInvoice[0];
      if (!current) return;

      const finalPaidAmount = Math.min(current.paidAmount + vnpAmount, current.totalAmount);
      const isFullyPaid = finalPaidAmount >= current.totalAmount;

      await tx.payment.create({
        data: {
          garageId: invoice.garageId,
          invoiceId: invoice.id,
          type: "PAYMENT",
          method: "VNPAY",
          amount: vnpAmount,
          reference: txnRef,
          note: `Thanh toan qua VNPay - ${result.vnp_BankCode ?? ""}`,
        },
      });

      await tx.invoice.update({
        where: { id: invoice.id },
        data: {
          paidAmount: finalPaidAmount,
          status: isFullyPaid ? "PAID" : "PARTIALLY_PAID",
        },
      });
    });
  }

  return NextResponse.redirect(
    new URL(`/hoa-don?payment=success&invoiceId=${invoice.id}`, url.origin),
  );
}
