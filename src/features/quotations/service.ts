import type { QuotationItemStatus, QuotationItemType } from "@/generated/prisma/enums";
import { syncWorkTasksFromQuotation } from "@/features/work-tasks/service";
import { AUDIT_ACTIONS, recordAudit } from "@/lib/audit";
import { BusinessRuleError, ConflictError, NotFoundError, ValidationError } from "@/lib/errors";
import { addMoney, calculateLineTotal } from "@/lib/money";
import { prisma } from "@/lib/prisma";
import {
  assertQuotationTransition,
  assertQuotationItemTransition,
  assertRepairOrderTransition,
  assertWorkTaskTransition,
  deriveQuotationStatus,
  isQuotationEditable,
} from "@/lib/transitions";

type QuotationDraftInput = {
  id?: string;
  repairOrderId: string;
  note: string | null;
  validUntil: Date | null;
  items: Array<{
    type: QuotationItemType;
    description: string;
    quantity: number;
    unitPrice: number;
    discountAmount: number;
  }>;
};

function quotationItems(input: QuotationDraftInput) {
  if (input.items.length === 0) {
    throw new ValidationError("Báo giá phải có ít nhất một hạng mục.");
  }

  return input.items.map((item, sortOrder) => {
    if (!item.description.trim()) {
      throw new ValidationError("Mô tả hạng mục là bắt buộc.");
    }
    if (!Number.isInteger(item.quantity) || item.quantity <= 0) {
      throw new ValidationError("Số lượng phải là số nguyên dương.");
    }
    return {
      type: item.type,
      description: item.description.trim(),
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      discountAmount: item.discountAmount,
      totalAmount: calculateLineTotal(item),
      sortOrder,
    };
  });
}

export async function saveQuotationDraft(
  garageId: string,
  actorUserId: string,
  input: QuotationDraftInput,
) {
  const items = quotationItems(input);
  if (input.validUntil && input.validUntil <= new Date()) {
    throw new ValidationError("Hạn báo giá phải ở trong tương lai.");
  }

  return prisma.$transaction(async (tx) => {
    const order = await tx.repairOrder.findFirst({
      where: { id: input.repairOrderId, garageId },
      select: { id: true, status: true },
    });
    if (!order) throw new NotFoundError("Không tìm thấy lệnh sửa chữa.");

    const totalAmount = addMoney(...items.map((item) => item.totalAmount));
    if (input.id) {
      const quotation = await tx.quotation.findFirst({
        where: { id: input.id, garageId, repairOrderId: order.id },
        select: { id: true, status: true },
      });
      if (!quotation) throw new NotFoundError("Không tìm thấy báo giá.");
      if (!isQuotationEditable(quotation.status)) {
        throw new BusinessRuleError("Báo giá đã gửi phải tạo phiên bản mới.");
      }

      await tx.quotationItem.deleteMany({ where: { quotationId: quotation.id } });
      return tx.quotation.update({
        where: { id: quotation.id },
        data: {
          note: input.note?.trim() || null,
          validUntil: input.validUntil,
          totalAmount,
          items: { create: items },
        },
      });
    }

    if (order.status !== "INSPECTING") {
      throw new BusinessRuleError("Chỉ có thể tạo báo giá khi xe đang được kiểm tra.");
    }
    const latest = await tx.quotation.findFirst({
      where: { repairOrderId: order.id },
      select: { versionNo: true },
      orderBy: { versionNo: "desc" },
    });
    const quotation = await tx.quotation.create({
      data: {
        garageId,
        repairOrderId: order.id,
        versionNo: (latest?.versionNo ?? 0) + 1,
        note: input.note?.trim() || null,
        validUntil: input.validUntil,
        totalAmount,
        createdById: actorUserId,
        items: { create: items },
      },
    });
    await recordAudit(
      {
        action: AUDIT_ACTIONS.QUOTATION_CREATED,
        entityType: "Quotation",
        entityId: quotation.id,
        garageId,
        actorUserId,
        after: { versionNo: quotation.versionNo, totalAmount },
      },
      tx,
    );
    return quotation;
  });
}

export async function sendQuotation(
  garageId: string,
  actorUserId: string,
  quotationId: string,
): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const quotation = await tx.quotation.findFirst({
      where: { id: quotationId, garageId },
      include: {
        items: { select: { id: true } },
        repairOrder: { select: { id: true, status: true, customer: { select: { userId: true } } } },
      },
    });
    if (!quotation) throw new NotFoundError("Không tìm thấy báo giá.");
    if (quotation.items.length === 0) {
      throw new BusinessRuleError("Báo giá phải có ít nhất một hạng mục.");
    }

    assertQuotationTransition(quotation.status, "SENT");
    assertRepairOrderTransition(quotation.repairOrder.status, "WAITING_CUSTOMER_APPROVAL");
    const sentAt = new Date();
    await tx.quotation.update({
      where: { id: quotation.id },
      data: { status: "SENT", sentAt },
    });
    await tx.repairOrder.update({
      where: { id: quotation.repairOrder.id },
      data: { status: "WAITING_CUSTOMER_APPROVAL" },
    });
    if (quotation.repairOrder.customer.userId) {
      await tx.notification.create({
        data: {
          userId: quotation.repairOrder.customer.userId,
          garageId,
          type: "QUOTATION",
          title: "Bạn có báo giá mới",
          body: `Báo giá phiên bản ${quotation.versionNo} đang chờ duyệt.`,
          data: { href: `/tai-khoan/bao-gia/${quotation.id}` },
        },
      });
    }
    await recordAudit(
      {
        action: AUDIT_ACTIONS.QUOTATION_SENT,
        entityType: "Quotation",
        entityId: quotation.id,
        garageId,
        actorUserId,
        before: { status: quotation.status },
        after: { status: "SENT", sentAt },
      },
      tx,
    );
  });
}

export async function createQuotationRevision(
  garageId: string,
  actorUserId: string,
  input: Omit<QuotationDraftInput, "id" | "repairOrderId"> & {
    quotationId: string;
    version: number;
  },
) {
  const items = quotationItems({ ...input, repairOrderId: "" });
  if (input.validUntil && input.validUntil <= new Date()) {
    throw new ValidationError("Hạn báo giá phải ở trong tương lai.");
  }

  return prisma.$transaction(async (tx) => {
    const original = await tx.quotation.findFirst({
      where: { id: input.quotationId, garageId },
      select: { id: true, repairOrderId: true, versionNo: true, version: true, status: true },
    });
    if (!original) throw new NotFoundError("Không tìm thấy báo giá.");
    assertQuotationTransition(original.status, "SUPERSEDED");

    const revision = await tx.quotation.create({
      data: {
        garageId,
        repairOrderId: original.repairOrderId,
        versionNo: original.versionNo + 1,
        note: input.note?.trim() || null,
        validUntil: input.validUntil,
        totalAmount: addMoney(...items.map((item) => item.totalAmount)),
        createdById: actorUserId,
        items: { create: items },
      },
    });
    const updated = await tx.quotation.updateMany({
      where: { id: original.id, version: input.version, status: original.status },
      data: {
        status: "SUPERSEDED",
        supersededById: revision.id,
        version: { increment: 1 },
      },
    });
    if (updated.count !== 1) {
      throw new ConflictError("Báo giá vừa được thay đổi. Hãy tải lại trang.");
    }
    await recordAudit(
      {
        action: AUDIT_ACTIONS.QUOTATION_REVISED,
        entityType: "Quotation",
        entityId: original.id,
        garageId,
        actorUserId,
        before: { status: original.status, versionNo: original.versionNo },
        after: { status: "SUPERSEDED", supersededById: revision.id },
      },
      tx,
    );
    return revision;
  });
}

export async function decideQuotationItem(
  userId: string,
  quotationItemId: string,
  input: { status: QuotationItemStatus; customerNote: string | null },
): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const item = await tx.quotationItem.findFirst({
      where: {
        id: quotationItemId,
        quotation: {
          status: { in: ["SENT", "PARTIALLY_APPROVED"] },
          repairOrder: {
            customer: { userId },
            vehicle: {
              ownerships: {
                some: { isCurrent: true, endedAt: null, customer: { userId } },
              },
            },
          },
        },
      },
      include: {
        quotation: { include: { items: { select: { id: true, status: true } } } },
      },
    });
    if (!item) throw new NotFoundError("Không tìm thấy hạng mục báo giá.");

    assertQuotationItemTransition(item.status, input.status);
    const decidedAt = new Date();
    await tx.quotationItem.update({
      where: { id: item.id },
      data: {
        status: input.status,
        customerNote: input.customerNote?.trim() || null,
        decidedAt,
      },
    });

    const statuses = item.quotation.items.map((quotationItem) =>
      quotationItem.id === item.id ? input.status : quotationItem.status,
    );
    const quotationStatus = deriveQuotationStatus(statuses, item.quotation.status);
    if (quotationStatus !== item.quotation.status) {
      assertQuotationTransition(item.quotation.status, quotationStatus);
      await tx.quotation.update({
        where: { id: item.quotation.id },
        data: {
          status: quotationStatus,
          ...(quotationStatus === "APPROVED" || quotationStatus === "REJECTED"
            ? { decidedAt }
            : {}),
        },
      });
    }
    await recordAudit(
      {
        action: AUDIT_ACTIONS.QUOTATION_ITEM_DECIDED,
        entityType: "QuotationItem",
        entityId: item.id,
        garageId: item.quotation.garageId,
        actorUserId: userId,
        before: { status: item.status },
        after: { status: input.status, quotationStatus },
      },
      tx,
    );

    if (input.status === "APPROVED") {
      await syncWorkTasksFromQuotation(item.quotation.garageId, item.quotationId, tx);
    }
  });
}

export async function decideQuotationItemAsManager(
  garageId: string,
  managerUserId: string,
  quotationItemId: string,
  input: { status: QuotationItemStatus; customerNote: string | null; managerReason: string },
): Promise<void> {
  const managerReason = input.managerReason.trim();
  if (managerReason.length < 10) {
    throw new ValidationError("Lý do của quản lý phải có ít nhất 10 ký tự.");
  }

  await prisma.$transaction(async (tx) => {
    const item = await tx.quotationItem.findFirst({
      where: {
        id: quotationItemId,
        quotation: { garageId, status: { in: ["SENT", "PARTIALLY_APPROVED"] } },
      },
      include: {
        quotation: { include: { items: { select: { id: true, status: true } } } },
      },
    });
    if (!item) throw new NotFoundError("Quotation item not found.");

    assertQuotationItemTransition(item.status, input.status);
    const decidedAt = new Date();
    await tx.quotationItem.update({
      where: { id: item.id },
      data: {
        status: input.status,
        customerNote: input.customerNote?.trim() || null,
        decidedAt,
      },
    });

    const statuses = item.quotation.items.map((quotationItem) =>
      quotationItem.id === item.id ? input.status : quotationItem.status,
    );
    const quotationStatus = deriveQuotationStatus(statuses, item.quotation.status);
    if (quotationStatus !== item.quotation.status) {
      assertQuotationTransition(item.quotation.status, quotationStatus);
      await tx.quotation.update({
        where: { id: item.quotation.id },
        data: {
          status: quotationStatus,
          ...(quotationStatus === "APPROVED" || quotationStatus === "REJECTED"
            ? { decidedAt }
            : {}),
        },
      });
    }
    await recordAudit(
      {
        action: AUDIT_ACTIONS.QUOTATION_ITEM_DECIDED,
        entityType: "QuotationItem",
        entityId: item.id,
        garageId,
        actorUserId: managerUserId,
        before: { status: item.status },
        after: { status: input.status, quotationStatus },
        metadata: { managerReason },
      },
      tx,
    );

    if (input.status === "APPROVED") {
      await syncWorkTasksFromQuotation(garageId, item.quotationId, tx);
    }
  });
}

export async function createSupplementaryQuotation(
  garageId: string,
  actorUserId: string,
  input: QuotationDraftInput & { parentQuotationId: string; workTaskId?: string },
) {
  const items = quotationItems(input);
  return prisma.$transaction(async (tx) => {
    const parent = await tx.quotation.findFirst({
      where: { id: input.parentQuotationId, garageId },
      select: { id: true, repairOrderId: true, versionNo: true },
    });
    if (!parent) throw new NotFoundError("Không tìm thấy báo giá gốc.");

    if (input.workTaskId) {
      // Scope the task to the caller's garage and respect the work-task state
      // machine — a bare unscoped update would allow cross-tenant writes and
      // illegal transitions (e.g. dragging COMPLETED back to WAITING_APPROVAL).
      const task = await tx.workTask.findFirst({
        where: { id: input.workTaskId, garageId },
        select: { id: true, status: true },
      });
      if (!task) throw new NotFoundError("Không tìm thấy hạng mục công việc.");
      assertWorkTaskTransition(task.status, "WAITING_APPROVAL");
      await tx.workTask.update({
        where: { id: task.id },
        data: { status: "WAITING_APPROVAL" },
      });
    }

    const latest = await tx.quotation.findFirst({
      where: { repairOrderId: parent.repairOrderId },
      select: { versionNo: true },
      orderBy: { versionNo: "desc" },
    });

    const quotation = await tx.quotation.create({
      data: {
        garageId,
        repairOrderId: parent.repairOrderId,
        parentQuotationId: parent.id,
        isSupplementary: true,
        versionNo: (latest?.versionNo ?? parent.versionNo) + 1,
        note: input.note?.trim() || null,
        validUntil: input.validUntil,
        totalAmount: addMoney(...items.map((i) => i.totalAmount)),
        createdById: actorUserId,
        items: { create: items },
      },
    });

    await recordAudit(
      {
        action: AUDIT_ACTIONS.QUOTATION_CREATED,
        entityType: "Quotation",
        entityId: quotation.id,
        garageId,
        actorUserId,
        after: { isSupplementary: true, parentQuotationId: parent.id, totalAmount: quotation.totalAmount },
      },
      tx,
    );

    return quotation;
  });
}
