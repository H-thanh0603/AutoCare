"use server";

import { revalidatePath } from "next/cache";

import { customerSchema } from "@/features/customers/schema";
import {
  createGarageCustomer,
  deleteGarageCustomer,
  updateGarageCustomer,
} from "@/features/customers/service";
import { getSessionUser } from "@/lib/auth";
import { runAction, ValidationError, type ActionResult } from "@/lib/errors";
import { requireGarageScope, requirePermission } from "@/lib/rbac";

function customerFormInput(formData: FormData): Record<string, FormDataEntryValue | null> {
  return {
    name: formData.get("name"),
    phone: formData.get("phone"),
    email: formData.get("email"),
    address: formData.get("address"),
    note: formData.get("note"),
  };
}

function formErrors(error: { issues: { path: PropertyKey[]; message: string }[] }): Record<string, string[]> {
  const fieldErrors: Record<string, string[]> = {};
  for (const issue of error.issues) {
    const field = String(issue.path[0] ?? "form");
    fieldErrors[field] = [...(fieldErrors[field] ?? []), issue.message];
  }
  return fieldErrors;
}

export async function createCustomerAction(
  formData: FormData,
): Promise<ActionResult<{ id: string }>> {
  return runAction(async () => {
    const parsed = customerSchema.safeParse(customerFormInput(formData));
    if (!parsed.success) {
      throw new ValidationError("Dữ liệu khách hàng không hợp lệ.", formErrors(parsed.error));
    }

    const user = requirePermission(await getSessionUser(), "customer:write");
    const { garageId } = requireGarageScope(user);
    const customer = await createGarageCustomer(garageId, parsed.data);
    revalidatePath("/khach-hang");
    return customer;
  });
}

export async function updateCustomerAction(
  customerId: string,
  formData: FormData,
): Promise<ActionResult<void>> {
  return runAction(async () => {
    const parsed = customerSchema.safeParse(customerFormInput(formData));
    if (!parsed.success) {
      throw new ValidationError("Dữ liệu khách hàng không hợp lệ.", formErrors(parsed.error));
    }

    const user = requirePermission(await getSessionUser(), "customer:write");
    const { garageId } = requireGarageScope(user);
    await updateGarageCustomer(garageId, customerId, parsed.data);
    revalidatePath("/khach-hang");
    revalidatePath(`/khach-hang/${customerId}`);
  });
}

export async function deleteCustomerAction(customerId: string): Promise<ActionResult<void>> {
  return runAction(async () => {
    const user = requirePermission(await getSessionUser(), "customer:write");
    const { garageId } = requireGarageScope(user);
    await deleteGarageCustomer(garageId, customerId);
    revalidatePath("/khach-hang");
  });
}
