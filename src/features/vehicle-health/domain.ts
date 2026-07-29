import { RecordSource, SystemCondition, VehicleSystem } from "@/generated/prisma/enums";

export interface PublicVehicleHealthDTO {
  vehicle: {
    brand: string;
    model: string;
    year: number | null;
    color: string | null;
    currentKm: number | null;
    licensePlateMasked: string;
  };
  timelineEvents: Array<{
    id: string;
    type: string;
    title: string;
    description: string | null;
    occurredAt: Date;
    mileageKm: number | null;
    source: RecordSource;
  }>;
  maintenanceRecords: Array<{
    id: string;
    title: string;
    description: string | null;
    performedAt: Date;
    mileageKm: number | null;
    nextDueDate: Date | null;
    nextDueMileageKm: number | null;
  }>;
  systemStatuses: Array<{
    system: VehicleSystem;
    condition: SystemCondition;
    note: string | null;
    updatedAt: Date;
  }>;
  warranties: Array<{
    name: string;
    terms: string | null;
    startsAt: Date;
    expiresAt: Date | null;
    mileageLimitKm: number | null;
    isActive: boolean;
  }>;
}

export function maskLicensePlate(plate: string): string {
  if (!plate || plate.length < 4) return "***";
  const len = plate.length;
  return `${plate.slice(0, 3)}***${plate.slice(len - 2)}`;
}

export function calculateNextServiceDue(currentKm: number | null, performedAt: Date = new Date()) {
  const DEFAULT_INTERVAL_DAYS = 180; // 6 months
  const DEFAULT_INTERVAL_KM = 5000;

  const nextDueDate = new Date(performedAt.getTime() + DEFAULT_INTERVAL_DAYS * 86400 * 1000);
  const nextDueMileageKm = currentKm !== null ? currentKm + DEFAULT_INTERVAL_KM : null;

  return { nextDueDate, nextDueMileageKm };
}

export function sanitizePublicVehicleHealth(data: {
  vehicle: {
    brand: string;
    model: string;
    year: number | null;
    color: string | null;
    currentKm: number | null;
    licensePlate: string;
  };
  timelineEvents: Array<{
    id: string;
    type: string;
    title: string;
    description: string | null;
    occurredAt: Date;
    mileageKm: number | null;
    source: RecordSource;
  }>;
  maintenanceRecords: Array<{
    id: string;
    title: string;
    description: string | null;
    performedAt: Date;
    mileageKm: number | null;
    nextDueDate: Date | null;
    nextDueMileageKm: number | null;
  }>;
  systemStatuses: Array<{
    system: VehicleSystem;
    condition: SystemCondition;
    note: string | null;
    updatedAt: Date;
  }>;
  warranties: Array<{
    name: string;
    terms: string | null;
    startsAt: Date;
    expiresAt: Date | null;
    mileageLimitKm: number | null;
    isActive: boolean;
  }>;
}): PublicVehicleHealthDTO {
  return {
    vehicle: {
      brand: data.vehicle.brand,
      model: data.vehicle.model,
      year: data.vehicle.year,
      color: data.vehicle.color,
      currentKm: data.vehicle.currentKm,
      licensePlateMasked: maskLicensePlate(data.vehicle.licensePlate),
    },
    timelineEvents: data.timelineEvents,
    maintenanceRecords: data.maintenanceRecords,
    systemStatuses: data.systemStatuses,
    warranties: data.warranties,
  };
}
