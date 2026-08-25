import { InvoiceStatus, PaymentMethod, PaymentType } from "@/generated/prisma/enums";
import { calculateInvoiceSummary } from "@/features/invoices/domain";
import { AUDIT_ACTIONS, recordAudit } from "@/lib/audit";
import { BusinessRuleError, NotFoundError, ValidationError } from "@/lib/errors";
import { addMoney, subtractMoney } from "@/lib/money";
import { PrismaTx, prisma } from "@/lib/prisma";
import { assertInvoiceTransition, deriveInvoiceStatus } from "@/lib/transitions";

const INVOICE_SEQUENCE_DOC_TYPE = "INVOICE";

async function nextInvoiceCode(tx: PrismaTx, garageId: string, year: number): Promise<string> {
  const row = await tx.repairOrderSequence.upsert({
    where: {
      garageId_year_docType: { garageId, year, docType: INVOICE_SEQUENCE_DOC_TYPE },
    },
    create: { garageId, year, docType: INVOICE_SEQUENCE_DOC_TYPE, nextValue: 2 },
    update: { nextValue: { increment: 1 } },
    select: { nextValue: true },
  });
  return `INV-${year}-${String(row.nextValue - 1).padStart(4, "0")}`;
}

export async function createInvoiceFromRepairOrder(input: {
  garageId: string;
  repairOrderId: string;
  actorUserId: string;
  discountAmount?: number;
  taxRatePercent?: number;
}) {
  const { garageId, repairOrderId, actorUserId, discountAmount = 0, taxRatePercent = 0 } = input;

  return prisma.$transaction(async (tx) => {
    const order = await tx.repairOrder.findFirst({
      where: { id: repairOrderId, garageId },
      include: {
        customer: true,
        quotations: {
          where: { status: { in: ["APPROVED", "PARTIALLY_APPROVED", "SENT"] } },
          include: { items: { where: { status: "APPROVED" } } },
          orderBy: { versionNo: "desc" },
        },
      },
    });

    if (!order) throw new NotFoundError("Không tìm thấy lệnh sửa chữa.");

    // Existing active invoice check
    const existing = await tx.invoice.findFirst({
      where: { repairOrderId, garageId, status: { notIn: ["CANCELLED"] } },
    });
    if (existing) {
      throw new BusinessRuleError(`Lệnh sửa chữa đã có hóa đơn mã ${existing.code}.`);
    }

    // Collect approved items from latest quotation versions
    const lineItems: Array<{
      description: string;
      quantity: number;
      unitPrice: number;
      discountAmount: number;
      totalAmount: number;
      sourceQuotationItemId: string;
    }> = [];

    const processedQuotationIds = new Set<string>();
    for (const q of order.quotations) {
      if (processedQuotationIds.has(q.id)) continue;
      processedQuotationIds.add(q.id);

      for (const item of q.items) {
        const itemTotal = item.quantity * item.unitPrice - item.discountAmount;
        lineItems.push({
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          discountAmount: item.discountAmount,
          totalAmount: itemTotal,
          sourceQuotationItemId: item.id,
        });
      }
    }

    if (lineItems.length === 0) {
      throw new BusinessRuleError("Không có hạng mục báo giá đã duyệt nào để lập hóa đơn.");
    }

    const summary = calculateInvoiceSummary(lineItems, discountAmount, taxRatePercent);
    const year = new Date().getFullYear();
    const code = await nextInvoiceCode(tx, garageId, year);

    const invoice = await tx.invoice.create({
      data: {
        garageId,
        code,
        repairOrderId,
        customerId: order.customerId,
        status: InvoiceStatus.DRAFT,
        subtotal: summary.subtotal,
        discountAmount: summary.headerDiscount,
        taxAmount: summary.taxAmount,
        totalAmount: summary.totalAmount,
        paidAmount: 0,
        createdById: actorUserId,
        items: {
          create: lineItems.map((item, index) => ({
            description: item.description,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            discountAmount: item.discountAmount,
            totalAmount: item.totalAmount,
            sourceQuotationItemId: item.sourceQuotationItemId,
            sortOrder: index,
          })),
        },
      },
    });

    await recordAudit(
      {
        action: "invoice.created" as never,
        entityType: "Invoice",
        entityId: invoice.id,
        garageId,
        actorUserId,
        after: { code: invoice.code, totalAmount: invoice.totalAmount },
      },
      tx,
    );

    return invoice;
  });
}

export async function issueInvoice(input: {
  garageId: string;
  invoiceId: string;
  actorUserId: string;
  dueAt?: Date | null;
}) {
  const { garageId, invoiceId, actorUserId, dueAt } = input;

  return prisma.$transaction(async (tx) => {
    const invoice = await tx.invoice.findFirst({
      where: { id: invoiceId, garageId },
    });
    if (!invoice) throw new NotFoundError("Không tìm thấy hóa đơn.");

    assertInvoiceTransition(invoice.status, InvoiceStatus.ISSUED);
    const now = new Date();

    const updated = await tx.invoice.update({
      where: { id: invoice.id },
      data: {
        status: InvoiceStatus.ISSUED,
        issuedAt: now,
        dueAt: dueAt ?? null,
      },
    });

    await recordAudit(
      {
        action: AUDIT_ACTIONS.INVOICE_ISSUED,
        entityType: "Invoice",
        entityId: invoice.id,
        garageId,
        actorUserId,
        before: { status: invoice.status },
        after: { status: InvoiceStatus.ISSUED, issuedAt: now },
      },
      tx,
    );

    return updated;
  });
}

export async function cancelInvoice(input: {
  garageId: string;
  invoiceId: string;
  cancelReason: string;
  actorUserId: string;
}) {
  const { garageId, invoiceId, cancelReason, actorUserId } = input;
  if (!cancelReason.trim()) throw new ValidationError("Lý do hủy hóa đơn là bắt buộc.");

  return prisma.$transaction(async (tx) => {
    const invoice = await tx.invoice.findFirst({
      where: { id: invoiceId, garageId },
    });
    if (!invoice) throw new NotFoundError("Không tìm thấy hóa đơn.");

    assertInvoiceTransition(invoice.status, InvoiceStatus.CANCELLED);

    const updated = await tx.invoice.update({
      where: { id: invoice.id },
      data: {
        status: InvoiceStatus.CANCELLED,
        cancelledAt: new Date(),
      },
    });

    await recordAudit(
      {
        action: AUDIT_ACTIONS.INVOICE_CANCELLED,
        entityType: "Invoice",
        entityId: invoice.id,
        garageId,
        actorUserId,
        before: { status: invoice.status },
        after: { status: InvoiceStatus.CANCELLED, cancelReason },
      },
      tx,
    );

    return updated;
  });
}

export async function recordPayment(input: {
  garageId: string;
  invoiceId: string;
  type?: PaymentType;
  method?: PaymentMethod;
  amount: number;
  reference?: string | null;
  note?: string | null;
  actorUserId: string;
}) {
  const {
    garageId,
    invoiceId,
    type = PaymentType.PAYMENT,
    method = PaymentMethod.CASH,
    amount,
    reference,
    note,
    actorUserId,
  } = input;

  if (!Number.isInteger(amount) || amount <= 0) {
    throw new ValidationError("Số tiền thanh toán phải là số nguyên dương (VND).");
  }

  return prisma.$transaction(async (tx) => {
    const invoice = await tx.invoice.findFirst({
      where: { id: invoiceId, garageId },
    });
    if (!invoice) throw new NotFoundError("Không tìm thấy hóa đơn.");

    if (invoice.status === InvoiceStatus.CANCELLED || invoice.status === InvoiceStatus.REFUNDED) {
      throw new BusinessRuleError("Không thể ghi nhận thanh toán cho hóa đơn đã hủy hoặc đã hoàn tiền.");
    }

    // A draft invoice is not yet a financial document; it must be issued before
    // any payment/deposit can be recorded against it, so the ledger stays auditable.
    if (invoice.status === InvoiceStatus.DRAFT) {
      throw new BusinessRuleError("Cần phát hành hóa đơn trước khi ghi nhận thanh toán.");
    }

    // Serialize concurrent payments on this invoice row so read-compute-write
    // below cannot lose updates (two cashiers recording payment at once).
    await tx.$queryRaw`SELECT id FROM "invoices" WHERE id = ${invoice.id} FOR UPDATE`;

    let newPaidAmount = invoice.paidAmount;
    if (type === PaymentType.PAYMENT || type === PaymentType.DEPOSIT) {
      const remaining = subtractMoney(invoice.totalAmount, invoice.paidAmount);
      if (amount > remaining) {
        throw new BusinessRuleError(
          `Số tiền vượt quá số dư còn lại của hóa đơn (còn ${remaining.toLocaleString("vi-VN")} ₫).`,
        );
      }
      newPaidAmount = addMoney(invoice.paidAmount, amount);
    } else if (type === PaymentType.REFUND) {
      if (amount > invoice.paidAmount) {
        throw new BusinessRuleError("Số tiền hoàn trả không được vượt quá số tiền đã thanh toán.");
      }
      newPaidAmount = subtractMoney(invoice.paidAmount, amount);
    }

    const newStatus = deriveInvoiceStatus({
      totalAmount: invoice.totalAmount,
      paidAmount: newPaidAmount,
      current: invoice.status,
    });

    const payment = await tx.payment.create({
      data: {
        garageId,
        invoiceId: invoice.id,
        type,
        method,
        amount,
        reference: reference?.trim() || null,
        note: note?.trim() || null,
        receivedById: actorUserId,
      },
    });

    await tx.invoice.update({
      where: { id: invoice.id },
      data: {
        paidAmount: newPaidAmount,
        status: newStatus,
      },
    });

    await recordAudit(
      {
        action: type === PaymentType.REFUND ? AUDIT_ACTIONS.PAYMENT_REFUNDED : AUDIT_ACTIONS.PAYMENT_RECORDED,
        entityType: "Payment",
        entityId: payment.id,
        garageId,
        actorUserId,
        after: {
          invoiceId: invoice.id,
          amount,
          type,
          method,
          newPaidAmount,
          newStatus,
        },
      },
      tx,
    );

    return payment;
  });
}

export async function getInvoices(
  garageId: string,
  filters?: { customerId?: string; status?: InvoiceStatus; repairOrderId?: string },
) {
  return prisma.invoice.findMany({
    where: {
      garageId,
      ...(filters?.customerId ? { customerId: filters.customerId } : {}),
      ...(filters?.status ? { status: filters.status } : {}),
      ...(filters?.repairOrderId ? { repairOrderId: filters.repairOrderId } : {}),
    },
    include: {
      customer: { select: { id: true, name: true, phone: true, email: true } },
      repairOrder: { select: { id: true, code: true, vehicle: { select: { licensePlate: true, brand: true, model: true } } } },
      payments: { orderBy: { paidAt: "desc" } },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getInvoiceById(invoiceId: string, garageId: string) {
  const invoice = await prisma.invoice.findFirst({
    where: { id: invoiceId, garageId },
    include: {
      customer: true,
      repairOrder: {
        include: {
          vehicle: true,
          advisor: { select: { name: true, email: true } },
        },
      },
      items: { orderBy: { sortOrder: "asc" } },
      payments: { orderBy: { paidAt: "desc" } },
      garage: true,
    },
  });

  if (!invoice) throw new NotFoundError("Không tìm thấy hóa đơn.");
  return invoice;
}
