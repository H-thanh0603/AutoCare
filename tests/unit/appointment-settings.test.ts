import { describe, expect, it } from "vitest";

import { BusinessRuleError } from "@/lib/errors";
import {
  DEFAULT_APPOINTMENT_SETTINGS,
  assertAppointmentSlot,
  parseAppointmentSettings,
} from "@/lib/appointment-settings";

describe("appointment settings", () => {
  it("uses defaults for null or malformed persisted settings", () => {
    expect(parseAppointmentSettings(null)).toEqual(DEFAULT_APPOINTMENT_SETTINGS);
    expect(parseAppointmentSettings({ appointmentSlotMinutes: "60" })).toEqual(
      DEFAULT_APPOINTMENT_SETTINGS,
    );
  });

  it("parses valid custom slot and working hours", () => {
    expect(
      parseAppointmentSettings({
        appointmentSlotMinutes: 30,
        workingHours: { 0: { open: "09:00", close: "12:00" } },
      }),
    ).toEqual({
      appointmentSlotMinutes: 30,
      maxConcurrentPerSlot: 0,
      workingHours: { 0: { open: "09:00", close: "12:00" } },
    });
  });

  it("derives end time in Asia/Ho_Chi_Minh", () => {
    const scheduledAt = new Date("2026-08-03T01:00:00.000Z");

    expect(assertAppointmentSlot(DEFAULT_APPOINTMENT_SETTINGS, scheduledAt)).toEqual(
      new Date("2026-08-03T02:00:00.000Z"),
    );
  });

  it("rejects a closed day", () => {
    const sundayAt9 = new Date("2026-08-02T02:00:00.000Z");

    expect(() => assertAppointmentSlot(DEFAULT_APPOINTMENT_SETTINGS, sundayAt9)).toThrow(
      "Gara không làm việc vào thời điểm đã chọn.",
    );
  });

  it("rejects invalid, out-of-hours, unaligned, and overrun slots", () => {
    expect(() =>
      assertAppointmentSlot(DEFAULT_APPOINTMENT_SETTINGS, new Date("invalid")),
    ).toThrow(BusinessRuleError);
    expect(() =>
      assertAppointmentSlot(
        DEFAULT_APPOINTMENT_SETTINGS,
        new Date("2026-08-03T00:30:00.000Z"),
      ),
    ).toThrow(BusinessRuleError);
    expect(() =>
      assertAppointmentSlot(
        DEFAULT_APPOINTMENT_SETTINGS,
        new Date("2026-08-03T01:30:00.000Z"),
      ),
    ).toThrow(BusinessRuleError);
    expect(() =>
      assertAppointmentSlot(
        DEFAULT_APPOINTMENT_SETTINGS,
        new Date("2026-08-03T09:30:00.000Z"),
      ),
    ).toThrow(BusinessRuleError);
  });
});
