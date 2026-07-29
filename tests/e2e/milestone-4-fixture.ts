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
      code: `RO-E2E-M4-${Date.now()}`,
      vehicleId: ownership.vehicleId,
      customerId: customer.id,
    },
  });
  return { repairOrderId: repairOrder.id };
}

async function cleanup(repairOrderId: string) {
  const [repairOrder, inspection, quotations] = await Promise.all([
    prisma.repairOrder.findUnique({ where: { id: repairOrderId }, select: { customer: { select: { userId: true } } } }),
    prisma.inspection.findUnique({ where: { repairOrderId }, select: { id: true } }),
    prisma.quotation.findMany({ where: { repairOrderId }, select: { id: true } }),
  ]);
  const quotationIds = quotations.map((quotation) => quotation.id);
  const notificationIds = repairOrder?.customer.userId
    ? (await prisma.notification.findMany({ where: { userId: repairOrder.customer.userId }, select: { id: true, data: true } }))
      .filter((notification) => {
        const data = notification.data as { href?: unknown } | null;
        const href = data?.href;
        return typeof href === "string" && quotationIds.some((id) => href.endsWith(id));
      })
      .map((notification) => notification.id)
    : [];
  await prisma.notification.deleteMany({ where: { id: { in: notificationIds } } });
  await prisma.auditLog.deleteMany({ where: { entityId: { in: [repairOrderId, inspection?.id ?? "", ...quotationIds] } } });
  await prisma.quotationItem.deleteMany({ where: { quotationId: { in: quotationIds } } });
  await prisma.quotation.deleteMany({ where: { id: { in: quotationIds } } });
  if (inspection) {
    await prisma.inspectionItem.deleteMany({ where: { inspectionId: inspection.id } });
    await prisma.inspection.deleteMany({ where: { id: inspection.id } });
  }
  await prisma.repairOrder.deleteMany({ where: { id: repairOrderId } });
}

async function main() {
  const [mode, value] = process.argv.slice(2);
  const output = mode === "setup" ? await setup(value) : await cleanup(value);
  console.log(JSON.stringify(output ?? {}));
}

main()
  .finally(() => prisma.$disconnect());
