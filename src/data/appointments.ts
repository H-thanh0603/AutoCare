import type { AppointmentStatus } from "@/generated/prisma/enums";
import { NotFoundError } from "@/lib/errors";
import { prisma, type PrismaClientOrTx } from "@/lib/prisma";

export interface GarageAppointment {
  id: string;
  garageId: string;
  customerId: string;
  vehicleId: string;
  status: AppointmentStatus;
  scheduledAt: Date;
  endsAt: Date;
  serviceRequest: string | null;
  note: string | null;
  createdById: string | null;
  confirmedById: string | null;
  cancelledById: string | null;
  cancelReason: string | null;
}

const appointmentSelect = {
  id: true,
  garageId: true,
  customerId: true,
  vehicleId: true,
  status: true,
  scheduledAt: true,
  endsAt: true,
  serviceRequest: true,
  note: true,
  createdById: true,
  confirmedById: true,
  cancelledById: true,
  cancelReason: true,
} as const;

export async function getGarageAppointment(
  garageId: string,
  id: string,
  db: PrismaClientOrTx = prisma,
): Promise<GarageAppointment> {
  const appointment = await db.appointment.findFirst({
    where: { id, garageId },
    select: appointmentSelect,
  });
  if (!appointment) throw new NotFoundError("Không tìm thấy lịch hẹn.");
  return appointment;
}

export async function listGarageAppointments(
  garageId: string,
  range: { from: Date; to: Date },
  status?: AppointmentStatus,
  db: PrismaClientOrTx = prisma,
): Promise<GarageAppointment[]> {
  return db.appointment.findMany({
    where: {
      garageId,
      scheduledAt: { gte: range.from, lt: range.to },
      ...(status ? { status } : {}),
    },
    select: appointmentSelect,
    orderBy: { scheduledAt: "asc" },
  });
}

export async function createAppointment(
  input: {
    garageId: string;
    customerId: string;
    vehicleId: string;
    scheduledAt: Date;
    endsAt: Date;
    serviceRequest: string | null;
    note: string | null;
    createdById: string;
  },
  db: PrismaClientOrTx = prisma,
): Promise<{ id: string }> {
  return db.appointment.create({ data: input, select: { id: true } });
}

export async function updateAppointmentStatus(
  id: string,
  status: AppointmentStatus,
  input: { confirmedById?: string; cancelledById?: string; cancelReason?: string },
  db: PrismaClientOrTx = prisma,
): Promise<void> {
  await db.appointment.update({
    where: { id },
    data: { status, ...input },
  });
}
