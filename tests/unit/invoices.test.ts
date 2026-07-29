import { describe, expect, it } from "vitest";
import { calculateInvoiceSummary } from "@/features/invoices/domain";
import { assertInvoiceTransition, deriveInvoiceStatus } from "@/lib/transitions";
import { BusinessRuleError } from "@/lib/errors";

describe("Invoice calculation & status transitions", () => {
  it("calculates invoice subtotal, discount, and total in VND", () => {
    const lines = [
      { description: "Thay nhớt", quantity: 1, unitPrice: 300000, discountAmount: 0 },
      { description: "Lọc nhớt", quantity: 2, unitPrice: 150000, discountAmount: 20000 },
    ];
    const summary = calculateInvoiceSummary(lines, 30000, 10);
    expect(summary.subtotal).toBe(580000); // 300000 + (300000 - 20000) = 580000
    expect(summary.headerDiscount).toBe(30000);
    expect(summary.taxAmount).toBe(55000); // 10% of 550000 = 55000
    expect(summary.totalAmount).toBe(605000); // 550000 + 55000 = 605000
  });

  it("derives invoice status correctly based on paid amount", () => {
    expect(
      deriveInvoiceStatus({
        totalAmount: 1000000,
        paidAmount: 0,
        current: "ISSUED",
      }),
    ).toBe("ISSUED");

    expect(
      deriveInvoiceStatus({
        totalAmount: 1000000,
        paidAmount: 500000,
        current: "ISSUED",
      }),
    ).toBe("PARTIALLY_PAID");

    expect(
      deriveInvoiceStatus({
        totalAmount: 1000000,
        paidAmount: 1000000,
        current: "PARTIALLY_PAID",
      }),
    ).toBe("PAID");
  });

  it("enforces invoice status transition rules", () => {
    expect(() => assertInvoiceTransition("DRAFT", "ISSUED")).not.toThrow();
    expect(() => assertInvoiceTransition("ISSUED", "PARTIALLY_PAID")).not.toThrow();
    expect(() => assertInvoiceTransition("PARTIALLY_PAID", "PAID")).not.toThrow();
    expect(() => assertInvoiceTransition("PAID", "DRAFT")).toThrow(BusinessRuleError);
  });
});
