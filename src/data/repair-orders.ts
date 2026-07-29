/**
 * Data access for repair orders.
 *
 * Every read and write takes `garageId` as its first argument and applies it
 * to the query. Callers must obtain that id from the session
 * (`requireGarageScope`), never from client input.
 */

import { NotFoundError } from "@/lib/errors";
import { prisma, type PrismaClientOrTx } from "@/lib/prisma";
import type { RepairOrderStatus } from "@/generated/prisma/enums";

const listSelect = {
  id: true,
  code: true,
  status: true,
  receivedAt: true,
  completedAt: true,
  deliveredAt: true,
  vehicle: { select: { id: true, licensePlate: true, brand: true, model: true } },
  customer: { select: { id: true, name: true, phone: true } },
  advisor: { select: { id: true, name: true } },
} as const;

export type RepairOrderListItem = {
  id: string;
  code: string;
  status: RepairOrderStatus;
  receivedAt: Date;
  completedAt: Date | null;
  deliveredAt: Date | null;
  vehicle: { id: string; licensePlate: string; brand: string; model: string };
  customer: { id: string; name: string; phone: string };
  advisor: { id: string; name: string } | null;
};

const detailSelect = {
  id: true,
  code: true,
  status: true,
  receivedAt: true,
  mileageKm: true,
  fuelLevel: true,
  initialNote: true,
  intakeChecklist: true,
  appointmentId: true,
  vehicle: { select: { id: true, licensePlate: true, brand: true, model: true } },
  customer: { select: { id: true, name: true, phone: true } },
  advisor: { select: { id: true, name: true } },
} as const;

export type RepairOrderDetail = {
  id: string;
  code: string;
  status: RepairOrderStatus;
  receivedAt: Date;
  mileageKm: number | null;
  fuelLevel: number | null;
  initialNote: string | null;
  intakeChecklist: unknown;
  appointmentId: string | null;
  vehicle: { id: string; licensePlate: string; brand: string; model: string };
  customer: { id: string; name: string; phone: string };
  advisor: { id: string; name: string } | null;
};

/** Returns null when the order does not exist *in this garage*. */
export async function findRepairOrderById(
  garageId: string,
  id: string,
  db: PrismaClientOrTx = prisma,
): Promise<RepairOrderListItem | null> {
  return db.repairOrder.findFirst({
    where: { id, garageId },
    select: listSelect,
  });
}

/**
 * Same as {@link findRepairOrderById} but throws `NotFoundError` when missing.
 *
 * An order belonging to another garage is indistinguishable from one that does
 * not exist: both produce the same `NotFoundError`, so the response never
 * reveals that the id is valid elsewhere.
 */
export async function getRepairOrderById(
  garageId: string,
  id: string,
  db: PrismaClientOrTx = prisma,
): Promise<RepairOrderListItem> {
  const order = await findRepairOrderById(garageId, id, db);
  if (!order) {
    throw new NotFoundError("Không tìm thấy lệnh sửa chữa.");
  }
  return order;
}

export async function getRepairOrderDetail(
  garageId: string,
  id: string,
  db: PrismaClientOrTx = prisma,
): Promise<RepairOrderDetail> {
  const order = await db.repairOrder.findFirst({
    where: { id, garageId },
    select: detailSelect,
  });
  if (!order) throw new NotFoundError("Không tìm thấy lệnh sửa chữa.");
  return order;
}

export async function listRepairOrders(
  garageId: string,
  options: { statuses?: readonly RepairOrderStatus[]; take?: number } = {},
  db: PrismaClientOrTx = prisma,
): Promise<RepairOrderListItem[]> {
  const { statuses, take = 50 } = options;
  return db.repairOrder.findMany({
    where: {
      garageId,
      ...(statuses?.length ? { status: { in: [...statuses] } } : {}),
    },
    select: listSelect,
    orderBy: { receivedAt: "desc" },
    take,
  });
}
