/**
 * Domain state machines.
 *
 * Every status field in the system is changed through one of the tables below.
 * Services call `assert*Transition` before writing, so an invalid status change
 * fails with a business-rule error instead of silently corrupting a workflow.
 */

import {
  AppointmentStatus,
  InvoiceStatus,
  QuotationItemStatus,
  QuotationStatus,
  RepairOrderStatus,
  WorkTaskStatus,
} from "@/generated/prisma/enums";

import { assertTransition, type TransitionMap } from "./state-machine";

/* ------------------------------------------------------------------ */
/* Appointment                                                         */
/* ------------------------------------------------------------------ */

export const APPOINTMENT_TRANSITIONS = {
  PENDING: ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["ARRIVED", "CANCELLED", "NO_SHOW"],
  ARRIVED: ["COMPLETED"],
  COMPLETED: [],
  CANCELLED: [],
  NO_SHOW: [],
} satisfies TransitionMap<AppointmentStatus>;

export const APPOINTMENT_LABELS: Record<AppointmentStatus, string> = {
  PENDING: "Chờ xác nhận",
  CONFIRMED: "Đã xác nhận",
  ARRIVED: "Khách đã đến",
  COMPLETED: "Hoàn tất",
  CANCELLED: "Đã hủy",
  NO_SHOW: "Khách không đến",
};

export function assertAppointmentTransition(
  from: AppointmentStatus,
  to: AppointmentStatus,
): void {
  assertTransition(
    APPOINTMENT_TRANSITIONS,
    from,
    to,
    APPOINTMENT_LABELS,
    "lịch hẹn",
  );
}

/* ------------------------------------------------------------------ */
/* RepairOrder                                                         */
/* ------------------------------------------------------------------ */

/**
 * IN_PROGRESS can fall back to WAITING_CUSTOMER_APPROVAL for a supplementary
 * quotation, and to WAITING_PARTS when stock runs out mid-job.
 */
export const REPAIR_ORDER_TRANSITIONS: TransitionMap<RepairOrderStatus> = {
  RECEIVED: ["INSPECTING", "CANCELLED"],
  INSPECTING: ["WAITING_CUSTOMER_APPROVAL", "CANCELLED"],
  WAITING_CUSTOMER_APPROVAL: [
    "IN_PROGRESS",
    "WAITING_PARTS",
    "INSPECTING",
    "CANCELLED",
  ],
  WAITING_PARTS: ["IN_PROGRESS", "WAITING_CUSTOMER_APPROVAL", "CANCELLED"],
  IN_PROGRESS: [
    "QUALITY_CHECK",
    "WAITING_PARTS",
    "WAITING_CUSTOMER_APPROVAL",
    "CANCELLED",
  ],
  QUALITY_CHECK: ["READY_FOR_DELIVERY", "IN_PROGRESS"],
  READY_FOR_DELIVERY: ["COMPLETED"],
  COMPLETED: [],
  CANCELLED: [],
};

export const REPAIR_ORDER_LABELS: Record<RepairOrderStatus, string> = {
  RECEIVED: "Đã tiếp nhận",
  INSPECTING: "Đang kiểm tra",
  WAITING_CUSTOMER_APPROVAL: "Chờ khách duyệt",
  WAITING_PARTS: "Chờ phụ tùng",
  IN_PROGRESS: "Đang sửa chữa",
  QUALITY_CHECK: "Kiểm tra chất lượng",
  READY_FOR_DELIVERY: "Sẵn sàng giao xe",
  COMPLETED: "Đã hoàn tất",
  CANCELLED: "Đã hủy",
};

export function assertRepairOrderTransition(
  from: RepairOrderStatus,
  to: RepairOrderStatus,
): void {
  assertTransition(
    REPAIR_ORDER_TRANSITIONS,
    from,
    to,
    REPAIR_ORDER_LABELS,
    "lệnh sửa chữa",
  );
}

/* ------------------------------------------------------------------ */
/* Quotation                                                           */
/* ------------------------------------------------------------------ */

/**
 * A SENT quotation is immutable: the only way to change its content is to
 * create a new version, which moves this one to SUPERSEDED.
 */
export const QUOTATION_TRANSITIONS: TransitionMap<QuotationStatus> = {
  DRAFT: ["SENT", "SUPERSEDED"],
  SENT: [
    "PARTIALLY_APPROVED",
    "APPROVED",
    "REJECTED",
    "EXPIRED",
    "SUPERSEDED",
  ],
  PARTIALLY_APPROVED: ["APPROVED", "REJECTED", "SUPERSEDED"],
  APPROVED: ["SUPERSEDED"],
  REJECTED: ["SUPERSEDED"],
  EXPIRED: ["SUPERSEDED"],
  SUPERSEDED: [],
};

export const QUOTATION_LABELS: Record<QuotationStatus, string> = {
  DRAFT: "Nháp",
  SENT: "Đã gửi khách",
  PARTIALLY_APPROVED: "Duyệt một phần",
  APPROVED: "Đã duyệt",
  REJECTED: "Khách từ chối",
  EXPIRED: "Hết hiệu lực",
  SUPERSEDED: "Đã thay thế",
};

export function assertQuotationTransition(
  from: QuotationStatus,
  to: QuotationStatus,
): void {
  assertTransition(
    QUOTATION_TRANSITIONS,
    from,
    to,
    QUOTATION_LABELS,
    "báo giá",
  );
}

/** True when a quotation's line items may still be edited by the garage. */
export function isQuotationEditable(status: QuotationStatus): boolean {
  return status === QuotationStatus.DRAFT;
}

/* ------------------------------------------------------------------ */
/* QuotationItem                                                       */
/* ------------------------------------------------------------------ */

export const QUOTATION_ITEM_TRANSITIONS: TransitionMap<QuotationItemStatus> = {
  PENDING: ["APPROVED", "REJECTED", "NEEDS_CLARIFICATION"],
  NEEDS_CLARIFICATION: ["APPROVED", "REJECTED", "PENDING"],
  APPROVED: [],
  REJECTED: [],
};

export const QUOTATION_ITEM_LABELS: Record<QuotationItemStatus, string> = {
  PENDING: "Chờ duyệt",
  APPROVED: "Đã duyệt",
  REJECTED: "Từ chối",
  NEEDS_CLARIFICATION: "Cần giải thích thêm",
};

export function assertQuotationItemTransition(
  from: QuotationItemStatus,
  to: QuotationItemStatus,
): void {
  assertTransition(
    QUOTATION_ITEM_TRANSITIONS,
    from,
    to,
    QUOTATION_ITEM_LABELS,
    "hạng mục báo giá",
  );
}

/**
 * Derives the quotation header status from its item decisions. Called after
 * every customer decision so the header never drifts from the items.
 */
export function deriveQuotationStatus(
  itemStatuses: readonly QuotationItemStatus[],
  current: QuotationStatus,
): QuotationStatus {
  if (itemStatuses.length === 0) return current;

  const approved = itemStatuses.filter((s) => s === "APPROVED").length;
  const rejected = itemStatuses.filter((s) => s === "REJECTED").length;
  const decided = approved + rejected;

  if (decided === 0) return current;
  if (approved === itemStatuses.length) return QuotationStatus.APPROVED;
  if (rejected === itemStatuses.length) return QuotationStatus.REJECTED;
  return QuotationStatus.PARTIALLY_APPROVED;
}

/* ------------------------------------------------------------------ */
/* WorkTask                                                            */
/* ------------------------------------------------------------------ */

export const WORK_TASK_TRANSITIONS: TransitionMap<WorkTaskStatus> = {
  NOT_STARTED: ["IN_PROGRESS", "WAITING_PARTS", "CANCELLED"],
  WAITING_PARTS: ["IN_PROGRESS", "CANCELLED"],
  IN_PROGRESS: [
    "PAUSED",
    "WAITING_PARTS",
    "WAITING_APPROVAL",
    "QUALITY_CHECK",
    "COMPLETED",
    "CANCELLED",
  ],
  PAUSED: ["IN_PROGRESS", "CANCELLED"],
  WAITING_APPROVAL: ["IN_PROGRESS", "CANCELLED"],
  QUALITY_CHECK: ["COMPLETED", "IN_PROGRESS"],
  COMPLETED: [],
  CANCELLED: [],
};

export const WORK_TASK_LABELS: Record<WorkTaskStatus, string> = {
  NOT_STARTED: "Chưa bắt đầu",
  WAITING_PARTS: "Chờ phụ tùng",
  IN_PROGRESS: "Đang thực hiện",
  PAUSED: "Tạm dừng",
  WAITING_APPROVAL: "Chờ duyệt phát sinh",
  QUALITY_CHECK: "Chờ kiểm tra",
  COMPLETED: "Hoàn thành",
  CANCELLED: "Đã hủy",
};

export function assertWorkTaskTransition(
  from: WorkTaskStatus,
  to: WorkTaskStatus,
): void {
  assertTransition(
    WORK_TASK_TRANSITIONS,
    from,
    to,
    WORK_TASK_LABELS,
    "công việc",
  );
}

/* ------------------------------------------------------------------ */
/* Invoice                                                             */
/* ------------------------------------------------------------------ */

export const INVOICE_TRANSITIONS: TransitionMap<InvoiceStatus> = {
  DRAFT: ["ISSUED", "CANCELLED"],
  ISSUED: ["PARTIALLY_PAID", "PAID", "OVERDUE", "CANCELLED"],
  PARTIALLY_PAID: ["PAID", "OVERDUE", "CANCELLED"],
  OVERDUE: ["PARTIALLY_PAID", "PAID", "CANCELLED"],
  PAID: ["REFUNDED"],
  REFUNDED: [],
  CANCELLED: [],
};

export const INVOICE_LABELS: Record<InvoiceStatus, string> = {
  DRAFT: "Nháp",
  ISSUED: "Đã xuất",
  PARTIALLY_PAID: "Thanh toán một phần",
  PAID: "Đã thanh toán",
  OVERDUE: "Quá hạn",
  CANCELLED: "Đã hủy",
  REFUNDED: "Đã hoàn tiền",
};

export function assertInvoiceTransition(
  from: InvoiceStatus,
  to: InvoiceStatus,
): void {
  assertTransition(INVOICE_TRANSITIONS, from, to, INVOICE_LABELS, "hóa đơn");
}

/**
 * Derives invoice status from money already collected. Keeps the status field
 * consistent with the payment rows instead of trusting a caller-supplied value.
 */
export function deriveInvoiceStatus(params: {
  totalAmount: number;
  paidAmount: number;
  current: InvoiceStatus;
}): InvoiceStatus {
  const { totalAmount, paidAmount, current } = params;
  if (current === "DRAFT" || current === "CANCELLED" || current === "REFUNDED") {
    return current;
  }
  if (paidAmount <= 0) {
    return current === "OVERDUE" ? "OVERDUE" : InvoiceStatus.ISSUED;
  }
  if (paidAmount >= totalAmount) return InvoiceStatus.PAID;
  return InvoiceStatus.PARTIALLY_PAID;
}
