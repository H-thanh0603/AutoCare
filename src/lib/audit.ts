/**
 * Audit logging.
 *
 * Sensitive business events (quotation changes, approvals, stock movements,
 * invoices, payments, ownership transfers, odometer overrides, share links)
 * must leave a trail. Writes take a transaction handle so the audit record and
 * the change it describes commit together.
 */

import type { PrismaClientOrTx } from "./prisma";
import { prisma } from "./prisma";

export const AUDIT_ACTIONS = {
  QUOTATION_CREATED: "quotation.created",
  QUOTATION_SENT: "quotation.sent",
  QUOTATION_REVISED: "quotation.revised",
  QUOTATION_ITEM_DECIDED: "quotation.item_decided",
  WORK_TASK_CREATED: "work_task.created",
  WORK_TASK_ASSIGNED: "work_task.assigned",
  INVENTORY_ISSUED: "inventory.issued",
  INVENTORY_ADJUSTED: "inventory.adjusted",
  INVENTORY_RETURNED: "inventory.returned",
  INVOICE_ISSUED: "invoice.issued",
  INVOICE_CANCELLED: "invoice.cancelled",
  PAYMENT_RECORDED: "payment.recorded",
  PAYMENT_REFUNDED: "payment.refunded",
  OWNERSHIP_TRANSFERRED: "vehicle.ownership_transferred",
  MILEAGE_OVERRIDDEN: "vehicle.mileage_overridden",
  MAINTENANCE_RECORD_AMENDED: "maintenance_record.amended",
  SHARE_LINK_CREATED: "share_link.created",
  SHARE_LINK_REVOKED: "share_link.revoked",
  APPOINTMENT_STATUS_CHANGED: "appointment.status_changed",
  APPOINTMENT_RESCHEDULED: "appointment.rescheduled",
  REPAIR_ORDER_RECEIVED: "repair_order.received",
  REPAIR_ORDER_WALK_IN: "repair_order.walk_in",
  REPAIR_ORDER_STATUS_CHANGED: "repair_order.status_changed",
  VEHICLE_DELIVERED: "repair_order.delivered",
  INSPECTION_STARTED: "inspection.started",
  INSPECTION_UPDATED: "inspection.updated",
  MEDIA_UPLOADED: "media.uploaded",
  CUSTOMER_RECORDS_CLAIMED: "customer.records_claimed",
} as const;

export type AuditAction = (typeof AUDIT_ACTIONS)[keyof typeof AUDIT_ACTIONS];

/** Field names never written to the audit trail. */
const REDACTED_KEYS = new Set([
  "password",
  "passwordHash",
  "token",
  "secret",
  "accessToken",
  "refreshToken",
]);

/**
 * Strips secrets from a snapshot before it is persisted. Audit rows are read by
 * managers in the dashboard, so they must not carry credentials.
 */
export function redactSnapshot(value: unknown): unknown {
  if (value === null || typeof value !== "object") {
    return value ?? null;
  }
  if (Array.isArray(value)) {
    return value.map(redactSnapshot);
  }
  if (value instanceof Date) {
    return value.toISOString();
  }

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([key, entry]) => [
      key,
      REDACTED_KEYS.has(key) ? "[redacted]" : redactSnapshot(entry),
    ]),
  );
}

export interface AuditEntry {
  action: AuditAction;
  entityType: string;
  entityId: string;
  garageId?: string | null;
  actorUserId?: string | null;
  before?: unknown;
  after?: unknown;
  metadata?: Record<string, unknown>;
}

export async function recordAudit(
  entry: AuditEntry,
  tx: PrismaClientOrTx = prisma,
): Promise<void> {
  await tx.auditLog.create({
    data: {
      action: entry.action,
      entityType: entry.entityType,
      entityId: entry.entityId,
      garageId: entry.garageId ?? null,
      actorUserId: entry.actorUserId ?? null,
      before: redactSnapshot(entry.before ?? null) as never,
      after: redactSnapshot(entry.after ?? null) as never,
      metadata: (entry.metadata ? redactSnapshot(entry.metadata) : null) as never,
    },
  });
}
