import { describe, expect, it, vi } from "vitest";

import { DEFAULT_APPOINTMENT_SETTINGS } from "@/lib/appointment-settings";
import { findGarageById, updateGarageAppointmentSettings } from "@/data/garages";

describe("garage appointment settings", () => {
  it("exposes parsed settings on garage profile", async () => {
    const db = {
      garage: {
        findUnique: vi.fn().mockResolvedValue({
          id: "garage-id",
          name: "Gara",
          address: null,
          phone: null,
          email: null,
          settings: { appointmentSlotMinutes: 30, workingHours: {} },
        }),
      },
    };

    await expect(findGarageById("garage-id", db as never)).resolves.toEqual({
      id: "garage-id",
      name: "Gara",
      address: null,
      phone: null,
      email: null,
      appointmentSettings: { appointmentSlotMinutes: 30, workingHours: {} },
    });
  });

  it("keeps unrelated garage settings keys", async () => {
    const update = vi.fn().mockResolvedValue({});
    const db = {
      garage: {
        findUnique: vi.fn().mockResolvedValue({
          settings: { allowNegativeStock: false, taxPercent: 8, custom: "keep" },
        }),
        update,
      },
    };

    await updateGarageAppointmentSettings("garage-id", DEFAULT_APPOINTMENT_SETTINGS, db as never);

    expect(update).toHaveBeenCalledWith({
      where: { id: "garage-id" },
      data: {
        settings: {
          allowNegativeStock: false,
          taxPercent: 8,
          custom: "keep",
          appointmentSlotMinutes: 60,
          workingHours: DEFAULT_APPOINTMENT_SETTINGS.workingHours,
        },
      },
    });
  });

  it("starts from empty settings when garage settings is malformed", async () => {
    const update = vi.fn().mockResolvedValue({});
    const db = {
      garage: {
        findUnique: vi.fn().mockResolvedValue({ settings: null }),
        update,
      },
    };

    await updateGarageAppointmentSettings("garage-id", DEFAULT_APPOINTMENT_SETTINGS, db as never);

    expect(update).toHaveBeenCalledWith({
      where: { id: "garage-id" },
      data: {
        settings: {
          appointmentSlotMinutes: 60,
          workingHours: DEFAULT_APPOINTMENT_SETTINGS.workingHours,
        },
      },
    });
  });
});
