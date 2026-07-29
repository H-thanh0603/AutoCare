import { describe, expect, it } from "vitest";
import {
  calculateNextServiceDue,
  maskLicensePlate,
  sanitizePublicVehicleHealth,
} from "@/features/vehicle-health/domain";

describe("Vehicle Health Domain & Privacy Protections", () => {
  it("masks license plate for public view", () => {
    expect(maskLicensePlate("51H-12345")).toBe("51H***45");
    expect(maskLicensePlate("30A-9999")).toBe("30A***99");
    expect(maskLicensePlate("12")).toBe("***");
  });

  it("calculates next service due date and mileage", () => {
    const baseDate = new Date("2026-07-29T10:00:00Z");
    const { nextDueDate, nextDueMileageKm } = calculateNextServiceDue(45000, baseDate);

    expect(nextDueMileageKm).toBe(50000);
    expect(nextDueDate.toISOString().slice(0, 10)).toBe("2027-01-25"); // +180 days
  });

  it("strips customer PII from public vehicle health DTO (Rule 17)", () => {
    const rawData = {
      vehicle: {
        brand: "Toyota",
        model: "Camry",
        year: 2022,
        color: "Trắng",
        currentKm: 35000,
        licensePlate: "51K-67890",
        // Secret / PII properties that must NOT leak:
        ownerName: "Nguyen Van A",
        ownerPhone: "0912345678",
        ownerAddress: "123 Le Loi, Q1",
      },
      timelineEvents: [
        {
          id: "evt-1",
          type: "REPAIR",
          title: "Sửa phanh",
          description: "Thay má phanh",
          occurredAt: new Date("2026-07-01"),
          mileageKm: 30000,
          source: "VERIFIED_GARAGE_RECORD" as const,
        },
      ],
      maintenanceRecords: [
        {
          id: "maint-1",
          title: "Bảo dưỡng 30k km",
          description: "Thay nhớt & lọc",
          performedAt: new Date("2026-07-01"),
          mileageKm: 30000,
          nextDueDate: new Date("2026-12-28"),
          nextDueMileageKm: 35000,
        },
      ],
      systemStatuses: [],
      warranties: [],
    };

    const publicDTO = sanitizePublicVehicleHealth(rawData);

    expect(publicDTO.vehicle.licensePlateMasked).toBe("51K***90");
    expect(publicDTO.vehicle.brand).toBe("Toyota");
    expect(publicDTO.vehicle.model).toBe("Camry");
    // Assert customer PII fields do NOT exist on returned object
    expect((publicDTO as unknown as Record<string, unknown>).ownerName).toBeUndefined();
    expect((publicDTO as unknown as Record<string, unknown>).ownerPhone).toBeUndefined();
    expect((publicDTO as unknown as Record<string, unknown>).ownerAddress).toBeUndefined();
  });
});
