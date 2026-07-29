import type { QuotationItemType } from "@/generated/prisma/enums";
import { AUDIT_ACTIONS, recordAudit } from "@/lib/audit";
import { BusinessRuleError, NotFoundError, ValidationError } from "@/lib/errors";
import { addMoney, calculateLineTotal } from "@/lib/money";
import { prisma } from "@/lib/prisma";
import {
  assertQuotationTransition,
  assertRepairOrderTransition,
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
