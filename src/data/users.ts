/**
 * Data access for user accounts.
 *
 * Users are platform-level, not garage-owned: a customer keeps one account even
 * when their vehicles are serviced by several garages. Garage scoping happens on
 * `GarageMember` and `Customer` instead.
 */

import type { UserRole } from "@/generated/prisma/enums";

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
 * A garage often creates a walk-in customer before that person signs up. When
 * the phone number matches and the record is not yet claimed, the portal account
 * takes it over so the customer sees their existing history.
 */
export async function claimCustomerRecordsByPhone(
  userId: string,
  phone: string,
  db: PrismaClientOrTx = prisma,
): Promise<number> {
  const result = await db.customer.updateMany({
    where: { phone, userId: null, deletedAt: null },
    data: { userId },
  });
  return result.count;
}
