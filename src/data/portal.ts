/**
 * Data access for the customer portal.
 *
 * Portal reads are scoped by `userId` taken from the session, never by a
 * customer or vehicle id supplied by the client. A customer may exist in several
 * garages, so one portal account can map to several `Customer` rows; all of them
 * are resolved from the account link and then used as the query scope.
 */

import { NotFoundError } from "@/lib/errors";
import { prisma, type PrismaClientOrTx } from "@/lib/prisma";
import type { AppointmentStatus, RepairOrderStatus } from "@/generated/prisma/enums";

/** The garage-side customer records linked to a portal account. */
export async function listCustomerIdsForUser(
  userId: string,
  db: PrismaClientOrTx = prisma,
): Promise<string[]> {
  const rows = await db.customer.findMany({
    where: { userId, deletedAt: null },
    select: { id: true },
  });
  return rows.map((row) => row.id);
}

export interface PortalVehicleOwner {
  garageId: string;
  customerId: string;
}

/**
 * Current owner lookup for portal writes. The user and ownership predicates are
 * in one query, so a former owner or a vehicle from another account is missing.
 */
export async function getCurrentPortalVehicleOwner(
  userId: string,
  vehicleId: string,
  db: PrismaClientOrTx = prisma,
): Promise<PortalVehicleOwner> {
  const ownership = await db.vehicleOwnership.findFirst({
    where: {
      vehicleId,
      isCurrent: true,
      endedAt: null,
      vehicle: { deletedAt: null },
      customer: { userId, deletedAt: null },
    },
    select: { customerId: true, customer: { select: { garageId: true } } },
  });
  if (!ownership) throw new NotFoundError("Không tìm thấy xe.");
  return { garageId: ownership.customer.garageId, customerId: ownership.customerId };
}

export interface PortalVehicle {
  id: string;
  licensePlate: string;
  brand: string;
  model: string;
  year: number | null;
  currentKm: number | null;
}

/**
 * Vehicles the account currently owns. Ownership that has ended is excluded:
 * the technical history stays with the vehicle, but a former owner must not keep
 * reading it from the portal.
 */
export async function listPortalVehicles(
  userId: string,
  db: PrismaClientOrTx = prisma,
): Promise<PortalVehicle[]> {
  const customerIds = await listCustomerIdsForUser(userId, db);
  if (customerIds.length === 0) return [];

  const ownerships = await db.vehicleOwnership.findMany({
    where: { customerId: { in: customerIds }, isCurrent: true, endedAt: null },
    select: {
      vehicle: {
        select: {
          id: true,
          licensePlate: true,
          brand: true,
          model: true,
          year: true,
          currentKm: true,
          deletedAt: true,
        },
      },
    },
    orderBy: { startedAt: "desc" },
  });

  return ownerships
    .map((row) => row.vehicle)
    .filter((vehicle) => vehicle.deletedAt === null)
    .map(({ deletedAt: _deletedAt, ...vehicle }) => vehicle);
}

export interface PortalAppointmentDetail {
  id: string;
  garageId: string;
  customerId: string;
  vehicleId: string;
  status: AppointmentStatus;
  scheduledAt: Date;
  endsAt: Date;
  serviceRequest: string | null;
  note: string | null;
}

/** Portal appointment lookup scoped to customer records linked to this user. */
export async function getPortalAppointment(
  userId: string,
  appointmentId: string,
  db: PrismaClientOrTx = prisma,
): Promise<PortalAppointmentDetail> {
  const appointment = await db.appointment.findFirst({
    where: { id: appointmentId, customer: { userId, deletedAt: null } },
    select: {
      id: true,
      garageId: true,
      customerId: true,
      vehicleId: true,
      status: true,
      scheduledAt: true,
      endsAt: true,
      serviceRequest: true,
      note: true,
    },
  });
  if (!appointment) throw new NotFoundError("Không tìm thấy lịch hẹn.");
  return appointment;
}

export interface PortalAppointment {
  id: string;
  status: AppointmentStatus;
  scheduledAt: Date;
  serviceRequest: string | null;
  garage: { id: string; name: string };
  vehicle: { id: string; licensePlate: string };
}

export async function listPortalAppointments(
  userId: string,
  options: { take?: number } = {},
  db: PrismaClientOrTx = prisma,
): Promise<PortalAppointment[]> {
  const customerIds = await listCustomerIdsForUser(userId, db);
  if (customerIds.length === 0) return [];

  return db.appointment.findMany({
    where: { customerId: { in: customerIds } },
    select: {
      id: true,
      status: true,
      scheduledAt: true,
      serviceRequest: true,
      garage: { select: { id: true, name: true } },
      vehicle: { select: { id: true, licensePlate: true } },
    },
    orderBy: { scheduledAt: "desc" },
    take: options.take ?? 10,
  });
}

export interface PortalRepairOrder {
  id: string;
  code: string;
  status: RepairOrderStatus;
  receivedAt: Date;
  deliveredAt: Date | null;
  garage: { id: string; name: string };
  vehicle: { id: string; licensePlate: string; brand: string; model: string };
}

export async function listPortalRepairOrders(
  userId: string,
  options: { take?: number } = {},
  db: PrismaClientOrTx = prisma,
): Promise<PortalRepairOrder[]> {
  const customerIds = await listCustomerIdsForUser(userId, db);
  if (customerIds.length === 0) return [];

  return db.repairOrder.findMany({
    where: { customerId: { in: customerIds } },
    select: {
      id: true,
      code: true,
      status: true,
      receivedAt: true,
      deliveredAt: true,
      garage: { select: { id: true, name: true } },
      vehicle: { select: { id: true, licensePlate: true, brand: true, model: true } },
    },
    orderBy: { receivedAt: "desc" },
    take: options.take ?? 10,
  });
}

export async function getPortalQuotation(
  userId: string,
  quotationId: string,
  db: PrismaClientOrTx = prisma,
) {
  const quotation = await db.quotation.findFirst({
    where: {
      id: quotationId,
      repairOrder: {
        customer: { userId, deletedAt: null },
        vehicle: {
          ownerships: {
            some: { isCurrent: true, endedAt: null, customer: { userId, deletedAt: null } },
          },
        },
      },
    },
    select: {
      id: true,
      versionNo: true,
      status: true,
      note: true,
      validUntil: true,
      totalAmount: true,
      items: {
        select: {
          id: true,
          type: true,
          description: true,
          quantity: true,
          unitPrice: true,
          discountAmount: true,
          totalAmount: true,
          status: true,
          customerNote: true,
        },
        orderBy: { sortOrder: "asc" },
      },
      repairOrder: {
        select: {
          id: true,
          code: true,
          garage: { select: { name: true } },
          vehicle: { select: { licensePlate: true, brand: true, model: true } },
        },
      },
    },
  });
  if (!quotation) throw new NotFoundError("Không tìm thấy báo giá.");
  return quotation;
}
