/**
 * E2E fixture for the full 16-step lifecycle test.
 *
 * setup: creates customer + vehicle + repair order (IN_PROGRESS, with approved quotation item)
 * cleanup: tears down everything created
 *
 * Usage:
 *   execFileSync(process.execPath, ["--import", "tsx", "tests/e2e/full-lifecycle-fixture.ts", "setup", customerEmail])
 *   execFileSync(process.execPath, ["--import", "tsx", "tests/e2e/full-lifecycle-fixture.ts", "cleanup", repairOrderId])
 */

import { prisma } from "../../src/lib/prisma";

async function setup(customerEmail: string) {
  const customer = await prisma.customer.findFirstOrThrow({
    where: { user: { email: customerEmail } },
  });
  const ownership = await prisma.vehicleOwnership.findFirstOrThrow({
    where: { customerId: customer.id, isCurrent: true, endedAt: null },
  });

  const repairOrder = await prisma.repairOrder.create({
    data: {
      garageId: customer.garageId,
      code: `RO-E2E-FULL-${Date.now()}`,
      vehicleId: ownership.vehicleId,
      customerId: customer.id,
      status: "IN_PROGRESS",
      mileageKm: 10_000,
      fuelLevel: 50,
      initialNote: "E2E full lifecycle test — created by fixture.",
    },
  });

  const service = await prisma.service.create({
    data: {
      garageId: customer.garageId,
      name: "E2E Test Service",
      basePrice: 500_000,
      estimatedMinutes: 60,
    },
  });

  const part = await prisma.part.create({
    data: {
      garageId: customer.garageId,
      sku: `E2E-PART-${Date.now()}`,
      name: "E2E Test Part",
      unit: "cai",
      costPrice: 200_000,
      sellPrice: 350_000,
      quantityInStock: 10,
      lowStockThreshold: 2,
    },
  });

  const quotation = await prisma.quotation.create({
    data: {
      garageId: customer.garageId,
      repairOrderId: repairOrder.id,
      versionNo: 1,
      status: "APPROVED",
      note: "E2E full lifecycle quotation.",
      validUntil: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      sentAt: new Date(),
      decidedAt: new Date(),
      totalAmount: 850_000,
      createdById: (await prisma.garageMember.findFirstOrThrow({
        where: { garageId: customer.garageId, role: "RECEPTIONIST" },
      })).userId,
      items: {
        create: [
          {
            type: "SERVICE",
            serviceId: service.id,
            description: "E2E Test Service",
            quantity: 1,
            unitPrice: 500_000,
            totalAmount: 500_000,
            status: "APPROVED",
            sortOrder: 1,
          },
          {
            type: "PART",
            partId: part.id,
            description: "E2E Test Part",
            quantity: 1,
            unitPrice: 350_000,
            totalAmount: 350_000,
            status: "APPROVED",
            sortOrder: 2,
          },
        ],
      },
    },
    include: { items: true },
  });

  const technician = await prisma.garageMember.findFirstOrThrow({
    where: { garageId: customer.garageId, role: "TECHNICIAN" },
  });

  for (const item of quotation.items) {
    await prisma.workTask.create({
      data: {
        garageId: customer.garageId,
        repairOrderId: repairOrder.id,
        quotationItemId: item.id,
        title: item.description,
        description: `E2E work task: ${item.description}`,
        status: "NOT_STARTED",
        assignedToId: technician.userId,
        estimatedMinutes: 60,
      },
    });
  }

  return { repairOrderId: repairOrder.id };
}

async function cleanup(repairOrderId: string) {
  const repairOrder = await prisma.repairOrder.findUnique({
    where: { id: repairOrderId },
    select: { id: true },
  });
  if (!repairOrder) return;

  const relatedIds = await getRelatedIds(repairOrderId);

  await prisma.notification.deleteMany({ where: { id: { in: relatedIds.notificationIds } } });
  await prisma.auditLog.deleteMany({ where: { id: { in: relatedIds.auditLogIds } } });
  await prisma.workLog.deleteMany({ where: { workTaskId: { in: relatedIds.workTaskIds } } });
  await prisma.workTask.deleteMany({ where: { id: { in: relatedIds.workTaskIds } } });
  await prisma.payment.deleteMany({ where: { id: { in: relatedIds.paymentIds } } });
  await prisma.invoiceItem.deleteMany({ where: { invoiceId: { in: relatedIds.invoiceIds } } });
  await prisma.invoice.deleteMany({ where: { id: { in: relatedIds.invoiceIds } } });
  await prisma.quotationItem.deleteMany({ where: { quotationId: { in: relatedIds.quotationIds } } });
  await prisma.quotation.deleteMany({ where: { id: { in: relatedIds.quotationIds } } });
  await prisma.inspectionItem.deleteMany({ where: { inspectionId: { in: relatedIds.inspectionIds } } });
  await prisma.inspection.deleteMany({ where: { id: { in: relatedIds.inspectionIds } } });
  await prisma.vehicleTimelineEvent.deleteMany({ where: { repairOrderId } });
  await prisma.maintenanceRecord.deleteMany({ where: { repairOrderId } });
  await prisma.repairOrder.deleteMany({ where: { id: repairOrderId } });

  // Clean up fixture-created service and part (only if no other references)
  const orphanService = await prisma.service.findFirst({
    where: { name: "E2E Test Service" },
    select: { id: true },
  });
  if (orphanService) {
    await prisma.service.delete({ where: { id: orphanService.id } }).catch(() => {});
  }
  const orphanPart = await prisma.part.findFirst({
    where: { name: "E2E Test Part" },
    select: { id: true },
  });
  if (orphanPart) {
    await prisma.part.delete({ where: { id: orphanPart.id } }).catch(() => {});
  }
}

async function getRelatedIds(repairOrderId: string) {
  const [quotations, inspections, workTasks, invoices] = await Promise.all([
    prisma.quotation.findMany({ where: { repairOrderId }, select: { id: true } }),
    prisma.inspection.findMany({ where: { repairOrderId }, select: { id: true } }),
    prisma.workTask.findMany({ where: { repairOrderId }, select: { id: true } }),
    prisma.invoice.findMany({ where: { repairOrderId }, select: { id: true } }),
  ]);

  const quotationIds = quotations.map((q) => q.id);
  const inspectionIds = inspections.map((i) => i.id);
  const workTaskIds = workTasks.map((w) => w.id);
  const invoiceIds = invoices.map((inv) => inv.id);

  const payments = invoiceIds.length
    ? await prisma.payment.findMany({ where: { invoiceId: { in: invoiceIds } }, select: { id: true } })
    : [];
  const paymentIds = payments.map((p) => p.id);

  const auditLogs = await prisma.auditLog.findMany({
    where: { entityId: { in: [repairOrderId, ...inspectionIds, ...quotationIds, ...workTaskIds, ...invoiceIds] } },
    select: { id: true },
  });
  const auditLogIds = auditLogs.map((a) => a.id);

  const notifications = await prisma.notification.findMany({
    where: { data: { path: ["href"], string_contains: repairOrderId } },
    select: { id: true },
  });
  const notificationIds = notifications.map((n) => n.id);

  return { quotationIds, inspectionIds, workTaskIds, invoiceIds, paymentIds, auditLogIds, notificationIds };
}

async function main() {
  const [mode, value] = process.argv.slice(2);
  const output = mode === "setup" ? await setup(value) : await cleanup(value);
  console.log(JSON.stringify(output ?? {}));
}

main().finally(() => prisma.$disconnect());
