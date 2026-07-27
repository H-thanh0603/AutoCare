/**
 * Money arithmetic for AutoCare.
 *
 * All amounts are integers in VND (đồng). VND has no sub-unit in practice, so a
 * plain integer is exact — but JavaScript floating point is still unsafe for
 * percentages and averages, so every operation here rounds explicitly.
 */

import { ValidationError } from "./errors";

/** A monetary amount in VND. Always an integer, never negative unless stated. */
export type Money = number;

const MAX_SAFE_VND = Number.MAX_SAFE_INTEGER;

export function assertMoney(value: number, field = "amount"): Money {
  if (!Number.isFinite(value)) {
    throw new ValidationError(`${field} không phải là số hợp lệ.`);
  }
  if (!Number.isInteger(value)) {
    throw new ValidationError(`${field} phải là số nguyên (đơn vị VND).`);
  }
  if (Math.abs(value) > MAX_SAFE_VND) {
    throw new ValidationError(`${field} vượt quá giới hạn an toàn.`);
  }
  return value;
}

export function assertNonNegativeMoney(value: number, field = "amount"): Money {
  assertMoney(value, field);
  if (value < 0) {
    throw new ValidationError(`${field} không được âm.`);
  }
  return value;
}

/** Rounds half away from zero, matching how invoices are rounded by hand. */
export function roundVnd(value: number): Money {
  if (!Number.isFinite(value)) {
    throw new ValidationError("Giá trị tiền không hợp lệ.");
  }
  return value < 0 ? -Math.round(-value) : Math.round(value);
}

export function addMoney(...amounts: Money[]): Money {
  return amounts.reduce<Money>((sum, amount) => sum + assertMoney(amount), 0);
}

export function subtractMoney(minuend: Money, subtrahend: Money): Money {
  return assertMoney(minuend) - assertMoney(subtrahend);
}

/**
 * Multiplies an amount by an integer quantity. Quantities are always whole
 * units in AutoCare (parts, service lines), so no fractional path exists.
 */
export function multiplyMoney(amount: Money, quantity: number): Money {
  assertMoney(amount);
  if (!Number.isInteger(quantity) || quantity < 0) {
    throw new ValidationError("Số lượng phải là số nguyên không âm.");
  }
  return amount * quantity;
}

/** Applies a percentage (0–100) and rounds to whole VND. */
export function percentOf(amount: Money, percent: number): Money {
  assertMoney(amount);
  if (!Number.isFinite(percent) || percent < 0 || percent > 100) {
    throw new ValidationError("Phần trăm phải nằm trong khoảng 0–100.");
  }
  return roundVnd((amount * percent) / 100);
}

export interface LineTotalInput {
  quantity: number;
  unitPrice: Money;
  discountAmount?: Money;
}

/**
 * Line total = quantity * unitPrice - discount. Discount may not exceed the
 * gross line amount; a line can never be negative.
 */
export function calculateLineTotal({
  quantity,
  unitPrice,
  discountAmount = 0,
}: LineTotalInput): Money {
  const gross = multiplyMoney(assertNonNegativeMoney(unitPrice, "đơn giá"), quantity);
  const discount = assertNonNegativeMoney(discountAmount, "giảm giá");
  if (discount > gross) {
    throw new ValidationError("Giảm giá không được lớn hơn giá trị dòng.");
  }
  return gross - discount;
}

export interface InvoiceTotalsInput {
  lineTotals: Money[];
  /** Invoice-level discount in VND, applied after the line subtotal. */
  discountAmount?: Money;
  /** VAT percentage (0–100) applied to the discounted subtotal. */
  taxPercent?: number;
}

export interface InvoiceTotals {
  subtotal: Money;
  discountAmount: Money;
  taxAmount: Money;
  totalAmount: Money;
}

export function calculateInvoiceTotals({
  lineTotals,
  discountAmount = 0,
  taxPercent = 0,
}: InvoiceTotalsInput): InvoiceTotals {
  const subtotal = addMoney(...lineTotals);
  const discount = assertNonNegativeMoney(discountAmount, "giảm giá hóa đơn");
  if (discount > subtotal) {
    throw new ValidationError("Giảm giá không được lớn hơn tổng tiền hàng.");
  }
  const taxable = subtotal - discount;
  const taxAmount = percentOf(taxable, taxPercent);
  return {
    subtotal,
    discountAmount: discount,
    taxAmount,
    totalAmount: taxable + taxAmount,
  };
}

/** Remaining balance on an invoice. Never negative; overpayment reads as 0. */
export function calculateBalanceDue(totalAmount: Money, paidAmount: Money): Money {
  const balance = subtractMoney(
    assertNonNegativeMoney(totalAmount, "tổng tiền"),
    assertNonNegativeMoney(paidAmount, "đã thanh toán"),
  );
  return balance > 0 ? balance : 0;
}

const VND_FORMATTER = new Intl.NumberFormat("vi-VN", {
  style: "currency",
  currency: "VND",
  maximumFractionDigits: 0,
});

export function formatVnd(amount: Money): string {
  return VND_FORMATTER.format(assertMoney(amount));
}
