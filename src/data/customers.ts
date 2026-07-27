/**
 * Data access for garage customers.
 *
 * `garageId` is always the first argument and always applied to the query.
 * Callers take it from the session (`requireGarageScope`), never from client
 * input. Soft-deleted rows are excluded from every read.
 */

import { NotFoundError } from "@/lib/errors";
import { prisma, type PrismaClientOrTx } from "@/lib/prisma";

const listSelect = {
  id: true,
  name: true,
  phone: true,
  email: true,
  address: true,
  createdAt: true,
  userId: true,
} as const;

export interface CustomerListItem {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  address: string | null;
  createdAt: Date;
  /** Set when the customer has claimed a portal account. */
  userId: string | null;
  vehicleCount: number;
}

export async function listCustomers(
  garageId: string,
  options: { search?: string; take?: number } = {},
  db: PrismaClientOrTx = prisma,
): Promise<CustomerListItem[]> {
  const { search, take = 50 } = options;
  const rows = await db.customer.findMany({
    where: {
      garageId,
      deletedAt: null,
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: "insensitive" as const } },
              { phone: { contains: search } },
            ],
          }
        : {}),
    },
    select: {
      ...listSelect,
      _count: { select: { ownerships: true } },
    },
    orderBy: { name: "asc" },
    take,
  });

  return rows.map(({ _count, ...customer }) => ({
    ...customer,
    vehicleCount: _count.ownerships,
  }));
}

/** Returns null when the customer does not exist *in this garage*. */
export async function findCustomerById(
  garageId: string,
  id: string,
  db: PrismaClientOrTx = prisma,
): Promise<CustomerListItem | null> {
  const row = await db.customer.findFirst({
    where: { id, garageId, deletedAt: null },
    select: { ...listSelect, _count: { select: { ownerships: true } } },
  });
  if (!row) return null;
  const { _count, ...customer } = row;
  return { ...customer, vehicleCount: _count.ownerships };
}

/**
 * Same as {@link findCustomerById} but throws when missing.
 *
 * A customer of another garage yields the same `NotFoundError` as one that does
 * not exist, so the response never confirms the id is valid elsewhere.
 */
export async function getCustomerById(
  garageId: string,
  id: string,
  db: PrismaClientOrTx = prisma,
): Promise<CustomerListItem> {
  const customer = await findCustomerById(garageId, id, db);
  if (!customer) {
    throw new NotFoundError("Không tìm thấy khách hàng.");
  }
  return customer;
}
