import { InventoryTxType } from "@/generated/prisma/enums";
import { assertSufficientStock } from "@/features/inventory/domain";
import { AUDIT_ACTIONS, recordAudit } from "@/lib/audit";
import { ConflictError, BusinessRuleError, NotFoundError, ValidationError } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import { assertRepairOrderTransition, assertWorkTaskTransition } from "@/lib/transitions";

export type CreatePartInput = {
  garageId: string;
  sku: string;
  name: string;
  unit?: string;
  costPrice: number;
  sellPrice: number;
  quantityInStock?: number;
  lowStockThreshold?: number;
  actorUserId: string;
};

export async function createPart(input: CreatePartInput) {
  const {
    garageId,
    sku,
    name,
    unit = "cái",
    costPrice,
    sellPrice,
    quantityInStock = 0,
    lowStockThreshold = 0,
    actorUserId,
  } = input;

  const trimmedSku = sku.trim().toUpperCase();
  const trimmedName = name.trim();
  if (!trimmedSku) throw new ValidationError("Mã SKU phụ tùng là bắt buộc.");
  if (!trimmedName) throw new ValidationError("Tên phụ tùng là bắt buộc.");
  if (costPrice < 0 || sellPrice < 0) throw new ValidationError("Giá phụ tùng không được là số âm.");

  return prisma.$transaction(async (tx) => {
    const existing = await tx.part.findFirst({
      where: { garageId, sku: trimmedSku },
    });
    if (existing) {
      throw new ConflictError(`Mã SKU "${trimmedSku}" đã tồn tại trong garage.`);
    }

    const part = await tx.part.create({
      data: {
        garageId,
        sku: trimmedSku,
        name: trimmedName,
        unit: unit.trim() || "cái",
        costPrice,
        sellPrice,
        quantityInStock,
        lowStockThreshold,
      },
    });

    if (quantityInStock > 0) {
      await tx.inventoryTransaction.create({
        data: {
          garageId,
          partId: part.id,
          type: InventoryTxType.RECEIPT,
          quantity: quantityInStock,
          unitCost: costPrice,
          reason: "Tồn kho ban đầu",
          createdById: actorUserId,
        },
      });
    }

    await recordAudit(
      {
        action: "part.created" as never,
        entityType: "Part",
        entityId: part.id,
        garageId,
        actorUserId,
        after: { sku: part.sku, name: part.name, quantityInStock },
      },
      tx,
    );

    return part;
  });
}

export async function updatePart(input: {
  garageId: string;
  partId: string;
  name?: string;
  unit?: string;
  costPrice?: number;
  sellPrice?: number;
  lowStockThreshold?: number;
  isActive?: boolean;
  version: number;
  actorUserId: string;
}) {
  const { garageId, partId, name, unit, costPrice, sellPrice, lowStockThreshold, isActive, version, actorUserId } = input;

  return prisma.$transaction(async (tx) => {
    const existing = await tx.part.findFirst({
      where: { id: partId, garageId },
    });
    if (!existing) throw new NotFoundError("Không tìm thấy phụ tùng.");

    const updateData: Record<string, unknown> = {
      version: { increment: 1 },
    };

    if (name !== undefined) {
      const trimmed = name.trim();
      if (!trimmed) throw new ValidationError("Tên phụ tùng không được để trống.");
      updateData.name = trimmed;
    }
    if (unit !== undefined) updateData.unit = unit.trim();
    if (costPrice !== undefined) {
      if (costPrice < 0) throw new ValidationError("Giá vốn không được âm.");
      updateData.costPrice = costPrice;
    }
    if (sellPrice !== undefined) {
      if (sellPrice < 0) throw new ValidationError("Giá bán không được âm.");
      updateData.sellPrice = sellPrice;
    }
    if (lowStockThreshold !== undefined) {
      if (lowStockThreshold < 0) throw new ValidationError("Ngưỡng tồn kho không được âm.");
      updateData.lowStockThreshold = lowStockThreshold;
    }
    if (isActive !== undefined) updateData.isActive = isActive;

    const updated = await tx.part.updateMany({
      where: { id: partId, garageId, version },
      data: updateData as never,
    });

    if (updated.count !== 1) {
      throw new ConflictError("Thông tin phụ tùng đã bị thay đổi. Vui lòng thử lại.");
    }

    await recordAudit(
      {
        action: "part.updated" as never,
        entityType: "Part",
        entityId: partId,
        garageId,
        actorUserId,
        before: { name: existing.name, costPrice: existing.costPrice, sellPrice: existing.sellPrice },
        after: updateData,
      },
      tx,
    );

    return tx.part.findUnique({ where: { id: partId } });
  });
}

export async function issuePartForTask(input: {
  garageId: string;
  partId: string;
  workTaskId: string;
  quantity: number;
  actorUserId: string;
}) {
  const { garageId, partId, workTaskId, quantity, actorUserId } = input;

  if (!Number.isInteger(quantity) || quantity <= 0) {
    throw new ValidationError("Số lượng xuất kho phải là số nguyên dương.");
  }

  return prisma.$transaction(async (tx) => {
    const garage = await tx.garage.findUnique({
      where: { id: garageId },
      select: { settings: true },
    });
    const allowNegativeStock =
      (garage?.settings as Record<string, boolean> | null)?.allowNegativeStock === true;

    const part = await tx.part.findFirst({
      where: { id: partId, garageId },
    });
    if (!part) throw new NotFoundError("Không tìm thấy phụ tùng trong hệ thống.");

    const task = await tx.workTask.findFirst({
      where: { id: workTaskId, garageId },
      include: { repairOrder: { select: { id: true, status: true } } },
    });
    if (!task) throw new NotFoundError("Không tìm thấy hạng mục công việc.");

    try {
      assertSufficientStock(part, quantity, allowNegativeStock);
    } catch (err) {
      await prisma.$transaction(async (subTx) => {
        if (task.status !== "WAITING_PARTS") {
          assertWorkTaskTransition(task.status, "WAITING_PARTS");
          await subTx.workTask.update({
            where: { id: task.id },
            data: { status: "WAITING_PARTS" },
          });
        }
        if (task.repairOrder.status === "IN_PROGRESS") {
          assertRepairOrderTransition(task.repairOrder.status, "WAITING_PARTS");
          await subTx.repairOrder.update({
            where: { id: task.repairOrderId },
            data: { status: "WAITING_PARTS" },
          });
        }
      });
      throw err;
    }

    // Deduct stock atomically: the guard lives in the WHERE clause so two
    // concurrent issues cannot both pass a stale read-compute-write check.
    const deducted = await tx.part.updateMany({
      where: {
        id: part.id,
        ...(allowNegativeStock ? {} : { quantityInStock: { gte: quantity } }),
      },
      data: {
        quantityInStock: { decrement: quantity },
        version: { increment: 1 },
      },
    });
    if (deducted.count !== 1) {
      throw new BusinessRuleError("Không đủ tồn kho để xuất phụ tùng.");
    }
    const freshPart = await tx.part.findUniqueOrThrow({
      where: { id: part.id },
      select: { quantityInStock: true },
    });
    const newStock = freshPart.quantityInStock;

    const txRecord = await tx.inventoryTransaction.create({
      data: {
        garageId,
        partId: part.id,
        workTaskId: task.id,
        repairOrderId: task.repairOrderId,
        type: InventoryTxType.ISSUE,
        quantity: -quantity,
        unitCost: part.costPrice,
        createdById: actorUserId,
      },
    });

    // If task was WAITING_PARTS, set back to IN_PROGRESS
    if (task.status === "WAITING_PARTS") {
      assertWorkTaskTransition(task.status, "IN_PROGRESS");
      await tx.workTask.update({
        where: { id: task.id },
        data: { status: "IN_PROGRESS" },
      });
      if (task.repairOrder.status === "WAITING_PARTS") {
        assertRepairOrderTransition(task.repairOrder.status, "IN_PROGRESS");
        await tx.repairOrder.update({
          where: { id: task.repairOrderId },
          data: { status: "IN_PROGRESS" },
        });
      }
    }

    await recordAudit(
      {
        action: AUDIT_ACTIONS.INVENTORY_ISSUED,
        entityType: "InventoryTransaction",
        entityId: txRecord.id,
        garageId,
        actorUserId,
        after: { partId: part.id, workTaskId: task.id, quantityIssued: quantity, remainingStock: newStock },
      },
      tx,
    );

    return txRecord;
  });
}

export async function receivePartStock(input: {
  garageId: string;
  partId: string;
  quantity: number;
  unitCost?: number;
  reason?: string;
  actorUserId: string;
}) {
  const { garageId, partId, quantity, unitCost, reason, actorUserId } = input;
  if (!Number.isInteger(quantity) || quantity <= 0) {
    throw new ValidationError("Số lượng nhập kho phải là số nguyên dương.");
  }

  return prisma.$transaction(async (tx) => {
    const part = await tx.part.findFirst({
      where: { id: partId, garageId },
    });
    if (!part) throw new NotFoundError("Không tìm thấy phụ tùng.");

    await tx.part.update({
      where: { id: part.id },
      data: {
        quantityInStock: { increment: quantity },
        ...(unitCost !== undefined ? { costPrice: unitCost } : {}),
        version: { increment: 1 },
      },
    });

    const txRecord = await tx.inventoryTransaction.create({
      data: {
        garageId,
        partId: part.id,
        type: InventoryTxType.RECEIPT,
        quantity,
        unitCost: unitCost ?? part.costPrice,
        reason: reason?.trim() || "Nhập kho",
        createdById: actorUserId,
      },
    });

    return txRecord;
  });
}

export async function adjustPartStock(input: {
  garageId: string;
  partId: string;
  newQuantity: number;
  reason: string;
  actorUserId: string;
}) {
  const { garageId, partId, newQuantity, reason, actorUserId } = input;
  if (!Number.isInteger(newQuantity) || newQuantity < 0) {
    throw new ValidationError("Số lượng tồn kho mới phải là số không âm.");
  }
  const trimmedReason = reason.trim();
  if (!trimmedReason) throw new ValidationError("Lý do điều chỉnh tồn kho là bắt buộc.");

  return prisma.$transaction(async (tx) => {
    const part = await tx.part.findFirst({
      where: { id: partId, garageId },
    });
    if (!part) throw new NotFoundError("Không tìm thấy phụ tùng.");

    const diff = newQuantity - part.quantityInStock;
    if (diff === 0) return part;

    await tx.part.update({
      where: { id: part.id },
      data: {
        quantityInStock: newQuantity,
        version: { increment: 1 },
      },
    });

    const txRecord = await tx.inventoryTransaction.create({
      data: {
        garageId,
        partId: part.id,
        type: InventoryTxType.ADJUSTMENT,
        quantity: diff,
        reason: trimmedReason,
        createdById: actorUserId,
      },
    });

    await recordAudit(
      {
        action: AUDIT_ACTIONS.INVENTORY_ADJUSTED,
        entityType: "InventoryTransaction",
        entityId: txRecord.id,
        garageId,
        actorUserId,
        before: { quantityInStock: part.quantityInStock },
        after: { quantityInStock: newQuantity, diff, reason: trimmedReason },
      },
      tx,
    );

    return txRecord;
  });
}

export async function returnPartStock(input: {
  garageId: string;
  partId: string;
  workTaskId?: string;
  quantity: number;
  reason?: string;
  actorUserId: string;
}) {
  const { garageId, partId, workTaskId, quantity, reason, actorUserId } = input;
  if (!Number.isInteger(quantity) || quantity <= 0) {
    throw new ValidationError("Số lượng hoàn kho phải là số nguyên dương.");
  }

  return prisma.$transaction(async (tx) => {
    const part = await tx.part.findFirst({
      where: { id: partId, garageId },
    });
    if (!part) throw new NotFoundError("Không tìm thấy phụ tùng.");

    await tx.part.update({
      where: { id: part.id },
      data: {
        quantityInStock: { increment: quantity },
        version: { increment: 1 },
      },
    });

    const txRecord = await tx.inventoryTransaction.create({
      data: {
        garageId,
        partId: part.id,
        workTaskId: workTaskId ?? null,
        type: InventoryTxType.RETURN,
        quantity,
        reason: reason?.trim() || "Hoàn kho",
        createdById: actorUserId,
      },
    });

    await recordAudit(
      {
        action: AUDIT_ACTIONS.INVENTORY_RETURNED,
        entityType: "InventoryTransaction",
        entityId: txRecord.id,
        garageId,
        actorUserId,
        after: { partId: part.id, workTaskId, quantityReturned: quantity, newStock: part.quantityInStock + quantity },
      },
      tx,
    );

    return txRecord;
  });
}

const PART_LIST_LIMIT = 200;

/**
 * Exact SKU lookup for barcode-scanner flows. Scanners act as keyboards, so
 * the scanned text lands verbatim (often lowercase / padded) — normalize the
 * same way `createPart` does and match exactly, garage-scoped.
 */
export async function lookupPartBySku(garageId: string, sku: string) {
  const normalized = sku.trim().toUpperCase();
  if (!normalized) throw new ValidationError("Mã SKU là bắt buộc.");
  const part = await prisma.part.findFirst({
    where: { garageId, sku: normalized, isActive: true },
    select: {
      id: true,
      sku: true,
      name: true,
      unit: true,
      quantityInStock: true,
    },
  });
  if (!part) {
    throw new NotFoundError(`Không tìm thấy phụ tùng với mã SKU "${normalized}".`);
  }
  return part;
}

export async function getParts(garageId: string, search?: string) {
  return prisma.part.findMany({
    where: {
      garageId,
      isActive: true,
      ...(search
        ? {
            OR: [
              { name: { contains: search, mode: "insensitive" } },
              { sku: { contains: search, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    orderBy: { name: "asc" },
    take: PART_LIST_LIMIT,
  });
}

export async function getLowStockParts(garageId: string) {
  // Column-to-column comparison is not expressible in the Prisma query builder,
  // so pull the lowest-stock rows and filter in memory. Capped to bound the
  // query size.
  const parts = await prisma.part.findMany({
    where: { garageId, isActive: true },
    orderBy: { quantityInStock: "asc" },
    take: PART_LIST_LIMIT,
  });
  return parts.filter((p) => p.quantityInStock <= p.lowStockThreshold);
}
