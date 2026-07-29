import { prisma, type PrismaClientOrTx } from "@/lib/prisma";

const inspectionSelect = {
  id: true,
  repairOrderId: true,
  inspectorId: true,
  summary: true,
  startedAt: true,
  completedAt: true,
  items: {
    select: {
      id: true,
      category: true,
      name: true,
      severity: true,
      finding: true,
      recommendation: true,
      sortOrder: true,
    },
    orderBy: { sortOrder: "asc" },
  },
} as const;

export type InspectionDetail = {
  id: string;
  repairOrderId: string;
  inspectorId: string | null;
  summary: string | null;
  startedAt: Date;
  completedAt: Date | null;
  items: Array<{
    id: string;
    category: string;
    name: string;
    severity: "OK" | "ATTENTION" | "URGENT";
    finding: string | null;
    recommendation: string | null;
    sortOrder: number;
  }>;
};

export async function getInspectionForRepairOrder(
  garageId: string,
  repairOrderId: string,
  db: PrismaClientOrTx = prisma,
): Promise<InspectionDetail | null> {
  return db.inspection.findFirst({
    where: { garageId, repairOrderId },
    select: inspectionSelect,
  });
}
