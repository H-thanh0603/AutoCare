import { calculateInvoiceTotals, calculateLineTotal } from "@/lib/money";
import { assertInvoiceTransition, deriveInvoiceStatus, INVOICE_LABELS } from "@/lib/transitions";

export { assertInvoiceTransition, deriveInvoiceStatus, INVOICE_LABELS };

export interface InvoiceLineInput {
  description: string;
  quantity: number;
  unitPrice: number;
  discountAmount?: number;
}

export function calculateInvoiceSummary(
  lines: InvoiceLineInput[],
  headerDiscount = 0,
  taxRatePercent = 0,
) {
  const lineTotals = lines.map((line) =>
    calculateLineTotal({
      quantity: line.quantity,
      unitPrice: line.unitPrice,
      discountAmount: line.discountAmount ?? 0,
    }),
  );

  const totals = calculateInvoiceTotals({
    lineTotals,
    discountAmount: headerDiscount,
    taxPercent: taxRatePercent,
  });

  return {
    subtotal: totals.subtotal,
    headerDiscount: totals.discountAmount,
    taxAmount: totals.taxAmount,
    totalAmount: totals.totalAmount,
  };
}
