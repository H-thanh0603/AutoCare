/**
 * Data access for vehicles.
 *
 * A vehicle is not owned by a garage: its technical history follows the vehicle
 * even when the owner changes, and the same car may be serviced by several
 * garages. So garage scoping goes through the current owner
 * (`VehicleOwnership -> Customer.garageId`) rather than a `garageId` column.
 * The scope id still comes from the session, never from client input.
 */

import { NotFoundError } from "@/lib/errors";
import { prisma, type PrismaClientOrTx } from "@/lib/prisma";
import type { RecordSource, TimelineEventType } from "@/generated/prisma/enums";

export interface VehicleListItem {
  id: string;
  licensePlate: string;
  vin: string | null;
  brand: string;
  model: string;
  year: number | null;
  currentKm: number | null;
  owner: { id: string; name: string; phone: string } | null;
}

const ownershipSelect = {
  vehicle: {
    select: {
      id: true,
      licensePlate: true,
      vin: true,
      brand: true,
      model: true,
      year: true,
      currentKm: true,
      deletedAt: true,
    },
  },
  customer: { select: { id: true, name: true, phone: true } },
} as const;

export async function listVehicles(
  garageId: string,
  options: { search?: string; take?: number } = {},
  db: PrismaClientOrTx = prisma,
): Promise<VehicleListItem[]> {
  const { search, take = 50 } = options;
  const rows = await db.vehicleOwnership.findMany({
    where: {
      isCurrent: true,
      endedAt: null,
      customer: { garageId, deletedAt: null },
      vehicle: {
        deletedAt: null,
        ...(search
          ? {
              OR: [
                { licensePlate: { contains: search, mode: "insensitive" as const } },
                { vin: { contains: search, mode: "insensitive" as const } },
              ],
            }
          : {}),
      },
    },
    select: ownershipSelect,
    orderBy: { startedAt: "desc" },
    take,
  });

  return rows.map(({ vehicle, customer }) => {
    const { deletedAt: _deletedAt, ...rest } = vehicle;
    return { ...rest, owner: customer };
  });
}

/**
 * Returns null unless the vehicle is currently owned by a customer of this
 * garage. A vehicle serviced only by another garage reads as missing.
 */
export async function findVehicleById(
  garageId: string,
  id: string,
  db: PrismaClientOrTx = prisma,
): Promise<VehicleListItem | null> {
  const row = await db.vehicleOwnership.findFirst({
    where: {
      isCurrent: true,
      endedAt: null,
      vehicleId: id,
      vehicle: { deletedAt: null },
      customer: { garageId, deletedAt: null },
    },
    select: ownershipSelect,
  });
  if (!row) return null;
  const { deletedAt: _deletedAt, ...vehicle } = row.vehicle;
  return { ...vehicle, owner: row.customer };
}

export async function getVehicleById(
  garageId: string,
  id: string,
  db: PrismaClientOrTx = prisma,
): Promise<VehicleListItem> {
  const vehicle = await findVehicleById(garageId, id, db);
  if (!vehicle) {
    throw new NotFoundError("Không tìm thấy xe.");
  }
  return vehicle;
}

/**
 * Confirms the vehicle is in this garage's scope and returns its id.
 *
 * Write paths call this before mutating so a foreign vehicle fails with the
 * same `NotFoundError` a nonexistent one produces.
 */
export async function assertVehicleInGarage(
  garageId: string,
  id: string,
  db: PrismaClientOrTx = prisma,
): Promise<void> {
  const ownership = await db.vehicleOwnership.findFirst({
    where: {
      isCurrent: true,
      endedAt: null,
      vehicleId: id,
      vehicle: { deletedAt: null },
      customer: { garageId, deletedAt: null },
    },
    select: { id: true },
  });
  if (!ownership) {
    throw new NotFoundError("Không tìm thấy xe.");
  }
}

export interface MileageEntry {
  id: string;
  mileageKm: number;
  recordedAt: Date;
  source: RecordSource;
  note: string | null;
  /** Set when a manager recorded a decreasing reading. */
  overrideReason: string | null;
}

export interface OwnershipEntry {
  id: string;
  startedAt: Date;
  endedAt: Date | null;
  isCurrent: boolean;
  note: string | null;
  /** Former owners outside this garage are deliberately anonymized. */
  customer: { id: string; name: string; phone: string | null };
}

export interface TimelineEntry {
  id: string;
  type: TimelineEventType;
  source: RecordSource;
  title: string;
  description: string | null;
  occurredAt: Date;
  mileageKm: number | null;
  repairOrderId: string | null;
}

export interface VehicleDetail extends VehicleListItem {
  color: string | null;
  engineNumber: string | null;
  createdAt: Date;
  mileageLogs: MileageEntry[];
  ownerships: OwnershipEntry[];
  timeline: TimelineEntry[];
}

/**
 * Full record for the vehicle detail page.
 *
 * Ownership history and the timeline are returned in full even though earlier
 * owners belong to no garage scope: the technical history follows the vehicle,
 * which is the point of the health record. Only the *current* ownership decides
 * whether this garage may read the vehicle at all.
 */
export async function getVehicleDetail(
  garageId: string,
  id: string,
  options: { timelineTake?: number; mileageTake?: number } = {},
  db: PrismaClientOrTx = prisma,
): Promise<VehicleDetail> {
  const { timelineTake = 50, mileageTake = 20 } = options;
  await assertVehicleInGarage(garageId, id, db);

  const vehicle = await db.vehicle.findFirst({
    where: { id, deletedAt: null },
    select: {
      id: true,
      licensePlate: true,
      vin: true,
      brand: true,
      model: true,
      year: true,
      color: true,
      engineNumber: true,
      currentKm: true,
      createdAt: true,
      mileageLogs: {
        select: {
          id: true,
          mileageKm: true,
          recordedAt: true,
          source: true,
          note: true,
          overrideReason: true,
        },
        orderBy: { recordedAt: "desc" },
        take: mileageTake,
      },
      ownerships: {
        select: {
          id: true,
          startedAt: true,
          endedAt: true,
          isCurrent: true,
          note: true,
          customer: { select: { id: true, name: true, phone: true, garageId: true } },
        },
        orderBy: { startedAt: "desc" },
      },
      timelineEvents: {
        select: {
          id: true,
          type: true,
          source: true,
          title: true,
          description: true,
          occurredAt: true,
          mileageKm: true,
          repairOrderId: true,
        },
        orderBy: { occurredAt: "desc" },
        take: timelineTake,
      },
    },
  });
  if (!vehicle) {
    throw new NotFoundError("Không tìm thấy xe.");
  }

  const { timelineEvents, ownerships, ...rest } = vehicle;
  const currentOwner = ownerships.find((o) => o.isCurrent && o.endedAt === null);
  return {
    ...rest,
    owner: currentOwner
      ? {
          id: currentOwner.customer.id,
          name: currentOwner.customer.name,
          phone: currentOwner.customer.phone,
        }
      : null,
    mileageLogs: vehicle.mileageLogs,
    ownerships: ownerships.map(({ customer, ...ownership }) => ({
      ...ownership,
      customer:
        customer.garageId === garageId
          ? { id: customer.id, name: customer.name, phone: customer.phone }
          : { id: "", name: "Chủ sở hữu trước", phone: null },
    })),
    timeline: timelineEvents,
  };
}

/** Looks up a VIN across all garages: the column is globally unique. */
export async function findVehicleByVin(
  vin: string,
  db: PrismaClientOrTx = prisma,
): Promise<{ id: string; deletedAt: Date | null } | null> {
  return db.vehicle.findUnique({
    where: { vin },
    select: { id: true, deletedAt: true },
  });
}

export interface VehicleWriteInput {
  licensePlate: string;
  vin: string | null;
  brand: string;
  model: string;
  year: number | null;
  color: string | null;
  engineNumber: string | null;
}

export async function createVehicle(
  input: VehicleWriteInput & { currentKm?: number | null },
  db: PrismaClientOrTx = prisma,
): Promise<{ id: string }> {
  return db.vehicle.create({ data: input, select: { id: true } });
}

export async function updateVehicle(
  id: string,
  input: VehicleWriteInput,
  db: PrismaClientOrTx = prisma,
): Promise<void> {
  const { count } = await db.vehicle.updateMany({
    where: { id, deletedAt: null },
    data: input,
  });
  if (count === 0) {
    throw new NotFoundError("Không tìm thấy xe.");
  }
}

/**
 * Soft-deletes a vehicle. History rows are kept: a vehicle removed from one
 * garage's list has not stopped existing, and its record must survive an
 * ownership change.
 */
export async function softDeleteVehicle(
  id: string,
  db: PrismaClientOrTx = prisma,
): Promise<void> {
  const { count } = await db.vehicle.updateMany({
    where: { id, deletedAt: null },
    data: { deletedAt: new Date() },
  });
  if (count === 0) {
    throw new NotFoundError("Không tìm thấy xe.");
  }
}

export async function createOwnership(
  input: { vehicleId: string; customerId: string; note?: string | null },
  db: PrismaClientOrTx = prisma,
): Promise<void> {
  await db.vehicleOwnership.create({
    data: {
      vehicleId: input.vehicleId,
      customerId: input.customerId,
      note: input.note ?? null,
      isCurrent: true,
    },
  });
}

/** Closes every open ownership row for a vehicle. Returns how many were closed. */
export async function closeCurrentOwnerships(
  vehicleId: string,
  endedAt: Date,
  db: PrismaClientOrTx = prisma,
): Promise<number> {
  const { count } = await db.vehicleOwnership.updateMany({
    where: { vehicleId, isCurrent: true, endedAt: null },
    data: { isCurrent: false, endedAt },
  });
  return count;
}

export async function findCurrentOwnership(
  vehicleId: string,
  db: PrismaClientOrTx = prisma,
): Promise<{ id: string; customerId: string } | null> {
  return db.vehicleOwnership.findFirst({
    where: { vehicleId, isCurrent: true, endedAt: null },
    select: { id: true, customerId: true },
  });
}

export async function countOpenRepairOrdersForVehicle(
  garageId: string,
  vehicleId: string,
  db: PrismaClientOrTx = prisma,
): Promise<number> {
  return db.repairOrder.count({
    where: {
      garageId,
      vehicleId,
      status: {
        in: [
          "RECEIVED",
          "INSPECTING",
          "WAITING_CUSTOMER_APPROVAL",
          "WAITING_PARTS",
          "IN_PROGRESS",
          "QUALITY_CHECK",
          "READY_FOR_DELIVERY",
        ],
      },
    },
  });
}

/** Highest odometer reading on record, or null when the vehicle has none. */
export async function findLatestMileage(
  vehicleId: string,
  db: PrismaClientOrTx = prisma,
): Promise<number | null> {
  const row = await db.mileageLog.findFirst({
    where: { vehicleId },
    select: { mileageKm: true },
    orderBy: { mileageKm: "desc" },
  });
  return row?.mileageKm ?? null;
}

export async function createMileageLog(
  input: {
    vehicleId: string;
    garageId: string;
    mileageKm: number;
    note?: string | null;
    overrideReason?: string | null;
    createdById?: string | null;
  },
  db: PrismaClientOrTx = prisma,
): Promise<void> {
  await db.mileageLog.create({
    data: {
      vehicleId: input.vehicleId,
      garageId: input.garageId,
      mileageKm: input.mileageKm,
      note: input.note ?? null,
      overrideReason: input.overrideReason ?? null,
      createdById: input.createdById ?? null,
    },
  });
}

export async function setCurrentKm(
  vehicleId: string,
  currentKm: number,
  db: PrismaClientOrTx = prisma,
): Promise<void> {
  await db.vehicle.update({
    where: { id: vehicleId },
    data: { currentKm },
  });
}

export async function createTimelineEvent(
  input: {
    vehicleId: string;
    garageId: string | null;
    type: TimelineEventType;
    title: string;
    description?: string | null;
    occurredAt?: Date;
    mileageKm?: number | null;
    createdById?: string | null;
  },
  db: PrismaClientOrTx = prisma,
): Promise<void> {
  await db.vehicleTimelineEvent.create({
    data: {
      vehicleId: input.vehicleId,
      garageId: input.garageId,
      type: input.type,
      title: input.title,
      description: input.description ?? null,
      occurredAt: input.occurredAt ?? new Date(),
      mileageKm: input.mileageKm ?? null,
      createdById: input.createdById ?? null,
    },
  });
}
