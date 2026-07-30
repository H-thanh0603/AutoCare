/**
 * Data access for garages.
 *
 * A garage row is the tenant itself, so the id always comes from the session via
 * `requireGarageScope` / `requireStaffPage` and never from client input.
 */

import type { PrismaClientOrTx } from "@/lib/prisma";
import { prisma } from "@/lib/prisma";
import {
  parseAppointmentSettings,
  type AppointmentSettings,
} from "@/lib/appointment-settings";
import { NotFoundError } from "@/lib/errors";

export interface GarageProfile {
  id: string;
  name: string;
  address: string | null;
  phone: string | null;
  email: string | null;
  appointmentSettings: AppointmentSettings;
}

const profileSelect = {
  id: true,
  name: true,
  address: true,
  phone: true,
  email: true,
  settings: true,
} as const;

export async function findGarageById(
  garageId: string,
  db: PrismaClientOrTx = prisma,
): Promise<GarageProfile | null> {
  const garage = await db.garage.findUnique({
    where: { id: garageId },
    select: profileSelect,
  });
  if (!garage) return null;

  return {
    id: garage.id,
    name: garage.name,
    address: garage.address,
    phone: garage.phone,
    email: garage.email,
    appointmentSettings: parseAppointmentSettings(garage.settings),
  };
}

export async function updateGarageAppointmentSettings(
  garageId: string,
  settings: AppointmentSettings,
  db: PrismaClientOrTx = prisma,
): Promise<void> {
  const garage = await db.garage.findUnique({
    where: { id: garageId },
    select: { settings: true },
  });
  if (!garage) {
    throw new NotFoundError("Không tìm thấy gara.");
  }

  const existingSettings =
    garage.settings && typeof garage.settings === "object" && !Array.isArray(garage.settings)
      ? garage.settings
      : {};
  await db.garage.update({
    where: { id: garageId },
    data: {
      settings: {
        ...existingSettings,
        appointmentSlotMinutes: settings.appointmentSlotMinutes,
        maxConcurrentPerSlot: settings.maxConcurrentPerSlot,
        workingHours: Object.fromEntries(
          Object.entries(settings.workingHours).map(([day, hours]) => [
            day,
            { open: hours.open, close: hours.close },
          ]),
        ),
      },
    },
  });
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


export interface GarageTechnician {
  id: string;
  name: string;
}

/** Active technicians of a garage, for work-task assignment dropdowns. */
export async function listGarageTechnicians(
  garageId: string,
  db: PrismaClientOrTx = prisma,
): Promise<GarageTechnician[]> {
  const members = await db.garageMember.findMany({
    where: { garageId, isActive: true, role: "TECHNICIAN" },
    select: { user: { select: { id: true, name: true } } },
    orderBy: { createdAt: "asc" },
  });
  return members.map((member) => member.user);
}
