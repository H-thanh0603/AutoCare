import { BusinessRuleError } from "@/lib/errors";

export interface MileageChangeInput {
  previousKm: number | null;
  nextKm: number;
  overrideReason: string | null;
  isGarageManager: boolean;
}

/**
 * A lower odometer reading is an exceptional correction, never an ordinary
 * reception entry. It needs both an explanation and the manager role.
 */
export function validateMileageChange(input: MileageChangeInput): void {
  if (input.previousKm === null || input.nextKm >= input.previousKm) {
    return;
  }
  if (!input.overrideReason) {
    throw new BusinessRuleError("Số km mới không được nhỏ hơn số km hiện tại.");
  }
  if (!input.isGarageManager) {
    throw new BusinessRuleError("Chỉ quản lý gara được phép override số km giảm.");
  }
}
