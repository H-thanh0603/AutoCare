import { describe, expect, it } from "vitest";

import {
  addMoney,
  calculateBalanceDue,
  calculateInvoiceTotals,
  calculateLineTotal,
  formatVnd,
  multiplyMoney,
  percentOf,
  roundVnd,
  subtractMoney,
} from "@/lib/money";

describe("assertMoney guards", () => {
  it("rejects non-integer amounts", () => {
    expect(() => addMoney(1.5, 1)).toThrow();
  });

  it("rejects NaN", () => {
    expect(() => addMoney(Number.NaN, 1)).toThrow();
  });

  it("rejects amounts beyond the safe integer range", () => {
    expect(() => addMoney(Number.MAX_SAFE_INTEGER * 2, 1)).toThrow();
  });
});

describe("roundVnd", () => {
  it("rounds half away from zero", () => {
    expect(roundVnd(0.5)).toBe(1);
    expect(roundVnd(-0.5)).toBe(-1);
    expect(roundVnd(1.4)).toBe(1);
  });

  it("keeps integers untouched", () => {
    expect(roundVnd(120_000)).toBe(120_000);
  });
});

describe("arithmetic", () => {
  it("adds and subtracts exactly", () => {
    expect(addMoney(120_000, 35_000)).toBe(155_000);
    expect(subtractMoney(155_000, 35_000)).toBe(120_000);
  });

  it("avoids float drift that plain multiplication would introduce", () => {
    // 0.1 + 0.2 style drift must never reach a stored amount.
    expect(multiplyMoney(35_100, 3)).toBe(105_300);
  });

  it("computes percentages as whole dong", () => {
    expect(percentOf(1_000_000, 8)).toBe(80_000);
    expect(percentOf(155_000, 10)).toBe(15_500);
    // 33333 * 3% = 999.99 -> 1000
    expect(percentOf(33_333, 3)).toBe(1_000);
  });
});

describe("calculateLineTotal", () => {
  it("multiplies quantity by unit price", () => {
    expect(calculateLineTotal({ quantity: 4, unitPrice: 250_000 })).toBe(
      1_000_000,
    );
  });

  it("applies a line discount", () => {
    expect(
      calculateLineTotal({
        quantity: 2,
        unitPrice: 250_000,
        discountAmount: 50_000,
      }),
    ).toBe(450_000);
  });

  it("rejects a discount larger than the gross line amount", () => {
    expect(() =>
      calculateLineTotal({
        quantity: 1,
        unitPrice: 100_000,
        discountAmount: 300_000,
      }),
    ).toThrow(/Giảm giá/);
  });

  it("allows a discount equal to the gross line amount", () => {
    expect(
      calculateLineTotal({
        quantity: 1,
        unitPrice: 100_000,
        discountAmount: 100_000,
      }),
    ).toBe(0);
  });

  it("rejects a negative quantity", () => {
    expect(() =>
      calculateLineTotal({ quantity: -1, unitPrice: 100_000 }),
    ).toThrow();
  });
});

describe("calculateInvoiceTotals", () => {
  it("sums lines, applies discount, then tax", () => {
    const totals = calculateInvoiceTotals({
      lineTotals: [1_000_000, 450_000, 120_000],
      discountAmount: 70_000,
      taxPercent: 8,
    });

    expect(totals.subtotal).toBe(1_570_000);
    expect(totals.discountAmount).toBe(70_000);
    // tax on 1_500_000
    expect(totals.taxAmount).toBe(120_000);
    expect(totals.totalAmount).toBe(1_620_000);
  });

  it("works with no discount and no tax", () => {
    const totals = calculateInvoiceTotals({ lineTotals: [500_000] });
    expect(totals).toEqual({
      subtotal: 500_000,
      discountAmount: 0,
      taxAmount: 0,
      totalAmount: 500_000,
    });
  });

  it("rejects a discount larger than the subtotal", () => {
    expect(() =>
      calculateInvoiceTotals({
        lineTotals: [100_000],
        discountAmount: 500_000,
      }),
    ).toThrow(/Giảm giá/);
  });

  it("allows a discount equal to the subtotal", () => {
    const totals = calculateInvoiceTotals({
      lineTotals: [100_000],
      discountAmount: 100_000,
      taxPercent: 8,
    });
    expect(totals.totalAmount).toBe(0);
    expect(totals.taxAmount).toBe(0);
  });
});

describe("calculateBalanceDue", () => {
  it("returns the outstanding amount", () => {
    expect(calculateBalanceDue(1_620_000, 620_000)).toBe(1_000_000);
  });

  it("never goes negative on overpayment", () => {
    expect(calculateBalanceDue(500_000, 800_000)).toBe(0);
  });
});

describe("formatVnd", () => {
  it("formats with Vietnamese grouping", () => {
    // Non-breaking spaces vary by ICU build, so compare digits only.
    expect(formatVnd(1_620_000).replace(/\s/g, " ")).toContain("1.620.000");
  });
});
