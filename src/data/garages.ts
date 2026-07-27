/**
 * Data access for garages.
 *
 * A garage row is the tenant itself, so the id always comes from the session via
 * `requireGarageScope` / `requireStaffPage` and never from client input.
 */

import type { PrismaClientOrTx } from "@/lib/prisma";
import { prisma } from "@/lib/prisma";
import { NotFoundError } from "@/lib/errors";

export interface GarageProfile {
  id: string;
  name: string;
  address: string | null;
  phone: string | null;
  email: string | null;
}

const profileSelect = {
  id: true,
  name: true,
  address: true,
  phone: true,
  email: true,
} as const;

export async function findGarageById(
  garageId: string,
  db: PrismaClientOrTx = prisma,
): Promise<GarageProfile | null> {
  return db.garage.findUnique({ where: { id: garageId }, select: profileSelect });
}

export async function getGarageById(
  garageId: string,
  db: PrismaClientOrTx = prisma,
): Promise<GarageProfile> {
  const garage = await findGarageById(garageId, db);
  if (!garage) {
    throw new NotFoundError("Không tìm thấy gara.");
  }
  return garage;
}
