/**
 * Data access for garage customers.
 *
 * `garageId` is always the first argument and always applied to the query.
 * Callers take it from the session (`requireGarageScope`), never from client
 * input. Soft-deleted rows are excluded from every read.
 */

import { NotFoundError } from "@/lib/errors";
import { prisma, type PrismaClientOrTx } from "@/lib/prisma";
import type { CustomerInput } from "@/features/customers/schema";
import type { RepairOrderStatus } from "@/generated/prisma/enums";

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

const detailSelect = {
  ...listSelect,
  note: true,
  updatedAt: true,
} as const;

export interface CustomerDetail {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  address: string | null;
  note: string | null;
  createdAt: Date;
  updatedAt: Date;
  userId: string | null;
  /** Vehicles the customer currently owns, as seen by this garage. */
  vehicles: {
    id: string;
    licensePlate: string;
    brand: string;
    model: string;
    year: number | null;
    currentKm: number | null;
    ownedSince: Date;
  }[];
  repairOrders: {
    id: string;
    code: string;
    status: RepairOrderStatus;
    receivedAt: Date;
    vehicle: { id: string; licensePlate: string; brand: string; model: string };
  }[];
}

/** Full record for the detail page, including currently owned vehicles. */
export async function getCustomerDetail(
  garageId: string,
  id: string,
  db: PrismaClientOrTx = prisma,
): Promise<CustomerDetail> {
  const row = await db.customer.findFirst({
    where: { id, garageId, deletedAt: null },
    select: {
      ...detailSelect,
      ownerships: {
        where: { isCurrent: true, endedAt: null, vehicle: { deletedAt: null } },
        select: {
          startedAt: true,
          vehicle: {
            select: {
              id: true,
              licensePlate: true,
              brand: true,
              model: true,
              year: true,
              currentKm: true,
            },
          },
        },
        orderBy: { startedAt: "desc" },
      },
      repairOrders: {
        where: { garageId },
        select: {
          id: true,
          code: true,
          status: true,
          receivedAt: true,
          vehicle: { select: { id: true, licensePlate: true, brand: true, model: true } },
        },
        orderBy: { receivedAt: "desc" },
        take: 20,
      },
    },
  });
  if (!row) {
    throw new NotFoundError("Không tìm thấy khách hàng.");
  }

  const { ownerships, ...customer } = row;
  return {
    ...customer,
    vehicles: ownerships.map(({ startedAt, vehicle }) => ({
      ...vehicle,
      ownedSince: startedAt,
    })),
  };
}

export async function createCustomer(
  garageId: string,
  input: CustomerInput,
  db: PrismaClientOrTx = prisma,
): Promise<{ id: string }> {
  return db.customer.create({
    data: { ...input, garageId },
    select: { id: true },
  });
}

/**
 * Updates a customer of this garage.
 *
 * The `garageId` sits in the `where` clause rather than being checked
 * beforehand, so a foreign id updates zero rows instead of racing between the
 * check and the write.
 */
export async function updateCustomer(
  garageId: string,
  id: string,
  input: CustomerInput,
  db: PrismaClientOrTx = prisma,
): Promise<void> {
  const { count } = await db.customer.updateMany({
    where: { id, garageId, deletedAt: null },
    data: input,
  });
  if (count === 0) {
    throw new NotFoundError("Không tìm thấy khách hàng.");
  }
}

/**
 * Soft-deletes a customer.
 *
 * The row is kept because invoices, repair orders and vehicle history reference
 * it: erasing it would leave the service history without the party it was
 * performed for.
 */
export async function softDeleteCustomer(
  garageId: string,
  id: string,
  db: PrismaClientOrTx = prisma,
): Promise<void> {
  const { count } = await db.customer.updateMany({
    where: { id, garageId, deletedAt: null },
    data: { deletedAt: new Date() },
  });
  if (count === 0) {
    throw new NotFoundError("Không tìm thấy khách hàng.");
  }
}

/** Statuses that mean the garage still holds work for this customer. */
const OPEN_REPAIR_ORDER_STATUSES = [
  "RECEIVED",
  "INSPECTING",
  "WAITING_CUSTOMER_APPROVAL",
  "WAITING_PARTS",
  "IN_PROGRESS",
  "QUALITY_CHECK",
  "READY_FOR_DELIVERY",
] as const;

export async function countOpenRepairOrdersForCustomer(
  garageId: string,
  customerId: string,
  db: PrismaClientOrTx = prisma,
): Promise<number> {
  return db.repairOrder.count({
    where: {
      garageId,
      customerId,
      status: { in: [...OPEN_REPAIR_ORDER_STATUSES] },
    },
  });
}

/** Lightweight options list for owner pickers. */
export async function listCustomerOptions(
  garageId: string,
  db: PrismaClientOrTx = prisma,
): Promise<{ id: string; name: string; phone: string }[]> {
  return db.customer.findMany({
    where: { garageId, deletedAt: null },
    select: { id: true, name: true, phone: true },
    orderBy: { name: "asc" },
  });
}
