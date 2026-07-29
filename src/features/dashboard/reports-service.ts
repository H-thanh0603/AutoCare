import { InvoiceStatus, RepairOrderStatus } from "@/generated/prisma/enums";
import { addMoney, subtractMoney } from "@/lib/money";
import { prisma } from "@/lib/prisma";

export interface DashboardMetricsDTO {
  todayAppointmentsCount: number;
  activeRepairOrdersCount: number;
  monthlyRevenueVnd: number;
  pendingBalanceVnd: number;
  lowStockPartsCount: number;
  recentRepairOrders: Array<{
    id: string;
    code: string;
    status: RepairOrderStatus;
    receivedAt: Date;
    vehiclePlate: string;
    vehicleModel: string;
    customerName: string;
  }>;
}

export async function getDashboardMetrics(garageId: string): Promise<DashboardMetricsDTO> {
  const startOfDay = new Date();
  startOfDay.setHours(0, 0, 0, 0);

  const endOfDay = new Date();
  endOfDay.setHours(23, 59, 59, 999);

  const startOfMonth = new Date(startOfDay.getFullYear(), startOfDay.getMonth(), 1);

  const [
    todayAppointmentsCount,
    activeRepairOrdersCount,
    monthlyPayments,
    unpaidInvoices,
    parts,
    recentOrders,
  ] = await Promise.all([
    // Today's appointments count
    prisma.appointment.count({
      where: {
        garageId,
        scheduledAt: { gte: startOfDay, lte: endOfDay },
        status: { in: ["PENDING", "CONFIRMED", "ARRIVED"] },
      },
    }),

    // Active repair orders count
    prisma.repairOrder.count({
      where: {
        garageId,
        status: {
          in: [
            "RECEIVED",
            "INSPECTING",
            "WAITING_CUSTOMER_APPROVAL",
            "WAITING_PARTS",
            "IN_PROGRESS",
            "QUALITY_CHECK",
            "READY_FOR_DELIVERY",
          ],
        },
      },
    }),

    // Monthly payments
    prisma.payment.findMany({
      where: {
        garageId,
        paidAt: { gte: startOfMonth },
      },
      select: { amount: true, type: true },
    }),

    // Unpaid/Pending invoices
    prisma.invoice.findMany({
      where: {
        garageId,
        status: { in: ["ISSUED", "PARTIALLY_PAID", "OVERDUE"] },
      },
      select: { totalAmount: true, paidAmount: true },
    }),

    // Active parts for low-stock calculation
    prisma.part.findMany({
      where: { garageId, isActive: true },
      select: { quantityInStock: true, lowStockThreshold: true },
    }),

    // Recent 5 repair orders
    prisma.repairOrder.findMany({
      where: { garageId },
      include: {
        vehicle: { select: { licensePlate: true, brand: true, model: true } },
        customer: { select: { name: true } },
      },
      orderBy: { receivedAt: "desc" },
      take: 5,
    }),
  ]);

  let monthlyRevenueVnd = 0;
  for (const p of monthlyPayments) {
    if (p.type === "PAYMENT" || p.type === "DEPOSIT") {
      monthlyRevenueVnd = addMoney(monthlyRevenueVnd, p.amount);
    } else if (p.type === "REFUND") {
      monthlyRevenueVnd = Math.max(0, subtractMoney(monthlyRevenueVnd, p.amount));
    }
  }

  let pendingBalanceVnd = 0;
  for (const inv of unpaidInvoices) {
    const due = Math.max(0, subtractMoney(inv.totalAmount, inv.paidAmount));
    pendingBalanceVnd = addMoney(pendingBalanceVnd, due);
  }

  const lowStockPartsCount = parts.filter((p) => p.quantityInStock <= p.lowStockThreshold).length;

  return {
    todayAppointmentsCount,
    activeRepairOrdersCount,
    monthlyRevenueVnd,
    pendingBalanceVnd,
    lowStockPartsCount,
    recentRepairOrders: recentOrders.map((ro) => ({
      id: ro.id,
      code: ro.code,
      status: ro.status,
      receivedAt: ro.receivedAt,
      vehiclePlate: ro.vehicle.licensePlate,
      vehicleModel: `${ro.vehicle.brand} ${ro.vehicle.model}`.trim(),
      customerName: ro.customer.name,
    })),
  };
}

export async function getRevenueReport(
  garageId: string,
  startDate?: Date,
  endDate?: Date,
) {
  const dateFilter = {
    ...(startDate || endDate
      ? {
          paidAt: {
            ...(startDate ? { gte: startDate } : {}),
            ...(endDate ? { lte: endDate } : {}),
          },
        }
      : {}),
  };

  const payments = await prisma.payment.findMany({
    where: {
      garageId,
      ...dateFilter,
    },
    include: {
      invoice: { select: { code: true, customer: { select: { name: true } } } },
    },
    orderBy: { paidAt: "desc" },
  });

  const byMethod: Record<string, number> = {
    CASH: 0,
    BANK_TRANSFER: 0,
    CARD: 0,
    OTHER: 0,
  };

  let totalCollected = 0;
  let totalRefunded = 0;

  for (const p of payments) {
    if (p.type === "PAYMENT" || p.type === "DEPOSIT") {
      byMethod[p.method] = addMoney(byMethod[p.method] ?? 0, p.amount);
      totalCollected = addMoney(totalCollected, p.amount);
    } else if (p.type === "REFUND") {
      totalRefunded = addMoney(totalRefunded, p.amount);
    }
  }

  const netRevenue = Math.max(0, subtractMoney(totalCollected, totalRefunded));

  return {
    totalCollected,
    totalRefunded,
    netRevenue,
    byMethod,
    paymentCount: payments.length,
    payments,
  };
}

export async function getServiceReport(
  garageId: string,
  startDate?: Date,
  endDate?: Date,
) {
  const invoices = await prisma.invoice.findMany({
    where: {
      garageId,
      status: { in: [InvoiceStatus.ISSUED, InvoiceStatus.PARTIALLY_PAID, InvoiceStatus.PAID] },
      ...(startDate || endDate
        ? {
            createdAt: {
              ...(startDate ? { gte: startDate } : {}),
              ...(endDate ? { lte: endDate } : {}),
            },
          }
        : {}),
    },
    include: {
      items: true,
    },
  });

  const serviceStatsMap = new Map<string, { description: string; count: number; totalRevenue: number }>();

  for (const inv of invoices) {
    for (const item of inv.items) {
      const key = item.description.trim().toLowerCase();
      const existing = serviceStatsMap.get(key) ?? { description: item.description, count: 0, totalRevenue: 0 };
      existing.count += item.quantity;
      existing.totalRevenue = addMoney(existing.totalRevenue, item.totalAmount);
      serviceStatsMap.set(key, existing);
    }
  }

  const topServices = Array.from(serviceStatsMap.values()).sort((a, b) => b.totalRevenue - a.totalRevenue);

  return {
    totalInvoicesAnalyzed: invoices.length,
    topServices,
  };
}

export async function getTechnicianReport(
  garageId: string,
  startDate?: Date,
  endDate?: Date,
) {
  const workTasks = await prisma.workTask.findMany({
    where: {
      garageId,
      assignedToId: { not: null },
      ...(startDate || endDate
        ? {
            createdAt: {
              ...(startDate ? { gte: startDate } : {}),
              ...(endDate ? { lte: endDate } : {}),
            },
          }
        : {}),
    },
    include: {
      assignedTo: { select: { id: true, name: true, email: true } },
      workLogs: true,
    },
  });

  const techMap = new Map<string, { technician: { id: string; name: string; email: string }; totalTasks: number; completedTasks: number; totalMinutesSpent: number }>();

  for (const task of workTasks) {
    if (!task.assignedTo) continue;
    const techId = task.assignedTo.id;
    const existing = techMap.get(techId) ?? {
      technician: task.assignedTo,
      totalTasks: 0,
      completedTasks: 0,
      totalMinutesSpent: 0,
    };

    existing.totalTasks += 1;
    if (task.status === "COMPLETED") existing.completedTasks += 1;

    const taskLoggedMinutes = task.workLogs.reduce((sum, log) => sum + (log.minutesSpent ?? 0), 0);
    existing.totalMinutesSpent += taskLoggedMinutes;

    techMap.set(techId, existing);
  }

  return Array.from(techMap.values()).sort((a, b) => b.completedTasks - a.completedTasks);
}

export async function getInventoryReport(garageId: string) {
  const parts = await prisma.part.findMany({
    where: { garageId, isActive: true },
    orderBy: { name: "asc" },
  });

  let totalCostValueVnd = 0;
  let totalRetailValueVnd = 0;
  const lowStockList: typeof parts = [];

  for (const p of parts) {
    if (p.quantityInStock > 0) {
      totalCostValueVnd = addMoney(totalCostValueVnd, p.quantityInStock * p.costPrice);
      totalRetailValueVnd = addMoney(totalRetailValueVnd, p.quantityInStock * p.sellPrice);
    }
    if (p.quantityInStock <= p.lowStockThreshold) {
      lowStockList.push(p);
    }
  }

  const recentTransactions = await prisma.inventoryTransaction.findMany({
    where: { garageId },
    include: {
      part: { select: { name: true, sku: true, unit: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 10,
  });

  return {
    totalPartsCount: parts.length,
    totalCostValueVnd,
    totalRetailValueVnd,
    lowStockCount: lowStockList.length,
    lowStockList,
    recentTransactions,
  };
}
