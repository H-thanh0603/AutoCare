import { WorkTaskStatus } from "@/generated/prisma/enums";
import { AUDIT_ACTIONS, recordAudit } from "@/lib/audit";
import { NotFoundError, ValidationError } from "@/lib/errors";
import { PrismaClientOrTx, prisma } from "@/lib/prisma";
import { assertRepairOrderTransition, assertWorkTaskTransition } from "@/lib/transitions";

export async function syncWorkTasksFromQuotation(
  quotationId: string,
  tx: PrismaClientOrTx = prisma,
): Promise<number> {
  const quotation = await tx.quotation.findUnique({
    where: { id: quotationId },
    include: {
      items: { where: { status: "APPROVED" } },
      repairOrder: { select: { id: true, status: true, garageId: true } },
    },
  });

  if (!quotation) throw new NotFoundError("Không tìm thấy báo giá.");

  const approvedItems = quotation.items;
  if (approvedItems.length === 0) return 0;

  const existingTasks = await tx.workTask.findMany({
    where: { quotationItemId: { in: approvedItems.map((i) => i.id) } },
    select: { quotationItemId: true },
  });
  const existingItemIds = new Set(existingTasks.map((t) => t.quotationItemId));

  const itemsToCreate = approvedItems.filter((i) => !existingItemIds.has(i.id));
  if (itemsToCreate.length === 0) return 0;

  for (const item of itemsToCreate) {
    const task = await tx.workTask.create({
      data: {
        garageId: quotation.garageId,
        repairOrderId: quotation.repairOrderId,
        quotationItemId: item.id,
        title: item.description,
        description: item.customerNote ?? null,
        status: WorkTaskStatus.NOT_STARTED,
      },
    });

    await recordAudit(
      {
        action: AUDIT_ACTIONS.WORK_TASK_CREATED,
        entityType: "WorkTask",
        entityId: task.id,
        garageId: quotation.garageId,
        after: { title: task.title, repairOrderId: task.repairOrderId },
      },
      tx,
    );
  }

  // Update RepairOrder status if currently WAITING_CUSTOMER_APPROVAL
  if (quotation.repairOrder.status === "WAITING_CUSTOMER_APPROVAL") {
    assertRepairOrderTransition(quotation.repairOrder.status, "IN_PROGRESS");
    await tx.repairOrder.update({
      where: { id: quotation.repairOrder.id },
      data: { status: "IN_PROGRESS" },
    });
  }

  return itemsToCreate.length;
}

export async function assignTechnician(input: {
  garageId: string;
  workTaskId: string;
  technicianId: string | null;
  actorUserId: string;
}): Promise<void> {
  const { garageId, workTaskId, technicianId, actorUserId } = input;

  await prisma.$transaction(async (tx) => {
    const task = await tx.workTask.findFirst({
      where: { id: workTaskId, garageId },
    });
    if (!task) throw new NotFoundError("Không tìm thấy hạng mục công việc.");

    if (technicianId) {
      const tech = await tx.user.findFirst({
        where: {
          id: technicianId,
          memberships: { some: { garageId, isActive: true } },
        },
      });
      if (!tech) throw new NotFoundError("Kỹ thuật viên không hợp lệ hoặc không thuộc garage.");
    }

    await tx.workTask.update({
      where: { id: workTaskId },
      data: { assignedToId: technicianId },
    });

    await recordAudit(
      {
        action: AUDIT_ACTIONS.WORK_TASK_ASSIGNED,
        entityType: "WorkTask",
        entityId: workTaskId,
        garageId,
        actorUserId,
        before: { assignedToId: task.assignedToId },
        after: { assignedToId: technicianId },
      },
      tx,
    );
  });
}

export async function updateWorkTaskStatus(input: {
  garageId: string;
  workTaskId: string;
  status: WorkTaskStatus;
  cancelReason?: string | null;
  actorUserId: string;
}): Promise<void> {
  const { garageId, workTaskId, status, cancelReason, actorUserId } = input;

  await prisma.$transaction(async (tx) => {
    const task = await tx.workTask.findFirst({
      where: { id: workTaskId, garageId },
      include: { repairOrder: { select: { id: true, status: true } } },
    });
    if (!task) throw new NotFoundError("Không tìm thấy hạng mục công việc.");

    assertWorkTaskTransition(task.status, status);

    const now = new Date();
    const updateData: Record<string, unknown> = {
      status,
      updatedAt: now,
    };

    if (status === "IN_PROGRESS" && !task.startedAt) {
      updateData.startedAt = now;
    }
    if (status === "COMPLETED") {
      updateData.completedAt = now;
    }
    if (status === "CANCELLED") {
      updateData.cancelledAt = now;
      updateData.cancelReason = cancelReason?.trim() || null;
    }

    await tx.workTask.update({
      where: { id: workTaskId },
      data: updateData as never,
    });

    await recordAudit(
      {
        action: "work_task.status_changed" as never,
        entityType: "WorkTask",
        entityId: workTaskId,
        garageId,
        actorUserId,
        before: { status: task.status },
        after: { status, cancelReason },
      },
      tx,
    );

    // If all tasks for the repair order are completed, transition RO to QUALITY_CHECK
    if (status === "COMPLETED") {
      const remainingTasks = await tx.workTask.findMany({
        where: { repairOrderId: task.repairOrderId },
        select: { id: true, status: true },
      });

      const allCompleted = remainingTasks.every((t) => t.status === "COMPLETED" || t.status === "CANCELLED");
      if (allCompleted && task.repairOrder.status === "IN_PROGRESS") {
        assertRepairOrderTransition(task.repairOrder.status, "QUALITY_CHECK");
        await tx.repairOrder.update({
          where: { id: task.repairOrderId },
          data: { status: "QUALITY_CHECK" },
        });
      }
    }
  });
}

export async function addWorkLog(input: {
  garageId: string;
  workTaskId: string;
  userId: string;
  note: string;
  minutesSpent?: number | null;
}) {
  const { garageId, workTaskId, userId, note, minutesSpent } = input;
  const trimmedNote = note.trim();
  if (!trimmedNote) {
    throw new ValidationError("Ghi chú công việc không được để trống.");
  }
  if (minutesSpent !== undefined && minutesSpent !== null && minutesSpent < 0) {
    throw new ValidationError("Thời gian thực hiện không được là số âm.");
  }

  const task = await prisma.workTask.findFirst({
    where: { id: workTaskId, garageId },
  });
  if (!task) throw new NotFoundError("Không tìm thấy hạng mục công việc.");

  return prisma.workLog.create({
    data: {
      workTaskId,
      userId,
      note: trimmedNote,
      minutesSpent: minutesSpent ?? null,
    },
    include: {
      user: { select: { id: true, name: true } },
    },
  });
}

export async function getWorkTasks(
  garageId: string,
  filters?: { repairOrderId?: string; assignedToId?: string; status?: WorkTaskStatus },
) {
  return prisma.workTask.findMany({
    where: {
      garageId,
      ...(filters?.repairOrderId ? { repairOrderId: filters.repairOrderId } : {}),
      ...(filters?.assignedToId ? { assignedToId: filters.assignedToId } : {}),
      ...(filters?.status ? { status: filters.status } : {}),
    },
    include: {
      assignedTo: { select: { id: true, name: true, email: true } },
      quotationItem: true,
      repairOrder: {
        select: {
          id: true,
          code: true,
          vehicle: { select: { id: true, licensePlate: true, brand: true, model: true } },
          customer: { select: { id: true, name: true, phone: true } },
        },
      },
      inventoryTransactions: {
        include: { part: { select: { id: true, name: true, sku: true, unit: true } } },
      },
      workLogs: {
        include: { user: { select: { id: true, name: true } } },
        orderBy: { createdAt: "desc" },
      },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getWorkTaskById(workTaskId: string, garageId: string) {
  const task = await prisma.workTask.findFirst({
    where: { id: workTaskId, garageId },
    include: {
      assignedTo: { select: { id: true, name: true, email: true } },
      quotationItem: true,
      repairOrder: {
        select: {
          id: true,
          code: true,
          vehicle: { select: { id: true, licensePlate: true, brand: true, model: true } },
          customer: { select: { id: true, name: true, phone: true } },
        },
      },
      inventoryTransactions: {
        include: { part: { select: { id: true, name: true, sku: true, unit: true } } },
      },
      workLogs: {
        include: { user: { select: { id: true, name: true } } },
        orderBy: { createdAt: "desc" },
      },
    },
  });
  if (!task) throw new NotFoundError("Không tìm thấy hạng mục công việc.");
  return task;
}
