"use server";

import { PaymentMethod, PaymentType } from "@/generated/prisma/enums";
import {
  cancelInvoice,
  createInvoiceFromRepairOrder,
  issueInvoice,
  recordPayment,
} from "@/features/invoices/service";
import { getSessionUser } from "@/lib/auth";
import { runAction } from "@/lib/errors";
import { requireGarageScope, requirePermission } from "@/lib/rbac";

export async function createInvoiceAction(repairOrderId: string, discountAmount?: number, taxRatePercent?: number) {
  return runAction(async () => {
    const user = requirePermission(await getSessionUser(), "invoice:write");
    const { garageId } = requireGarageScope(user);
    return createInvoiceFromRepairOrder({
      garageId,
      repairOrderId,
      actorUserId: user.id,
      discountAmount,
      taxRatePercent,
    });
  });
}

export async function issueInvoiceAction(invoiceId: string, dueAt?: Date) {
  return runAction(async () => {
    const user = requirePermission(await getSessionUser(), "invoice:write");
    const { garageId } = requireGarageScope(user);
    return issueInvoice({
      garageId,
      invoiceId,
      actorUserId: user.id,
      dueAt,
    });
  });
}

export async function cancelInvoiceAction(invoiceId: string, cancelReason: string) {
  return runAction(async () => {
    const user = requirePermission(await getSessionUser(), "invoice:write");
    const { garageId } = requireGarageScope(user);
    return cancelInvoice({
      garageId,
      invoiceId,
      cancelReason,
      actorUserId: user.id,
    });
  });
}

export async function recordPaymentAction(
  invoiceId: string,
  amount: number,
  type?: PaymentType,
  method?: PaymentMethod,
  reference?: string,
  note?: string,
) {
  return runAction(async () => {
    const user = requirePermission(await getSessionUser(), "payment:write");
    const { garageId } = requireGarageScope(user);
    return recordPayment({
      garageId,
      invoiceId,
      amount,
      type,
      method,
      reference,
      note,
      actorUserId: user.id,
    });
  });
}
