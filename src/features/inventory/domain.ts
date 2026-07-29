import { Part } from "@/generated/prisma/client";
import { BusinessRuleError } from "@/lib/errors";

export function assertSufficientStock(
  part: Pick<Part, "id" | "name" | "quantityInStock">,
  requestedQuantity: number,
  allowNegativeStock = false,
): void {
  if (requestedQuantity <= 0) {
    throw new BusinessRuleError("Số lượng xuất kho phải lớn hơn 0.");
  }
  if (!allowNegativeStock && part.quantityInStock - requestedQuantity < 0) {
    throw new BusinessRuleError(
      `Phụ tùng "${part.name}" không đủ tồn kho (hiện có ${part.quantityInStock}, yêu cầu ${requestedQuantity}).`,
    );
  }
}
