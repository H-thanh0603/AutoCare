/**
 * Financial reports service for garage owner dashboard.
 * Provides revenue, expenses, profit, and aging analysis.
 *
 * Notes:
 * - Day buckets use the garage timezone (Asia/Ho_Chi_Minh), not UTC, so
 *   evening transactions land on the correct calendar day.
 * - Period scoping for "paid" revenue (top services, COGS) is based on
 *   `payments.paid_at`, not `invoices.created_at`.
 * - Aggregations run in SQL (no full-table loads into Node).
 */

import { prisma } from "@/lib/prisma";
import { createTtlCache } from "@/lib/ttl-cache";

/* ------------------------------------------------------------------ */
/* Types                                                               */
/* ------------------------------------------------------------------ */

export interface RevenueByPeriod {
  date: string;
  collected: number;
  refunded: number;
  deposits: number;
  net: number;
}

export interface PaymentMethodBreakdown {
  method: string;
  label: string;
  total: number;
  percentage: number;
}

export interface AgingInvoice {
  id: string;
  code: string;
  customerName: string;
  vehiclePlate: string;
  totalAmount: number;
  paidAmount: number;
  balance: number;
  issuedAt: Date | null;
  dueAt: Date | null;
  daysOverdue: number;
}

export interface TopService {
  description: string;
  revenue: number;
  orderCount: number;
}

export interface FinancialSummary {
  totalRevenue: number;
  totalRefunded: number;
  netRevenue: number;
  estimatedCOGS: number;
  estimatedProfit: number;
  outstandingBalance: number;
  overdueBalance: number;
  revenueByPeriod: RevenueByPeriod[];
  paymentMethods: PaymentMethodBreakdown[];
  agingInvoices: AgingInvoice[];
  topServices: TopService[];
}

export type Period = "7d" | "30d" | "quarter" | "year";

/** Max aging rows returned for display; totals are computed over ALL rows. */
export const AGING_DISPLAY_LIMIT = 100;

/** IANA timezone used for day bucketing (garage local time). */
export const GARAGE_TIMEZONE = "Asia/Ho_Chi_Minh";

const financeCache = createTtlCache<FinancialSummary>(30_000);

function getPeriodDates(period: Period): { start: Date; end: Date } {
  const end = new Date();
  const start = new Date();

  switch (period) {
    case "7d":
      start.setDate(end.getDate() - 7);
      break;
    case "30d":
      start.setDate(end.getDate() - 30);
      break;
    case "quarter":
      start.setMonth(end.getMonth() - 3);
      break;
    case "year":
      start.setFullYear(end.getFullYear() - 1);
      break;
  }

  return { start, end };
}

function toYmd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/* ------------------------------------------------------------------ */
/* Revenue by period (SQL-aggregated, garage-tz buckets, gap-filled)   */
/* ------------------------------------------------------------------ */

interface RevenueRow {
  day: string;
  collected: bigint;
  refunded: bigint;
  deposits: bigint;
}

async function getRevenueByPeriod(
  garageId: string,
  start: Date,
  end: Date,
): Promise<RevenueByPeriod[]> {
  const rows = await prisma.$queryRaw<RevenueRow[]>`
    SELECT
      TO_CHAR(DATE_TRUNC('day', p.paid_at AT TIME ZONE ${GARAGE_TIMEZONE}), 'YYYY-MM-DD') AS day,
      SUM(CASE WHEN p.type = 'PAYMENT' THEN p.amount ELSE 0 END) AS collected,
      SUM(CASE WHEN p.type = 'REFUND' THEN p.amount ELSE 0 END) AS refunded,
      SUM(CASE WHEN p.type = 'DEPOSIT' THEN p.amount ELSE 0 END) AS deposits
    FROM payments p
    WHERE p.garage_id = ${garageId}
      AND p.paid_at BETWEEN ${start} AND ${end}
    GROUP BY 1
    ORDER BY 1
  `;

  const byDate = new Map<string, RevenueByPeriod>();
  for (const r of rows) {
    const collected = Number(r.collected);
    const refunded = Number(r.refunded);
    const deposits = Number(r.deposits);
    byDate.set(r.day, {
      date: r.day,
      collected,
      refunded,
      deposits,
      net: collected - refunded + deposits,
    });
  }

  // Fill missing days so charts render a continuous axis.
  const filled: RevenueByPeriod[] = [];
  const cursor = new Date(start);
  cursor.setHours(0, 0, 0, 0);
  const last = new Date(end);
  last.setHours(0, 0, 0, 0);
  while (cursor <= last) {
    const key = toYmd(cursor);
    filled.push(
      byDate.get(key) ?? {
        date: key,
        collected: 0,
        refunded: 0,
        deposits: 0,
        net: 0,
      },
    );
    cursor.setDate(cursor.getDate() + 1);
  }
  return filled;
}

/* ------------------------------------------------------------------ */
/* Payment method breakdown (SQL group-by)                             */
/* ------------------------------------------------------------------ */

async function getPaymentMethodBreakdown(
  garageId: string,
  start: Date,
  end: Date,
): Promise<PaymentMethodBreakdown[]> {
  const groups = await prisma.payment.groupBy({
    by: ["method"],
    where: {
      garageId,
      type: "PAYMENT",
      paidAt: { gte: start, lte: end },
    },
    _sum: { amount: true },
  });

  const METHOD_LABELS: Record<string, string> = {
    CASH: "Tiền mặt",
    BANK_TRANSFER: "Chuyển khoản",
    CARD: "Thẻ",
    OTHER: "Khác",
  };

  const total = groups.reduce((s, g) => s + (g._sum.amount ?? 0), 0);

  return groups
    .map((g) => {
      const amount = g._sum.amount ?? 0;
      return {
        method: g.method,
        label: METHOD_LABELS[g.method] ?? g.method,
        total: amount,
        percentage: total > 0 ? Math.round((amount / total) * 100) : 0,
      };
    })
    .sort((a, b) => b.total - a.total);
}

/* ------------------------------------------------------------------ */
/* Aging invoices (bounded list) + totals over ALL open invoices       */
/* ------------------------------------------------------------------ */

async function getAgingInvoices(
  garageId: string,
  limit: number = AGING_DISPLAY_LIMIT,
): Promise<AgingInvoice[]> {
  const invoices = await prisma.invoice.findMany({
    where: {
      garageId,
      status: { in: ["ISSUED", "PARTIALLY_PAID", "OVERDUE"] },
    },
    include: {
      customer: { select: { name: true } },
      repairOrder: {
        select: { vehicle: { select: { licensePlate: true } } },
      },
    },
    orderBy: { dueAt: "asc" },
    take: limit,
  });

  const now = Date.now();

  return invoices.map((inv) => {
    const daysOverdue = inv.dueAt
      ? Math.max(0, Math.floor((now - inv.dueAt.getTime()) / 86_400_000))
      : 0;

    return {
      id: inv.id,
      code: inv.code,
      customerName: inv.customer.name,
      vehiclePlate: inv.repairOrder?.vehicle.licensePlate ?? "—",
      totalAmount: inv.totalAmount,
      paidAmount: inv.paidAmount,
      balance: inv.totalAmount - inv.paidAmount,
      issuedAt: inv.issuedAt,
      dueAt: inv.dueAt,
      daysOverdue,
    };
  });
}

async function getOutstandingTotals(garageId: string): Promise<{
  outstandingBalance: number;
  overdueBalance: number;
}> {
  const rows = await prisma.$queryRaw<
    { outstanding: bigint; overdue: bigint }[]
  >`
    SELECT
      COALESCE(SUM(total_amount - paid_amount), 0) AS outstanding,
      COALESCE(SUM(CASE WHEN due_at IS NOT NULL AND due_at < NOW() THEN total_amount - paid_amount ELSE 0 END), 0) AS overdue
    FROM invoices
    WHERE garage_id = ${garageId}
      AND status IN ('ISSUED', 'PARTIALLY_PAID', 'OVERDUE')
  `;
  return {
    outstandingBalance: Number(rows[0]?.outstanding ?? 0),
    overdueBalance: Number(rows[0]?.overdue ?? 0),
  };
}

/* ------------------------------------------------------------------ */
/* Top services (scoped by payment date, no row multiplication)        */
/* ------------------------------------------------------------------ */

async function getTopServices(
  garageId: string,
  start: Date,
  end: Date,
): Promise<TopService[]> {
  // EXISTS (instead of JOIN on invoices) avoids multiplying quotation-item
  // rows when a repair order has multiple invoices/payments.
  const results = await prisma.$queryRaw<
    { description: string; revenue: bigint; order_count: bigint }[]
  >`
    SELECT
      qi.description,
      SUM(qi.total_amount) AS revenue,
      COUNT(DISTINCT q.repair_order_id) AS order_count
    FROM quotation_items qi
    JOIN quotations q ON q.id = qi.quotation_id
    WHERE q.garage_id = ${garageId}
      AND EXISTS (
        SELECT 1
        FROM invoices inv
        JOIN payments p ON p.invoice_id = inv.id
        WHERE inv.repair_order_id = q.repair_order_id
          AND inv.status = 'PAID'
          AND p.type = 'PAYMENT'
          AND p.paid_at BETWEEN ${start} AND ${end}
      )
    GROUP BY qi.description
    ORDER BY revenue DESC
    LIMIT 10
  `;

  return results.map((r) => ({
    description: r.description,
    revenue: Number(r.revenue),
    orderCount: Number(r.order_count),
  }));
}

/* ------------------------------------------------------------------ */
/* COGS estimate (scoped by payment date)                              */
/* ------------------------------------------------------------------ */

async function getEstimatedCOGS(
  garageId: string,
  start: Date,
  end: Date,
): Promise<number> {
  const result = await prisma.$queryRaw<{ total: bigint }[]>`
    SELECT COALESCE(SUM(it.unit_cost * ABS(it.quantity)), 0) AS total
    FROM inventory_transactions it
    WHERE it.type = 'ISSUE'
      AND it.garage_id = ${garageId}
      AND EXISTS (
        SELECT 1
        FROM invoices inv
        JOIN payments p ON p.invoice_id = inv.id
        WHERE inv.repair_order_id = it.repair_order_id
          AND inv.status = 'PAID'
          AND p.type = 'PAYMENT'
          AND p.paid_at BETWEEN ${start} AND ${end}
      )
  `;
  return Number(result[0]?.total ?? 0);
}

/* ------------------------------------------------------------------ */
/* Main summary                                                        */
/* ------------------------------------------------------------------ */

export async function getFinancialSummary(
  garageId: string,
  period: Period = "30d",
): Promise<FinancialSummary> {
  const cacheKey = `finance:${garageId}:${period}`;
  return financeCache.getOrSet(cacheKey, async () => {
    const { start, end } = getPeriodDates(period);

    const [
      revenueByPeriod,
      paymentMethods,
      agingInvoices,
      topServices,
      totals,
      estimatedCOGS,
    ] = await Promise.all([
      getRevenueByPeriod(garageId, start, end),
      getPaymentMethodBreakdown(garageId, start, end),
      getAgingInvoices(garageId),
      getTopServices(garageId, start, end),
      getOutstandingTotals(garageId),
      getEstimatedCOGS(garageId, start, end),
    ]);

    const totalRevenue = revenueByPeriod.reduce((s, r) => s + r.collected, 0);
    const totalRefunded = revenueByPeriod.reduce((s, r) => s + r.refunded, 0);
    const totalDeposits = revenueByPeriod.reduce((s, r) => s + r.deposits, 0);
    const netRevenue = totalRevenue - totalRefunded + totalDeposits;

    return {
      totalRevenue,
      totalRefunded,
      netRevenue,
      estimatedCOGS,
      estimatedProfit: netRevenue - estimatedCOGS,
      outstandingBalance: totals.outstandingBalance,
      overdueBalance: totals.overdueBalance,
      revenueByPeriod,
      paymentMethods,
      agingInvoices,
      topServices,
    };
  });
}
