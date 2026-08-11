"use server";

import { revalidatePath } from "next/cache";

import { decideQuotationItem, decideQuotationItemAsManager, saveQuotationDraft, sendQuotation } from "@/features/quotations/service";
import { getSessionUser } from "@/lib/auth";
import { runAction, ValidationError, type ActionResult } from "@/lib/errors";
import { RATE_LIMITS, assertRateLimit } from "@/lib/rate-limit";
import { requireGarageScope, requirePermission } from "@/lib/rbac";

function amount(formData: FormData, name: string): number {
  const value = Number(formData.get(name));
  if (!Number.isInteger(value) || value < 0) throw new ValidationError("Số tiền không hợp lệ.");
  return value;
}

export async function saveQuotationDraftFormAction(formData: FormData): Promise<void> {
  await runAction(async () => {
    const repairOrderId = String(formData.get("repairOrderId") ?? "");
    const description = String(formData.get("description") ?? "").trim();
    if (!description) throw new ValidationError("Vui lòng nhập hạng mục báo giá.");
    const user = requirePermission(await getSessionUser(), "quotation:write");
    const { garageId } = requireGarageScope(user);
    await saveQuotationDraft(garageId, user.id, {
      repairOrderId,
      note: String(formData.get("note") ?? "") || null,
      validUntil: formData.get("validUntil") ? new Date(String(formData.get("validUntil"))) : null,
      items: [{ type: "OTHER", description, quantity: amount(formData, "quantity"), unitPrice: amount(formData, "unitPrice"), discountAmount: amount(formData, "discountAmount") }],
    });
    revalidatePath(`/lenh-sua-chua/${repairOrderId}`);
  });
}

export async function sendQuotationFormAction(formData: FormData): Promise<void> {
  await runAction(async () => {
    const quotationId = String(formData.get("quotationId") ?? "");
    const user = requirePermission(await getSessionUser(), "quotation:send");
    const { garageId } = requireGarageScope(user);
    await sendQuotation(garageId, user.id, quotationId);
    revalidatePath("/lenh-sua-chua");
  });
}

/** Customer approves/rejects a single item, with an ActionResult the client can show. */
export async function decideQuotationItemAction(
  quotationItemId: string,
  status: "APPROVED" | "REJECTED",
  customerNote?: string,
): Promise<ActionResult<void>> {
  return runAction(async () => {
    const user = requirePermission(await getSessionUser(), "quotation:approve");
    await assertRateLimit({ key: `quotation:${user.id}`, ...RATE_LIMITS.PORTAL_QUOTATION });
    await decideQuotationItem(user.id, quotationItemId, {
      status,
      customerNote: customerNote?.trim() || null,
    });
    revalidatePath("/tai-khoan");
  });
}

export async function decideQuotationItemFormAction(formData: FormData): Promise<void> {
  await runAction(async () => {
    const user = requirePermission(await getSessionUser(), "quotation:approve");
    await assertRateLimit({ key: `quotation:${user.id}`, ...RATE_LIMITS.PORTAL_QUOTATION });
    const itemId = String(formData.get("quotationItemId") ?? "");
    const status = String(formData.get("status") ?? "");
    if (status !== "APPROVED" && status !== "REJECTED" && status !== "NEEDS_CLARIFICATION") {
      throw new ValidationError("Quyết định báo giá không hợp lệ.");
    }
    await decideQuotationItem(user.id, itemId, { status, customerNote: String(formData.get("customerNote") ?? "") || null });
    revalidatePath("/tai-khoan");
  });
}

export async function decideQuotationItemAsManagerFormAction(formData: FormData): Promise<void> {
  await runAction(async () => {
    const user = requirePermission(await getSessionUser(), "quotation:approve");
    await assertRateLimit({ key: `quotation:${user.id}`, ...RATE_LIMITS.PORTAL_QUOTATION });
    const { garageId } = requireGarageScope(user);
    const itemId = String(formData.get("quotationItemId") ?? "");
    const status = String(formData.get("status") ?? "");
    if (status !== "APPROVED" && status !== "REJECTED" && status !== "NEEDS_CLARIFICATION") {
      throw new ValidationError("Quyết định báo giá không hợp lệ.");
    }
    await decideQuotationItemAsManager(garageId, user.id, itemId, {
      status,
      customerNote: String(formData.get("customerNote") ?? "") || null,
      managerReason: String(formData.get("managerReason") ?? ""),
    });
    revalidatePath("/lenh-sua-chua");
  });
}
