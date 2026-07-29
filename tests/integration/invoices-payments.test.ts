import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  createInvoiceFromRepairOrder,
  getInvoiceById,
  issueInvoice,
  recordPayment,
} from "@/features/invoices/service";
import { saveQuotationDraft, sendQuotation, decideQuotationItem } from "@/features/quotations/service";
import { deliverVehicle, passQualityCheck } from "@/features/repair-orders/service";
import { updateWorkTaskStatus } from "@/features/work-tasks/service";
import { BusinessRuleError } from "@/lib/errors";
import { prisma } from "@/lib/prisma";

const PREFIX = `test-inv-${Date.now()}`;

let garageId: string;
let actorUserId: string;
let customerUserId: string;
let vehicleId: string;
let repairOrderId: string;

beforeAll(async () => {
  const garage = await prisma.garage.create({
    data: { name: `${PREFIX}-garage`, phone: "0900000000" },
  });
  garageId = garage.id;

  const [customerUser, actorUser] = await Promise.all([
    prisma.user.create({
      data: { email: `${PREFIX}-cust@example.com`, passwordHash: "hash", name: "Cust Test" },
    }),
    prisma.user.create({
      data: { email: `${PREFIX}-cashier@example.com`, passwordHash: "hash", name: "Cashier Test", role: "STAFF" },
    }),
  ]);
  customerUserId = customerUser.id;
  actorUserId = actorUser.id;

  await prisma.garageMember.create({
    data: { garageId, userId: actorUserId, role: "GARAGE_MANAGER" },
  });

  const customer = await prisma.customer.create({
    data: { garageId, userId: customerUserId, name: "Cust Test", phone: PREFIX },
  });

  const vehicle = await prisma.vehicle.create({
    data: { licensePlate: "51H-88888", brand: "Honda", model: "Civic" },
  });
  vehicleId = vehicle.id;

  await prisma.vehicleOwnership.create({
    data: { vehicleId, customerId: customer.id, isCurrent: true },
  });

  const order = await prisma.repairOrder.create({
    data: {
      garageId,
      code: `RO-INV-${Date.now()}`,
      vehicleId,
      customerId: customer.id,
      status: "INSPECTING",
    },
  });
  repairOrderId = order.id;

  // Setup quotation and work tasks
  const q = await saveQuotationDraft(garageId, actorUserId, {
    repairOrderId,
    note: "Sửa phanh",
    validUntil: null,
    items: [
      { type: "SERVICE", description: "Bảo dưỡng phanh 4 bánh", quantity: 1, unitPrice: 500000, discountAmount: 0 },
    ],
  });
  await sendQuotation(garageId, actorUserId, q.id);

  const items = await prisma.quotationItem.findMany({ where: { quotationId: q.id } });
  await decideQuotationItem(customerUserId, items[0].id, { status: "APPROVED", customerNote: null });

  const tasks = await prisma.workTask.findMany({ where: { repairOrderId } });
  await updateWorkTaskStatus({ garageId, workTaskId: tasks[0].id, status: "IN_PROGRESS", actorUserId });
  await updateWorkTaskStatus({ garageId, workTaskId: tasks[0].id, status: "QUALITY_CHECK", actorUserId });
  await updateWorkTaskStatus({ garageId, workTaskId: tasks[0].id, status: "COMPLETED", actorUserId });
});

afterAll(async () => {
  await prisma.payment.deleteMany({ where: { garageId } });
  await prisma.invoiceItem.deleteMany({ where: { invoice: { garageId } } });
  await prisma.invoice.deleteMany({ where: { garageId } });
  await prisma.workTask.deleteMany({ where: { garageId } });
  await prisma.quotationItem.deleteMany({ where: { quotation: { garageId } } });
  await prisma.quotation.deleteMany({ where: { garageId } });
  await prisma.repairOrder.deleteMany({ where: { garageId } });
  await prisma.vehicleOwnership.deleteMany({ where: { vehicleId } });
  await prisma.warranty.deleteMany({ where: { vehicleId } });
  await prisma.vehicleTimelineEvent.deleteMany({ where: { vehicleId } });
  await prisma.maintenanceRecord.deleteMany({ where: { vehicleId } });
  await prisma.vehicle.deleteMany({ where: { id: vehicleId } });
  await prisma.customer.deleteMany({ where: { garageId } });
  await prisma.garageMember.deleteMany({ where: { garageId } });
  await prisma.notification.deleteMany({ where: { garageId } });
  await prisma.auditLog.deleteMany({ where: { garageId } });
  await prisma.repairOrderSequence.deleteMany({ where: { garageId } });
  await prisma.user.deleteMany({ where: { id: { in: [customerUserId, actorUserId] } } });
  await prisma.garage.deleteMany({ where: { id: garageId } });
});

describe("Invoices, Payments & Quality Delivery Integration", () => {
  let invoiceId: string;

  it("fails to deliver vehicle before quality check completion (Rule 10)", async () => {
    await expect(
      deliverVehicle({ garageId, repairOrderId, actorUserId }),
    ).rejects.toThrow(BusinessRuleError);
  });

  it("passes quality check and updates RepairOrder to READY_FOR_DELIVERY", async () => {
    const roBefore = await prisma.repairOrder.findUnique({ where: { id: repairOrderId } });
    expect(roBefore?.status).toBe("QUALITY_CHECK");

    await passQualityCheck({ garageId, repairOrderId, actorUserId, note: "Đạt chuẩn" });

    const roAfter = await prisma.repairOrder.findUnique({ where: { id: repairOrderId } });
    expect(roAfter?.status).toBe("READY_FOR_DELIVERY");
  });

  it("creates invoice from repair order and checks balance", async () => {
    const inv = await createInvoiceFromRepairOrder({
      garageId,
      repairOrderId,
      actorUserId,
    });

    expect(inv.code).toMatch(/^INV-\d{4}-\d{4}$/);
    expect(inv.status).toBe("DRAFT");
    expect(inv.totalAmount).toBe(500000);
    invoiceId = inv.id;
  });

  it("issues invoice and records deposit & partial payment", async () => {
    await issueInvoice({ garageId, invoiceId, actorUserId });

    await recordPayment({
      garageId,
      invoiceId,
      type: "DEPOSIT",
      method: "CASH",
      amount: 200000,
      actorUserId,
    });

    let details = await getInvoiceById(invoiceId, garageId);
    expect(details.paidAmount).toBe(200000);
    expect(details.status).toBe("PARTIALLY_PAID");

    await recordPayment({
      garageId,
      invoiceId,
      type: "PAYMENT",
      method: "BANK_TRANSFER",
      amount: 300000,
      actorUserId,
    });

    details = await getInvoiceById(invoiceId, garageId);
    expect(details.paidAmount).toBe(500000);
    expect(details.status).toBe("PAID");
  });

  it("delivers vehicle successfully after quality check and payment", async () => {
    await deliverVehicle({ garageId, repairOrderId, actorUserId });

    const ro = await prisma.repairOrder.findUnique({ where: { id: repairOrderId } });
    expect(ro?.status).toBe("COMPLETED");
    expect(ro?.deliveredAt).toBeDefined();
  });
});
