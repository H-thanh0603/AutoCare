import { describe, expect, it } from "vitest";

import {
  buildSlotsForDay,
  DEFAULT_APPOINTMENT_SETTINGS,
  garageWallToDate,
} from "@/lib/appointment-settings";

const SETTINGS = {
  ...DEFAULT_APPOINTMENT_SETTINGS,
  appointmentSlotMinutes: 60,
};

// 2026-09-07 is a Monday (garage open 08:00–17:00 by default).
describe("buildSlotsForDay", () => {
  it("builds 9 hourly slots for a working Monday", () => {
    const slots = buildSlotsForDay(SETTINGS, "2026-09-07");
    expect(slots).toHaveLength(9);
    expect(slots[0].start.toISOString()).toBe("2026-09-07T01:00:00.000Z");
    expect(slots[0].end.toISOString()).toBe("2026-09-07T02:00:00.000Z");
    expect(slots[8].end.toISOString()).toBe("2026-09-07T10:00:00.000Z");
  });

  it("returns no slots for Sunday (garage closed)", () => {
    expect(buildSlotsForDay(SETTINGS, "2026-09-06")).toEqual([]);
  });

  it("never lets a slot spill past closing time", () => {
    const slots = buildSlotsForDay(
      { ...SETTINGS, appointmentSlotMinutes: 45 },
      "2026-09-07",
    );
    // 08:00 + 45m * 12 = 17:00 exactly → 12 slots.
    expect(slots).toHaveLength(12);
    const last = slots[slots.length - 1];
    expect(last.end.toISOString()).toBe("2026-09-07T10:00:00.000Z");
  });

  it("rejects invalid dates", () => {
    expect(() => buildSlotsForDay(SETTINGS, "2026-02-30")).toThrow();
    expect(() => buildSlotsForDay(SETTINGS, "not-a-date")).toThrow();
  });
});

describe("garageWallToDate", () => {
  it("converts +07:00 wall time to UTC", () => {
    expect(garageWallToDate(2026, 9, 7, 8 * 60).toISOString()).toBe(
      "2026-09-07T01:00:00.000Z",
    );
  });
});
