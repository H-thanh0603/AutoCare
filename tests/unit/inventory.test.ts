import { describe, expect, it } from "vitest";
import { assertSufficientStock } from "@/features/inventory/domain";
import { BusinessRuleError } from "@/lib/errors";

describe("Inventory stock assertions", () => {
  const mockPart = {
    id: "part-1",
    name: "Lọc nhớt Toyota",
    quantityInStock: 5,
  };

  it("allows issuing stock within available quantity", () => {
    expect(() => assertSufficientStock(mockPart, 3, false)).not.toThrow();
    expect(() => assertSufficientStock(mockPart, 5, false)).not.toThrow();
  });

  it("throws BusinessRuleError when stock is insufficient and allowNegativeStock is false", () => {
    expect(() => assertSufficientStock(mockPart, 10, false)).toThrow(BusinessRuleError);
  });

  it("allows issuing more than stock when allowNegativeStock is true", () => {
    expect(() => assertSufficientStock(mockPart, 10, true)).not.toThrow();
  });

  it("rejects non-positive quantities", () => {
    expect(() => assertSufficientStock(mockPart, 0, false)).toThrow(BusinessRuleError);
    expect(() => assertSufficientStock(mockPart, -1, false)).toThrow(BusinessRuleError);
  });
});
