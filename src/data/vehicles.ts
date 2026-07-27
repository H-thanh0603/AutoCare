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
