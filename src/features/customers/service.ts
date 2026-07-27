import {
  countOpenRepairOrdersForCustomer,
  createCustomer,
  softDeleteCustomer,
  updateCustomer,
} from "@/data/customers";
import type { CustomerInput } from "@/features/customers/schema";
import { BusinessRuleError } from "@/lib/errors";

/** Prisma reports a unique-constraint breach as error code P2002. */
function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code: unknown }).code === "P2002"
  );
}

export async function createGarageCustomer(
  garageId: string,
  input: CustomerInput,
): Promise<{ id: string }> {
  try {
    return await createCustomer(garageId, input);
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw new BusinessRuleError("Số điện thoại này đã tồn tại trong gara.");
    }
    throw error;
  }
}

export async function updateGarageCustomer(
  garageId: string,
  customerId: string,
  input: CustomerInput,
): Promise<void> {
  try {
    await updateCustomer(garageId, customerId, input);
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw new BusinessRuleError("Số điện thoại này đã tồn tại trong gara.");
    }
    throw error;
  }
}

export async function deleteGarageCustomer(
  garageId: string,
  customerId: string,
): Promise<void> {
  const openOrderCount = await countOpenRepairOrdersForCustomer(garageId, customerId);
  if (openOrderCount > 0) {
    throw new BusinessRuleError("Không thể xóa khách hàng còn lệnh sửa chữa đang mở.");
  }
  await softDeleteCustomer(garageId, customerId);
}
