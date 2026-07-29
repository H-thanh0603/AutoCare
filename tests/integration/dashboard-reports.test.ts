import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  getDashboardMetrics,
  getInventoryReport,
  getRevenueReport,
  getServiceReport,
  getTechnicianReport,
} from "@/features/dashboard/reports-service";
import { createPart, issuePartForTask } from "@/features/inventory/service";
import { createInvoiceFromRepairOrder, issueInvoice, recordPayment } from "@/features/invoices/service";
import { saveQuotationDraft, sendQuotation, decideQuotationItem } from "@/features/quotations/service";
import { addWorkLog, assignTechnician, updateWorkTaskStatus } from "@/features/work-tasks/service";
import { prisma } from "@/lib/prisma";

const PREFIX = `test-rpt-${Date.now()}`;

let garageId: string;
let actorUserId: string;
let customerUserId: string;
let vehicleId: string;
let repairOrderId: string;
let partId: string;

beforeAll(async () => {
  const garage = await prisma.garage.create({
    data: { name: `${PREFIX}-garage`, phone: "0900000000" },
  });
  garageId = garage.id;

  const [customerUser, actorUser] = await Promise.all([
    prisma.user.create({
      data: { email: `${PREFIX}-cust@example.com`, passwordHash: "hash", name: "Khách Hàng RPT" },
    }),
    prisma.user.create({
      data: { email: `${PREFIX}-mgr@example.com`, passwordHash: "hash", name: "Manager RPT", role: "STAFF" },
    }),
  ]);
  customerUserId = customerUser.id;
  actorUserId = actorUser.id;

  await prisma.garageMember.create({
    data: { garageId, userId: actorUserId, role: "GARAGE_MANAGER" },
  });

  const customer = await prisma.customer.create({
    data: { garageId, userId: customerUserId, name: "Khách Hàng RPT", phone: PREFIX },
  });

  const vehicle = await prisma.vehicle.create({
    data: { licensePlate: "51K-55555", brand: "Kia", model: "Seltos" },
  });
  vehicleId = vehicle.id;

  await prisma.vehicleOwnership.create({
    data: { vehicleId, customerId: customer.id, isCurrent: true },
  });

  const order = await prisma.repairOrder.create({
    data: {
      garageId,
      code: `RO-RPT-${Date.now()}`,
      vehicleId,
      customerId: customer.id,
      status: "INSPECTING",
    },
  });
  repairOrderId = order.id;

  const part = await createPart({
    garageId,
    sku: `SKU-RPT-${Date.now()}`,
    name: "Lọc nhớt Kia",
    costPrice: 100000,
    sellPrice: 180000,
    quantityInStock: 2,
    lowStockThreshold: 5,
    actorUserId,
  });
  partId = part.id;

  // Pipeline execution
  const q = await saveQuotationDraft(garageId, actorUserId, {
    repairOrderId,
    note: "Bảo dưỡng Kia Seltos",
    validUntil: null,
    items: [
      { type: "SERVICE", description: "Bảo dưỡng định kỳ", quantity: 1, unitPrice: 800000, discountAmount: 0 },
    ],
  });
  await sendQuotation(garageId, actorUserId, q.id);

  const items = await prisma.quotationItem.findMany({ where: { quotationId: q.id } });
  await decideQuotationItem(customerUserId, items[0].id, { status: "APPROVED", customerNote: null });

  const tasks = await prisma.workTask.findMany({ where: { repairOrderId } });
  await assignTechnician({ garageId, workTaskId: tasks[0].id, technicianId: actorUserId, actorUserId });
  await updateWorkTaskStatus({ garageId, workTaskId: tasks[0].id, status: "IN_PROGRESS", actorUserId });

  await addWorkLog({ garageId, workTaskId: tasks[0].id, userId: actorUserId, note: "Hoàn thành 80%", minutesSpent: 45 });
  await issuePartForTask({ garageId, partId, workTaskId: tasks[0].id, quantity: 1, actorUserId });

  await updateWorkTaskStatus({ garageId, workTaskId: tasks[0].id, status: "COMPLETED", actorUserId });

  const inv = await createInvoiceFromRepairOrder({ garageId, repairOrderId, actorUserId });
  await issueInvoice({ garageId, invoiceId: inv.id, actorUserId });
  await recordPayment({ garageId, invoiceId: inv.id, amount: 800000, type: "PAYMENT", method: "BANK_TRANSFER", actorUserId });
});

afterAll(async () => {
  await prisma.inventoryTransaction.deleteMany({ where: { garageId } });
  await prisma.payment.deleteMany({ where: { garageId } });
  await prisma.invoiceItem.deleteMany({ where: { invoice: { garageId } } });
  await prisma.invoice.deleteMany({ where: { garageId } });
  await prisma.workLog.deleteMany({ where: { workTask: { garageId } } });
  await prisma.workTask.deleteMany({ where: { garageId } });
  await prisma.quotationItem.deleteMany({ where: { quotation: { garageId } } });
  await prisma.quotation.deleteMany({ where: { garageId } });
  await prisma.repairOrder.deleteMany({ where: { garageId } });
  await prisma.vehicleOwnership.deleteMany({ where: { vehicleId } });
  await prisma.vehicle.deleteMany({ where: { id: vehicleId } });
  await prisma.customer.deleteMany({ where: { garageId } });
  await prisma.part.deleteMany({ where: { garageId } });
  await prisma.garageMember.deleteMany({ where: { garageId } });
  await prisma.notification.deleteMany({ where: { garageId } });
  await prisma.auditLog.deleteMany({ where: { garageId } });
  await prisma.repairOrderSequence.deleteMany({ where: { garageId } });
  await prisma.user.deleteMany({ where: { id: { in: [customerUserId, actorUserId] } } });
  await prisma.garage.deleteMany({ where: { id: garageId } });
});

describe("Dashboard Metrics & Reports Integration", () => {
  it("fetches operational dashboard metrics accurately", async () => {
    const metrics = await getDashboardMetrics(garageId);

    expect(metrics.monthlyRevenueVnd).toBe(800000);
    expect(metrics.lowStockPartsCount).toBe(1);
    expect(metrics.recentRepairOrders).toHaveLength(1);
    expect(metrics.recentRepairOrders[0].customerName).toBe("Khách Hàng RPT");
  });

  it("fetches revenue report broken down by payment method", async () => {
    const revenueRpt = await getRevenueReport(garageId);

    expect(revenueRpt.totalCollected).toBe(800000);
    expect(revenueRpt.byMethod.BANK_TRANSFER).toBe(800000);
    expect(revenueRpt.netRevenue).toBe(800000);
  });

  it("fetches top service popularity report", async () => {
    const serviceRpt = await getServiceReport(garageId);

    expect(serviceRpt.topServices.length).toBeGreaterThanOrEqual(1);
    expect(serviceRpt.topServices[0].description).toBe("Bảo dưỡng định kỳ");
    expect(serviceRpt.topServices[0].totalRevenue).toBe(800000);
  });

  it("fetches technician performance report", async () => {
    const techRpt = await getTechnicianReport(garageId);

    expect(techRpt).toHaveLength(1);
    expect(techRpt[0].technician.name).toBe("Manager RPT");
    expect(techRpt[0].completedTasks).toBe(1);
    expect(techRpt[0].totalMinutesSpent).toBe(45);
  });

  it("fetches inventory report with valuation and low-stock alerts", async () => {
    const invRpt = await getInventoryReport(garageId);

    expect(invRpt.totalPartsCount).toBe(1);
    expect(invRpt.lowStockCount).toBe(1);
    expect(invRpt.totalCostValueVnd).toBe(100000); // 1 remaining * 100000
    expect(invRpt.totalRetailValueVnd).toBe(180000); // 1 remaining * 180000
  });
});
