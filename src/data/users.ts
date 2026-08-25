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
 * Links garage customer records matching the phone to a portal account.
 *
 * SECURITY: only call this AFTER an OTP verified control of the contact
 * channel on those records (see features/auth/phone-claim.ts). A phone number
 * alone is not ownership proof. Every claim leaves an audit trail.
 */
export async function claimCustomerRecordsByPhone(
  userId: string,
  phone: string,
  db: PrismaClientOrTx = prisma,
): Promise<number> {
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
