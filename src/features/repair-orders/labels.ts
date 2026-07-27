/**
 * Vietnamese labels for the workflow enums.
 *
 * Kept in one place so the dashboard, the customer portal and any future export
 * all name a status identically. These are display strings only — never parse
 * them back into a status.
 */

import type {
  AppointmentStatus,
  InvoiceStatus,
  QuotationItemStatus,
  QuotationStatus,
  RepairOrderStatus,
  WorkTaskStatus,
} from "@/generated/prisma/enums";

const REPAIR_ORDER_STATUS_LABELS: Record<RepairOrderStatus, string> = {
  RECEIVED: "Đã tiếp nhận",
  INSPECTING: "Đang kiểm tra",
  WAITING_CUSTOMER_APPROVAL: "Chờ khách duyệt",
  WAITING_PARTS: "Chờ phụ tùng",
  IN_PROGRESS: "Đang sửa chữa",
  QUALITY_CHECK: "Kiểm tra chất lượng",
  READY_FOR_DELIVERY: "Chờ giao xe",
  COMPLETED: "Đã hoàn tất",
  CANCELLED: "Đã hủy",
};

const QUOTATION_STATUS_LABELS: Record<QuotationStatus, string> = {
  DRAFT: "Nháp",
  SENT: "Đã gửi khách",
  PARTIALLY_APPROVED: "Duyệt một phần",
  APPROVED: "Đã duyệt",
  REJECTED: "Khách từ chối",
  EXPIRED: "Đã hết hiệu lực",
  SUPERSEDED: "Đã thay bằng bản mới",
};

const QUOTATION_ITEM_STATUS_LABELS: Record<QuotationItemStatus, string> = {
  PENDING: "Chờ duyệt",
  APPROVED: "Đồng ý",
  REJECTED: "Không làm",
  NEEDS_CLARIFICATION: "Cần tư vấn thêm",
};

const WORK_TASK_STATUS_LABELS: Record<WorkTaskStatus, string> = {
  NOT_STARTED: "Chưa bắt đầu",
  WAITING_PARTS: "Chờ phụ tùng",
  IN_PROGRESS: "Đang làm",
  PAUSED: "Tạm dừng",
  WAITING_APPROVAL: "Chờ duyệt phát sinh",
  QUALITY_CHECK: "Chờ kiểm tra",
  COMPLETED: "Hoàn tất",
  CANCELLED: "Đã hủy",
};

const INVOICE_STATUS_LABELS: Record<InvoiceStatus, string> = {
  DRAFT: "Nháp",
  ISSUED: "Đã xuất",
  PARTIALLY_PAID: "Thanh toán một phần",
  PAID: "Đã thanh toán",
  OVERDUE: "Quá hạn",
  CANCELLED: "Đã hủy",
  REFUNDED: "Đã hoàn tiền",
};

const APPOINTMENT_STATUS_LABELS: Record<AppointmentStatus, string> = {
  PENDING: "Chờ xác nhận",
  CONFIRMED: "Đã xác nhận",
  ARRIVED: "Khách đã đến",
  COMPLETED: "Đã hoàn tất",
  CANCELLED: "Đã hủy",
  NO_SHOW: "Khách không đến",
};

export function repairOrderStatusLabel(status: RepairOrderStatus): string {
  return REPAIR_ORDER_STATUS_LABELS[status];
}

export function quotationStatusLabel(status: QuotationStatus): string {
  return QUOTATION_STATUS_LABELS[status];
}

export function quotationItemStatusLabel(status: QuotationItemStatus): string {
  return QUOTATION_ITEM_STATUS_LABELS[status];
}

export function workTaskStatusLabel(status: WorkTaskStatus): string {
  return WORK_TASK_STATUS_LABELS[status];
}

export function invoiceStatusLabel(status: InvoiceStatus): string {
  return INVOICE_STATUS_LABELS[status];
}

export function appointmentStatusLabel(status: AppointmentStatus): string {
  return APPOINTMENT_STATUS_LABELS[status];
}
