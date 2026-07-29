import { describe, expect, it } from "vitest";

import { appointmentInputSchema } from "@/features/appointments/schema";

describe("appointment input", () => {
  it("coerces a valid date and normalizes optional text", () => {
    const input = appointmentInputSchema.parse({
      vehicleId: "vehicle-1",
      scheduledAt: "2031-01-01T02:00:00.000Z",
      serviceRequest: "  Bảo dưỡng định kỳ  ",
      note: "",
    });

    expect(input).toEqual({
      vehicleId: "vehicle-1",
      scheduledAt: new Date("2031-01-01T02:00:00.000Z"),
      serviceRequest: "Bảo dưỡng định kỳ",
      note: null,
    });
  });

  it.each([
    { vehicleId: "", scheduledAt: "2031-01-01T02:00:00.000Z" },
    { vehicleId: "vehicle-1", scheduledAt: "not-a-date" },
    {
      vehicleId: "vehicle-1",
      scheduledAt: "2031-01-01T02:00:00.000Z",
      serviceRequest: "x".repeat(501),
    },
    {
      vehicleId: "vehicle-1",
      scheduledAt: "2031-01-01T02:00:00.000Z",
      note: "🚗".repeat(501),
    },
  ])("rejects invalid booking input %#", (value) => {
    expect(appointmentInputSchema.safeParse(value).success).toBe(false);
  });
});
