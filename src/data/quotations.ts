import { prisma, type PrismaClientOrTx } from "@/lib/prisma";

export async function listQuotationsForRepairOrder(
  garageId: string,
  repairOrderId: string,
  db: PrismaClientOrTx = prisma,
) {
  return db.quotation.findMany({
    where: { garageId, repairOrderId },
    select: {
      id: true,
      versionNo: true,
      status: true,
      totalAmount: true,
      note: true,
      items: { select: { id: true, description: true, totalAmount: true, status: true }, orderBy: { sortOrder: "asc" } },
    },
    orderBy: { versionNo: "desc" },
  });
}
