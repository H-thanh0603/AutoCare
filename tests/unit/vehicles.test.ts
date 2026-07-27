import { describe, expect, it } from "vitest";

import { normalizeLicensePlate } from "@/features/vehicles/schema";
import { validateMileageChange } from "@/features/vehicles/mileage";

describe("normalizeLicensePlate", () => {
  it("uppercases and removes common separators", () => {
    expect(normalizeLicensePlate(" 51f-123.45 ")).toBe("51F12345");
  });
});

describe("validateMileageChange", () => {
  it("allows an increase without an override reason", () => {
    expect(() =>
      validateMileageChange({
        previousKm: 50_000,
        nextKm: 50_100,
        overrideReason: null,
        isGarageManager: false,
      }),
    ).not.toThrow();
  });

  it("allows an unchanged reading", () => {
    expect(() =>
      validateMileageChange({
        previousKm: 50_000,
        nextKm: 50_000,
        overrideReason: null,
        isGarageManager: false,
      }),
    ).not.toThrow();
  });

  it("rejects a decrease without a reason", () => {
    expect(() =>
      validateMileageChange({
        previousKm: 50_000,
        nextKm: 49_000,
        overrideReason: null,
        isGarageManager: true,
      }),
    ).toThrow("không được nhỏ hơn");
  });

  it("rejects a decrease by a non-manager", () => {
    expect(() =>
      validateMileageChange({
        previousKm: 50_000,
        nextKm: 49_000,
        overrideReason: "Đồng hồ đã được thay mới.",
        isGarageManager: false,
      }),
    ).toThrow("quản lý gara");
  });

  it("allows a manager to override a decrease with a reason", () => {
    expect(() =>
      validateMileageChange({
        previousKm: 50_000,
        nextKm: 49_000,
        overrideReason: "Đồng hồ đã được thay mới.",
        isGarageManager: true,
      }),
    ).not.toThrow();
  });
});
