import { describe, expect, it } from "vitest";
import { assertWorkTaskTransition } from "@/lib/transitions";
import { BusinessRuleError } from "@/lib/errors";

describe("WorkTask state machine", () => {
  it("allows valid forward transitions", () => {
    expect(() => assertWorkTaskTransition("NOT_STARTED", "IN_PROGRESS")).not.toThrow();
    expect(() => assertWorkTaskTransition("IN_PROGRESS", "QUALITY_CHECK")).not.toThrow();
    expect(() => assertWorkTaskTransition("QUALITY_CHECK", "COMPLETED")).not.toThrow();
    expect(() => assertWorkTaskTransition("IN_PROGRESS", "WAITING_PARTS")).not.toThrow();
    expect(() => assertWorkTaskTransition("WAITING_PARTS", "IN_PROGRESS")).not.toThrow();
    expect(() => assertWorkTaskTransition("IN_PROGRESS", "PAUSED")).not.toThrow();
    expect(() => assertWorkTaskTransition("PAUSED", "IN_PROGRESS")).not.toThrow();
    expect(() => assertWorkTaskTransition("IN_PROGRESS", "WAITING_APPROVAL")).not.toThrow();
    expect(() => assertWorkTaskTransition("WAITING_APPROVAL", "IN_PROGRESS")).not.toThrow();
  });

  it("blocks illegal transitions from terminal states", () => {
    expect(() => assertWorkTaskTransition("COMPLETED", "IN_PROGRESS")).toThrow(BusinessRuleError);
    expect(() => assertWorkTaskTransition("CANCELLED", "IN_PROGRESS")).toThrow(BusinessRuleError);
    expect(() => assertWorkTaskTransition("NOT_STARTED", "COMPLETED")).toThrow(BusinessRuleError);
  });
});
