/**
 * Registration business logic.
 *
 * Kept out of the server action so it can be unit/integration tested without a
 * request context, and so the action stays a thin boundary.
 */

import {
  claimCustomerRecordsByPhone,
  createCustomerUser,
  findUserByEmail,
} from "@/data/users";
import { BusinessRuleError } from "@/lib/errors";
import { hashPassword } from "@/lib/password";
import { prisma } from "@/lib/prisma";

export interface RegisterCustomerInput {
  name: string;
  email: string;
  phone: string;
  password: string;
}

export interface RegisterCustomerResult {
  userId: string;
  /** How many existing garage customer records were linked to the new account. */
  linkedCustomerRecords: number;
}

/**
 * Creates a portal account for a customer.
 *
 * The duplicate-email check is a friendly pre-check only; the unique index on
 * `users.email` is what actually guarantees uniqueness under concurrency, and a
 * violation there surfaces as a conflict rather than a silent second account.
 */
export async function registerCustomer(
  input: RegisterCustomerInput,
): Promise<RegisterCustomerResult> {
  const existing = await findUserByEmail(input.email);
  if (existing) {
    throw new BusinessRuleError("Email này đã được sử dụng.");
  }

  const passwordHash = await hashPassword(input.password);

  try {
    return await prisma.$transaction(async (tx) => {
      const user = await createCustomerUser(
        {
          email: input.email,
          name: input.name,
          phone: input.phone,
          passwordHash,
        },
        tx,
      );

      const linkedCustomerRecords = await claimCustomerRecordsByPhone(
        user.id,
        input.phone,
        tx,
      );

      return { userId: user.id, linkedCustomerRecords };
    });
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw new BusinessRuleError("Email này đã được sử dụng.");
    }
    throw error;
  }
}

/** Prisma reports a unique-constraint breach as error code P2002. */
function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code: unknown }).code === "P2002"
  );
}
