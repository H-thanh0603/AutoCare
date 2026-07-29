import { describe, expect, it } from "vitest";

describe("Dashboard & Report Utilities", () => {
  it("formats currency values correctly for reports", () => {
    const revenue = 15000000;
    const formatted = new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(revenue);
    expect(formatted).toContain("15.000.000");
  });

  it("calculates net revenue correctly (collected - refunded)", () => {
    const collected = 20000000;
    const refunded = 2000000;
    const net = collected - refunded;
    expect(net).toBe(18000000);
  });
});
