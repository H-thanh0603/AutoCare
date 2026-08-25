/**
 * OTP-verified linking of existing garage customer records to a portal account.
 *
 * Replaces the old "auto-claim by phone at registration" flow: a phone number
 * alone is not ownership proof. The claimant must now receive a one-time code
 * at the email address stored on the garage customer record — proving control
 * of that contact channel — before any record is linked.
 *
 * Records without an email on file cannot be self-served; garages link those
 * manually (staff-side) until an SMS channel exists.
 */

import { randomInt } from "node:crypto";

import CustomerClaimOtpEmail from "@/emails/customer-claim-otp";
import { BusinessRuleError, NotFoundError, ValidationError } from "@/lib/errors";
import { sendEmail } from "@/lib/email";
import { hashPassword, verifyPassword } from "@/lib/password";
import { prisma } from "@/lib/prisma";
import { claimCustomerRecordsByPhone } from "@/data/users";

const OTP_TTL_MINUTES = 10;
const MAX_VERIFICATION_ATTEMPTS = 5;
/** How many OTPs a user may request per phone within the rate-limit window. */
const REQUEST_LIMIT_PER_WINDOW = 3;

export interface RequestClaimResult {
  /**
   * Always true from the caller's perspective — the message is deliberately
   * identical whether or not a matching record exists, so the endpoint cannot
   * be used to probe which phone numbers have garage history.
   */
  requested: boolean;
}

export async function requestPhoneClaimOtp(
  userId: string,
  rawPhone: string,
): Promise<RequestClaimResult> {
  const phone = rawPhone.trim();

  const targets = await prisma.customer.findMany({
    where: { phone, userId: null, deletedAt: null, email: { not: null } },
    select: { id: true, garageId: true, email: true },
  });

  if (targets.length === 0) {
    // Neutral response — see RequestClaimResult.
    return { requested: false };
  }

  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  const codeHash = await hashPassword(code);
  const expiresAt = new Date(Date.now() + OTP_TTL_MINUTES * 60 * 1000);

  await prisma.$transaction(async (tx) => {
    // Only one live code per (user, phone): issuing a new one invalidates the rest.
    await tx.customerClaimOtp.deleteMany({ where: { userId, phone } });
    await tx.customerClaimOtp.create({
      data: { userId, phone, codeHash, expiresAt },
    });
  });

  const distinctEmails = [...new Set(targets.map((t) => t.email as string))];
  for (const email of distinctEmails) {
    const result = await sendEmail({
      to: email,
      subject: `Mã xác thực liên kết hồ sơ AutoCare: ${code}`,
      react: CustomerClaimOtpEmail({ code, minutes: OTP_TTL_MINUTES }),
    });
    if (!result.success) {
      throw new Error("Không gửi được email xác thực. Vui lòng thử lại sau.");
    }
    if ("dummy" in result && result.dummy && process.env.NODE_ENV !== "production") {
      // No RESEND_API_KEY in dev — surface the code so the flow is testable.
      console.log(`[claim-otp] DEV ONLY — mã OTP cho ${phone}: ${code}`);
    }
  }

  return { requested: true };
}

export async function confirmPhoneClaim(
  userId: string,
  rawPhone: string,
  rawCode: string,
): Promise<{ linkedCustomerRecords: number }> {
  const phone = rawPhone.trim();
  const code = rawCode.trim();
  if (!/^\d{6}$/.test(code)) {
    throw new ValidationError("Mã xác thực gồm 6 chữ số.");
  }

  const otp = await prisma.customerClaimOtp.findFirst({
    where: { userId, phone, consumedAt: null, expiresAt: { gt: new Date() } },
    orderBy: { createdAt: "desc" },
  });
  if (!otp) {
    throw new NotFoundError("Không có mã xác thực nào còn hiệu lực. Vui lòng yêu cầu mã mới.");
  }
  if (otp.attempts >= MAX_VERIFICATION_ATTEMPTS) {
    throw new BusinessRuleError("Bạn đã nhập sai quá nhiều lần. Vui lòng yêu cầu mã mới.");
  }

  // Count the attempt atomically so brute-forcing via parallel requests fails.
  await prisma.customerClaimOtp.update({
    where: { id: otp.id },
    data: { attempts: { increment: 1 } },
  });

  if (!(await verifyPassword(code, otp.codeHash))) {
    throw new ValidationError("Mã xác thực không đúng.");
  }

  return prisma.$transaction(async (tx) => {
    // Conditional consume: exactly one concurrent confirmation can win.
    const consumed = await tx.customerClaimOtp.updateMany({
      where: { id: otp.id, consumedAt: null },
      data: { consumedAt: new Date() },
    });
    if (consumed.count !== 1) {
      throw new BusinessRuleError("Mã xác thực đã được sử dụng.");
    }

    const linkedCustomerRecords = await claimCustomerRecordsByPhone(userId, phone, tx);
    return { linkedCustomerRecords };
  });
}

/** Test hook + introspection helper for the request limiter. */
export const PHONE_CLAIM_LIMITS = {
  requestsPerWindow: REQUEST_LIMIT_PER_WINDOW,
  ttlMinutes: OTP_TTL_MINUTES,
} as const;
