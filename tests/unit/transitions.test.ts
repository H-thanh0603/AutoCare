import { describe, expect, it } from "vitest";

import { BusinessRuleError } from "@/lib/errors";
import {
  APPOINTMENT_TRANSITIONS,
  INVOICE_TRANSITIONS,
  QUOTATION_ITEM_TRANSITIONS,
  QUOTATION_TRANSITIONS,
  REPAIR_ORDER_TRANSITIONS,
  WORK_TASK_TRANSITIONS,
  assertAppointmentTransition,
  assertInvoiceTransition,
  assertQuotationItemTransition,
  assertQuotationTransition,
  assertRepairOrderTransition,
  assertWorkTaskTransition,
  deriveInvoiceStatus,
  deriveQuotationStatus,
  isQuotationEditable,
} from "@/lib/transitions";
import { allowedTransitions, canTransition, isTerminal } from "@/lib/state-machine";

describe("appointment transitions", () => {
  it("allows the happy path", () => {
    expect(() => assertAppointmentTransition("PENDING", "CONFIRMED")).not.toThrow();
    expect(() => assertAppointmentTransition("CONFIRMED", "ARRIVED")).not.toThrow();
    expect(() => assertAppointmentTransition("ARRIVED", "COMPLETED")).not.toThrow();
  });

  it("rejects skipping confirmation", () => {
    expect(() => assertAppointmentTransition("PENDING", "ARRIVED")).toThrow(
      BusinessRuleError,
    );
  });

  it("rejects cancellation after arrival and leaving terminal states", () => {
    expect(() => assertAppointmentTransition("ARRIVED", "CANCELLED")).toThrow(
      BusinessRuleError,
    );
    expect(() => assertAppointmentTransition("CANCELLED", "CONFIRMED")).toThrow(
      BusinessRuleError,
    );
    expect(() => assertAppointmentTransition("COMPLETED", "ARRIVED")).toThrow(
      BusinessRuleError,
    );
  });

  it("rejects a no-op transition with a readable message", () => {
    expect(() => assertAppointmentTransition("PENDING", "PENDING")).toThrow(
      /Chờ xác nhận/,
    );
  });
});

describe("repair order transitions", () => {
  it("follows reception → inspection → approval → work → QC → delivery", () => {
    const path = [
      ["RECEIVED", "INSPECTING"],
      ["INSPECTING", "WAITING_CUSTOMER_APPROVAL"],
      ["WAITING_CUSTOMER_APPROVAL", "IN_PROGRESS"],
      ["IN_PROGRESS", "QUALITY_CHECK"],
      ["QUALITY_CHECK", "READY_FOR_DELIVERY"],
      ["READY_FOR_DELIVERY", "COMPLETED"],
    ] as const;

    for (const [from, to] of path) {
      expect(() => assertRepairOrderTransition(from, to)).not.toThrow();
    }
  });

  it("never allows delivery before quality check", () => {
    expect(() =>
      assertRepairOrderTransition("IN_PROGRESS", "READY_FOR_DELIVERY"),
    ).toThrow(BusinessRuleError);
    expect(() => assertRepairOrderTransition("IN_PROGRESS", "COMPLETED")).toThrow(
      BusinessRuleError,
    );
    expect(() =>
      assertRepairOrderTransition("WAITING_CUSTOMER_APPROVAL", "COMPLETED"),
    ).toThrow(BusinessRuleError);
  });

  it("allows falling back to approval for a supplementary quotation", () => {
    expect(() =>
      assertRepairOrderTransition("IN_PROGRESS", "WAITING_CUSTOMER_APPROVAL"),
    ).not.toThrow();
  });

  it("allows QC to bounce work back to the technician", () => {
    expect(() =>
      assertRepairOrderTransition("QUALITY_CHECK", "IN_PROGRESS"),
    ).not.toThrow();
  });

  it("cannot cancel an order that is ready for delivery or completed", () => {
    expect(() =>
      assertRepairOrderTransition("READY_FOR_DELIVERY", "CANCELLED"),
    ).toThrow(BusinessRuleError);
    expect(() => assertRepairOrderTransition("COMPLETED", "CANCELLED")).toThrow(
      BusinessRuleError,
    );
  });
});

describe("quotation transitions", () => {
  it("locks a sent quotation against edits", () => {
    expect(isQuotationEditable("DRAFT")).toBe(true);
    expect(isQuotationEditable("SENT")).toBe(false);
    expect(isQuotationEditable("APPROVED")).toBe(false);
    expect(isQuotationEditable("PARTIALLY_APPROVED")).toBe(false);
  });

  it("cannot go back from SENT to DRAFT", () => {
    expect(() => assertQuotationTransition("SENT", "DRAFT")).toThrow(
      BusinessRuleError,
    );
  });

  it("allows every non-terminal state to be superseded by a new version", () => {
    for (const from of ["DRAFT", "SENT", "PARTIALLY_APPROVED", "APPROVED", "REJECTED", "EXPIRED"] as const) {
      expect(() => assertQuotationTransition(from, "SUPERSEDED")).not.toThrow();
    }
    expect(() => assertQuotationTransition("SUPERSEDED", "SENT")).toThrow(
      BusinessRuleError,
    );
  });

  it("cannot approve a draft that was never sent", () => {
    expect(() => assertQuotationTransition("DRAFT", "APPROVED")).toThrow(
      BusinessRuleError,
    );
  });
});

describe("quotation item decisions", () => {
  it("accepts per-item decisions from PENDING", () => {
    expect(() => assertQuotationItemTransition("PENDING", "APPROVED")).not.toThrow();
    expect(() => assertQuotationItemTransition("PENDING", "REJECTED")).not.toThrow();
    expect(() =>
      assertQuotationItemTransition("PENDING", "NEEDS_CLARIFICATION"),
    ).not.toThrow();
  });

  it("allows a customer to change their mind before work starts", () => {
    expect(() => assertQuotationItemTransition("REJECTED", "APPROVED")).not.toThrow();
    expect(() => assertQuotationItemTransition("APPROVED", "REJECTED")).not.toThrow();
  });

  it("does not allow an approved item to fall back to PENDING", () => {
    expect(() => assertQuotationItemTransition("APPROVED", "PENDING")).toThrow(
      BusinessRuleError,
    );
  });

  describe("deriveQuotationStatus", () => {
    it("keeps the current status when nothing was decided", () => {
      expect(deriveQuotationStatus(["PENDING", "PENDING"], "SENT")).toBe("SENT");
    });

    it("reports APPROVED only when every item is approved", () => {
      expect(deriveQuotationStatus(["APPROVED", "APPROVED"], "SENT")).toBe(
        "APPROVED",
      );
    });

    it("reports REJECTED only when every item is rejected", () => {
      expect(deriveQuotationStatus(["REJECTED", "REJECTED"], "SENT")).toBe(
        "REJECTED",
      );
    });

    it("reports PARTIALLY_APPROVED for a mixed or incomplete decision", () => {
      expect(deriveQuotationStatus(["APPROVED", "REJECTED"], "SENT")).toBe(
        "PARTIALLY_APPROVED",
      );
      expect(deriveQuotationStatus(["APPROVED", "PENDING"], "SENT")).toBe(
        "PARTIALLY_APPROVED",
      );
      expect(
        deriveQuotationStatus(["APPROVED", "NEEDS_CLARIFICATION"], "SENT"),
      ).toBe("PARTIALLY_APPROVED");
    });

    it("keeps the current status for an empty quotation", () => {
      expect(deriveQuotationStatus([], "DRAFT")).toBe("DRAFT");
    });
  });
});

describe("work task transitions", () => {
  it("runs the normal technician flow", () => {
    expect(() => assertWorkTaskTransition("NOT_STARTED", "IN_PROGRESS")).not.toThrow();
    expect(() => assertWorkTaskTransition("IN_PROGRESS", "PAUSED")).not.toThrow();
    expect(() => assertWorkTaskTransition("PAUSED", "IN_PROGRESS")).not.toThrow();
    expect(() => assertWorkTaskTransition("IN_PROGRESS", "COMPLETED")).not.toThrow();
  });

  it("cannot start a cancelled or completed task", () => {
    expect(() => assertWorkTaskTransition("CANCELLED", "IN_PROGRESS")).toThrow(
      BusinessRuleError,
    );
    expect(() => assertWorkTaskTransition("COMPLETED", "IN_PROGRESS")).toThrow(
      BusinessRuleError,
    );
  });

  it("cannot jump from NOT_STARTED straight to COMPLETED", () => {
    expect(() => assertWorkTaskTransition("NOT_STARTED", "COMPLETED")).toThrow(
      BusinessRuleError,
    );
  });
});

describe("invoice transitions", () => {
  it("issues, collects, then settles", () => {
    expect(() => assertInvoiceTransition("DRAFT", "ISSUED")).not.toThrow();
    expect(() => assertInvoiceTransition("ISSUED", "PARTIALLY_PAID")).not.toThrow();
    expect(() => assertInvoiceTransition("PARTIALLY_PAID", "PAID")).not.toThrow();
  });

  it("cannot take payment on a draft invoice", () => {
    expect(() => assertInvoiceTransition("DRAFT", "PAID")).toThrow(
      BusinessRuleError,
    );
    expect(() => assertInvoiceTransition("DRAFT", "PARTIALLY_PAID")).toThrow(
      BusinessRuleError,
    );
  });

  it("cannot cancel a paid invoice, only refund it", () => {
    expect(() => assertInvoiceTransition("PAID", "CANCELLED")).toThrow(
      BusinessRuleError,
    );
    expect(() => assertInvoiceTransition("PAID", "REFUNDED")).not.toThrow();
  });

  it("treats REFUNDED and CANCELLED as terminal", () => {
    expect(isTerminal(INVOICE_TRANSITIONS, "REFUNDED")).toBe(true);
    expect(isTerminal(INVOICE_TRANSITIONS, "CANCELLED")).toBe(true);
  });

  describe("deriveInvoiceStatus", () => {
    it("stays ISSUED while nothing is collected", () => {
      expect(
        deriveInvoiceStatus({ totalAmount: 1_000_000, paidAmount: 0, current: "ISSUED" }),
      ).toBe("ISSUED");
    });

    it("reports PARTIALLY_PAID for a deposit", () => {
      expect(
        deriveInvoiceStatus({
          totalAmount: 1_000_000,
          paidAmount: 300_000,
          current: "ISSUED",
        }),
      ).toBe("PARTIALLY_PAID");
    });

    it("reports PAID when the balance is settled or overpaid", () => {
      expect(
        deriveInvoiceStatus({
          totalAmount: 1_000_000,
          paidAmount: 1_000_000,
          current: "PARTIALLY_PAID",
        }),
      ).toBe("PAID");
      expect(
        deriveInvoiceStatus({
          totalAmount: 1_000_000,
          paidAmount: 1_200_000,
          current: "PARTIALLY_PAID",
        }),
      ).toBe("PAID");
    });

    it("keeps OVERDUE until money actually arrives", () => {
      expect(
        deriveInvoiceStatus({ totalAmount: 500_000, paidAmount: 0, current: "OVERDUE" }),
      ).toBe("OVERDUE");
      expect(
        deriveInvoiceStatus({
          totalAmount: 500_000,
          paidAmount: 200_000,
          current: "OVERDUE",
        }),
      ).toBe("PARTIALLY_PAID");
    });

    it("never resurrects a draft, cancelled or refunded invoice", () => {
      for (const current of ["DRAFT", "CANCELLED", "REFUNDED"] as const) {
        expect(
          deriveInvoiceStatus({ totalAmount: 100_000, paidAmount: 100_000, current }),
        ).toBe(current);
      }
    });
  });
});

describe("transition table integrity", () => {
  const tables = {
    appointment: APPOINTMENT_TRANSITIONS,
    repairOrder: REPAIR_ORDER_TRANSITIONS,
    quotation: QUOTATION_TRANSITIONS,
    quotationItem: QUOTATION_ITEM_TRANSITIONS,
    workTask: WORK_TASK_TRANSITIONS,
    invoice: INVOICE_TRANSITIONS,
  };

  it("only targets states declared in the same table", () => {
    for (const [name, table] of Object.entries(tables)) {
      const states = new Set(Object.keys(table));
      for (const [from, targets] of Object.entries(table)) {
        for (const to of targets) {
          expect(states.has(to), `${name}: ${from} → ${to}`).toBe(true);
        }
      }
    }
  });

  it("never declares a self-transition", () => {
    for (const [name, table] of Object.entries(tables)) {
      for (const [from, targets] of Object.entries(table)) {
        expect((targets as readonly string[]).includes(from), `${name}: ${from}`).toBe(
          false,
        );
      }
    }
  });

  it("exposes allowed transitions for UI action lists", () => {
    expect(allowedTransitions(APPOINTMENT_TRANSITIONS, "PENDING")).toEqual([
      "CONFIRMED",
      "CANCELLED",
    ]);
    expect(canTransition(APPOINTMENT_TRANSITIONS, "PENDING", "CONFIRMED")).toBe(true);
    expect(canTransition(APPOINTMENT_TRANSITIONS, "PENDING", "COMPLETED")).toBe(false);
  });
});
