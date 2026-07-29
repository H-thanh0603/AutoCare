import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createPart, issuePartForTask, receivePartStock, getLowStockParts } from "@/features/inventory/service";
import { saveQuotationDraft, sendQuotation, decideQuotationItem, createSupplementaryQuotation } from "@/features/quotations/service";
import { assignTechnician, getWorkTasks, updateWorkTaskStatus } from "@/features/work-tasks/service";
import { BusinessRuleError } from "@/lib/errors";
import { prisma } from "@/lib/prisma";

const PREFIX = `test-work-inv-${Date.now()}`;

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
      data: { email: `${PREFIX}-cust@example.com`, passwordHash: "hash", name: "Cust Test" },
    }),
    prisma.user.create({
      data: { email: `${PREFIX}-tech@example.com`, passwordHash: "hash", name: "Tech Test", role: "STAFF" },
    }),
  ]);
  customerUserId = customerUser.id;
  actorUserId = actorUser.id;

  await prisma.garageMember.create({
    data: { garageId, userId: actorUserId, role: "TECHNICIAN" },
  });

  const customer = await prisma.customer.create({
    data: { garageId, userId: customerUserId, name: "Cust Test", phone: PREFIX },
  });

  const vehicle = await prisma.vehicle.create({
    data: { licensePlate: "51H-99999", brand: "Toyota", model: "Camry" },
  });
  vehicleId = vehicle.id;

  await prisma.vehicleOwnership.create({
    data: { vehicleId, customerId: customer.id, isCurrent: true },
  });

  const order = await prisma.repairOrder.create({
    data: {
      garageId,
      code: `RO-TEST-${Date.now()}`,
      vehicleId,
      customerId: customer.id,
      status: "INSPECTING",
    },
  });
  repairOrderId = order.id;

  const part = await createPart({
    garageId,
    sku: `SKU-${Date.now()}`,
    name: "Lọc gió động cơ",
    costPrice: 150000,
    sellPrice: 250000,
    quantityInStock: 5,
    lowStockThreshold: 2,
    actorUserId,
  });
  partId = part.id;
});

afterAll(async () => {
  await prisma.inventoryTransaction.deleteMany({ where: { garageId } });
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
  await prisma.user.deleteMany({ where: { id: { in: [customerUserId, actorUserId] } } });
  await prisma.garage.deleteMany({ where: { id: garageId } });
});

describe("Work Management & Inventory Integration", () => {
  let quotationId: string;
  let quotationItemId: string;
  let createdWorkTaskId: string;

  it("creates a quotation draft and sends it to customer", async () => {
    const q = await saveQuotationDraft(garageId, actorUserId, {
      repairOrderId,
      note: "Thay lọc gió",
      validUntil: null,
      items: [
        { type: "PART", description: "Thay lọc gió động cơ", quantity: 1, unitPrice: 250000, discountAmount: 0 },
      ],
    });
    quotationId = q.id;

    const items = await prisma.quotationItem.findMany({ where: { quotationId } });
    expect(items).toHaveLength(1);
    quotationItemId = items[0].id;

    await sendQuotation(garageId, actorUserId, quotationId);
    const order = await prisma.repairOrder.findUnique({ where: { id: repairOrderId } });
    expect(order?.status).toBe("WAITING_CUSTOMER_APPROVAL");
  });

  it("automatically creates a WorkTask when customer approves the quotation item", async () => {
    await decideQuotationItem(customerUserId, quotationItemId, { status: "APPROVED", customerNote: "Đồng ý" });

    const tasks = await getWorkTasks(garageId, { repairOrderId });
    expect(tasks).toHaveLength(1);
    expect(tasks[0].title).toBe("Thay lọc gió động cơ");
    expect(tasks[0].status).toBe("NOT_STARTED");
    createdWorkTaskId = tasks[0].id;

    const order = await prisma.repairOrder.findUnique({ where: { id: repairOrderId } });
    expect(order?.status).toBe("IN_PROGRESS");
  });

  it("assigns technician to work task", async () => {
    await assignTechnician({
      garageId,
      workTaskId: createdWorkTaskId,
      technicianId: actorUserId,
      actorUserId,
    });

    const task = await prisma.workTask.findUnique({ where: { id: createdWorkTaskId } });
    expect(task?.assignedToId).toBe(actorUserId);
  });

  it("issues stock for task and updates inventory balance", async () => {
    await updateWorkTaskStatus({
      garageId,
      workTaskId: createdWorkTaskId,
      status: "IN_PROGRESS",
      actorUserId,
    });

    await issuePartForTask({
      garageId,
      partId,
      workTaskId: createdWorkTaskId,
      quantity: 4,
      actorUserId,
    });

    const part = await prisma.part.findUnique({ where: { id: partId } });
    expect(part?.quantityInStock).toBe(1);

    const lowStock = await getLowStockParts(garageId);
    expect(lowStock.some((p) => p.id === partId)).toBe(true);
  });

  it("fails to issue stock if stock is insufficient", async () => {
    await expect(
      issuePartForTask({
        garageId,
        partId,
        workTaskId: createdWorkTaskId,
        quantity: 10,
        actorUserId,
      }),
    ).rejects.toThrow(BusinessRuleError);

    const task = await prisma.workTask.findUnique({ where: { id: createdWorkTaskId } });
    expect(task?.status).toBe("WAITING_PARTS");
  });

  it("resumes work task after receiving stock", async () => {
    await receivePartStock({
      garageId,
      partId,
      quantity: 10,
      unitCost: 150000,
      reason: "Nhập bổ sung",
      actorUserId,
    });

    await issuePartForTask({
      garageId,
      partId,
      workTaskId: createdWorkTaskId,
      quantity: 1,
      actorUserId,
    });

    const task = await prisma.workTask.findUnique({ where: { id: createdWorkTaskId } });
    expect(task?.status).toBe("IN_PROGRESS");
  });

  it("handles supplementary quotation flow for extra findings", async () => {
    const supp = await createSupplementaryQuotation(garageId, actorUserId, {
      parentQuotationId: quotationId,
      repairOrderId,
      note: "Phát sinh thêm bugi",
      validUntil: null,
      workTaskId: createdWorkTaskId,
      items: [
        { type: "PART", description: "Thay 4 bugi Denso", quantity: 4, unitPrice: 100000, discountAmount: 0 },
      ],
    });

    const taskBefore = await prisma.workTask.findUnique({ where: { id: createdWorkTaskId } });
    expect(taskBefore?.status).toBe("WAITING_APPROVAL");

    await sendQuotation(garageId, actorUserId, supp.id);

    const suppItems = await prisma.quotationItem.findMany({ where: { quotationId: supp.id } });
    await decideQuotationItem(customerUserId, suppItems[0].id, { status: "APPROVED", customerNote: "Ok thay" });

    const allTasks = await getWorkTasks(garageId, { repairOrderId });
    expect(allTasks).toHaveLength(2);

    const suppTask = allTasks.find((t) => t.title === "Thay 4 bugi Denso");
    expect(suppTask).toBeDefined();
    expect(suppTask?.status).toBe("NOT_STARTED");
  });
});
