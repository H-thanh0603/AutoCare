/**
 * Aggregate reads for the dashboard overview.
 *
 * Every query is filtered by the `garageId` the caller obtained from the session,
 * so one garage's counters can never include another's rows.
 */

import { RepairOrderStatus } from "@/generated/prisma/enums";

import type { PrismaClientOrTx } from "@/lib/prisma";
import { prisma } from "@/lib/prisma";
import { createTtlCache } from "@/lib/ttl-cache";

/** Orders that are still being worked on, in workflow order. */
export const OPEN_REPAIR_ORDER_STATUSES = [
  RepairOrderStatus.RECEIVED,
  RepairOrderStatus.INSPECTING,
  RepairOrderStatus.WAITING_CUSTOMER_APPROVAL,
  RepairOrderStatus.WAITING_PARTS,
  RepairOrderStatus.IN_PROGRESS,
  RepairOrderStatus.QUALITY_CHECK,
  RepairOrderStatus.READY_FOR_DELIVERY,
] as const;

export interface DashboardSummary {
  openOrders: number;
  waitingApproval: number;
  readyForDelivery: number;
  appointmentsToday: number;
  lowStockParts: number;
  unpaidInvoices: number;
}

function startOfToday(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

const summaryCache = createTtlCache<DashboardSummary>(15_000);

export async function getDashboardSummary(
  garageId: string,
  db: PrismaClientOrTx = prisma,
): Promise<DashboardSummary> {
  // When running inside a transaction the caller expects live reads; bypass the
  // cache so a fresh db handle is used and no stale counts leak into a write.
  if (db !== prisma) {
    return computeDashboardSummary(garageId, db);
  }
  return summaryCache.getOrSet(`summary:${garageId}`, () => computeDashboardSummary(garageId));
}

async function computeDashboardSummary(
  garageId: string,
  db: PrismaClientOrTx = prisma,
): Promise<DashboardSummary> {
  const dayStart = startOfToday();
  const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);

  const [
    openOrders,
    waitingApproval,
    readyForDelivery,
    appointmentsToday,
    unpaidInvoices,
    lowStockParts,
  ] = await Promise.all([
    db.repairOrder.count({
      where: { garageId, status: { in: [...OPEN_REPAIR_ORDER_STATUSES] } },
    }),
    db.repairOrder.count({
      where: { garageId, status: RepairOrderStatus.WAITING_CUSTOMER_APPROVAL },
    }),
    db.repairOrder.count({
      where: { garageId, status: RepairOrderStatus.READY_FOR_DELIVERY },
    }),
    db.appointment.count({
      where: {
        garageId,
        scheduledAt: { gte: dayStart, lt: dayEnd },
        status: { in: ["PENDING", "CONFIRMED", "ARRIVED"] },
      },
    }),
    db.invoice.count({
      where: {
        garageId,
        status: { in: ["ISSUED", "PARTIALLY_PAID", "OVERDUE"] },
      },
    }),
    // Prisma cannot compare two columns in `where`, so the low-stock check runs
    // in SQL. The garage filter stays parameterised.
    db.$queryRaw<[{ count: bigint }]>`
      SELECT COUNT(*)::bigint AS count
      FROM parts
      WHERE "garageId" = ${garageId}
        AND "isActive" = true
        AND "quantityInStock" <= "lowStockThreshold"
    `,
  ]);

  return {
    openOrders,
    waitingApproval,
    readyForDelivery,
    appointmentsToday,
    unpaidInvoices,
    lowStockParts: Number(lowStockParts[0]?.count ?? 0),
  };
}
