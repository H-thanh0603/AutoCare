import { getInspectionForRepairOrder } from "@/data/inspections";
import type { InspectionInput } from "@/features/inspections/schema";
import { AUDIT_ACTIONS, recordAudit } from "@/lib/audit";
import { BusinessRuleError, NotFoundError } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import { assertRepairOrderTransition } from "@/lib/transitions";

export async function startInspection(
  garageId: string,
  actorUserId: string,
  repairOrderId: string,
): Promise<{ id: string }> {
  return prisma.$transaction(async (tx) => {
    const order = await tx.repairOrder.findFirst({
      where: { id: repairOrderId, garageId },
      select: { id: true, status: true },
    });
    if (!order) throw new NotFoundError("Không tìm thấy lệnh sửa chữa.");

    assertRepairOrderTransition(order.status, "INSPECTING");
    const inspection = await tx.inspection.create({
      data: { garageId, repairOrderId, inspectorId: actorUserId },
      select: { id: true },
    });
    await tx.repairOrder.update({
      where: { id: order.id },
      data: { status: "INSPECTING" },
    });
    await recordAudit(
      {
        action: AUDIT_ACTIONS.INSPECTION_STARTED,
        entityType: "Inspection",
        entityId: inspection.id,
        garageId,
        actorUserId,
        before: { repairOrderStatus: order.status },
        after: { repairOrderStatus: "INSPECTING" },
      },
      tx,
    );
    return inspection;
  });
}

export async function saveInspection(
  garageId: string,
  actorUserId: string,
  repairOrderId: string,
  input: InspectionInput,
): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const inspection = await getInspectionForRepairOrder(garageId, repairOrderId, tx);
    if (!inspection) throw new NotFoundError("Không tìm thấy phiếu kiểm tra.");

    const order = await tx.repairOrder.findFirst({
      where: { id: repairOrderId, garageId },
      select: { status: true },
    });
    if (!order) throw new NotFoundError("Không tìm thấy lệnh sửa chữa.");
    if (order.status !== "INSPECTING") {
      throw new BusinessRuleError("Chỉ có thể cập nhật khi xe đang được kiểm tra.");
    }

    const submittedIds = input.items.flatMap((item) => (item.id ? [item.id] : []));
    const existingIds = new Set(inspection.items.map((item) => item.id));
    if (submittedIds.some((id) => !existingIds.has(id))) {
      throw new NotFoundError("Không tìm thấy hạng mục kiểm tra.");
    }

    await tx.inspection.update({
      where: { id: inspection.id },
      data: { summary: input.summary },
    });
    await tx.inspectionItem.deleteMany({
      where: {
        inspectionId: inspection.id,
        ...(submittedIds.length ? { id: { notIn: submittedIds } } : {}),
      },
    });

    for (const [sortOrder, item] of input.items.entries()) {
      const data = {
        category: item.category,
        name: item.name,
        severity: item.severity,
        finding: item.finding,
        recommendation: item.recommendation,
        sortOrder,
      };
      if (item.id) {
        await tx.inspectionItem.update({ where: { id: item.id }, data });
      } else {
        await tx.inspectionItem.create({ data: { inspectionId: inspection.id, ...data } });
      }
    }

    await recordAudit(
      {
        action: AUDIT_ACTIONS.INSPECTION_UPDATED,
        entityType: "Inspection",
        entityId: inspection.id,
        garageId,
        actorUserId,
        after: { summary: input.summary, itemCount: input.items.length },
      },
      tx,
    );
  });
}
