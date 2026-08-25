/**
 * Data access for user accounts.
 *
 * Users are platform-level, not garage-owned: a customer keeps one account even
 * when their vehicles are serviced by several garages. Garage scoping happens on
 * `GarageMember` and `Customer` instead.
 */

import type { UserRole } from "@/generated/prisma/enums";

import { AUDIT_ACTIONS, recordAudit } from "@/lib/audit";
import type { PrismaClientOrTx } from "@/lib/prisma";
import { prisma } from "@/lib/prisma";

export interface UserAccount {
  id: string;
  email: string;
  name: string;
  phone: string | null;
  role: UserRole;
}

const accountSelect = {
  id: true,
  email: true,
  name: true,
  phone: true,
  role: true,
} as const;

export async function findUserByEmail(
  email: string,
  db: PrismaClientOrTx = prisma,
): Promise<UserAccount | null> {
  return db.user.findUnique({ where: { email }, select: accountSelect });
}

export async function createCustomerUser(
  input: { email: string; name: string; phone: string; passwordHash: string },
  db: PrismaClientOrTx = prisma,
): Promise<UserAccount> {
  return db.user.create({
    data: {
      email: input.email,
      name: input.name,
      phone: input.phone,
      passwordHash: input.passwordHash,
      role: "CUSTOMER",
    },
    select: accountSelect,
  });
}

/**
 * Links pre-existing garage customer records to a freshly registered account.
 *
 * SECURITY: matching a phone number is NOT proof of ownership — anyone who
 * learns/guesses a walk-in customer's phone could otherwise instantly acquire
 * that person's service history and invoices. There is no OTP/SMS channel yet,
 * so this only runs when CUSTOMER_PHONE_AUTO_CLAIM="1" (dev/demo convenience).
 * Every claim leaves an audit trail for garage managers to review.
 */
export async function claimCustomerRecordsByPhone(
  userId: string,
  phone: string,
  db: PrismaClientOrTx = prisma,
): Promise<number> {
  if (process.env.CUSTOMER_PHONE_AUTO_CLAIM !== "1") return 0;

  const unclaimed = await db.customer.findMany({
    where: { phone, userId: null, deletedAt: null },
    select: { id: true, garageId: true },
  });
  if (unclaimed.length === 0) return 0;

  await db.customer.updateMany({
    where: { id: { in: unclaimed.map((c) => c.id) } },
    data: { userId },
  });

  for (const record of unclaimed) {
    await recordAudit(
      {
        action: AUDIT_ACTIONS.CUSTOMER_RECORDS_CLAIMED,
        entityType: "Customer",
        entityId: record.id,
        garageId: record.garageId,
        actorUserId: userId,
        metadata: { matchedPhone: phone, via: "registration-auto-claim" },
      },
      db,
    );
  }

  return unclaimed.length;
}
