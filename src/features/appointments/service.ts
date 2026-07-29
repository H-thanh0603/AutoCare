import { Prisma } from "@/generated/prisma/client";
import {
  createAppointment,
  getGarageAppointment,
  updateAppointmentStatus,
} from "@/data/appointments";
import {
  getCurrentPortalVehicleOwner,
  getPortalAppointment,
} from "@/data/portal";
import type { AppointmentInput } from "@/features/appointments/schema";
import { assertAppointmentSlot } from "@/lib/appointment-settings";
import { AUDIT_ACTIONS, recordAudit } from "@/lib/audit";
import { getGarageById } from "@/data/garages";
import { BusinessRuleError, NotFoundError } from "@/lib/errors";
import { prisma, type PrismaTx } from "@/lib/prisma";
import { assertAppointmentTransition } from "@/lib/transitions";

const RESCHEDULE_CANCEL_REASON = "Đổi lịch hẹn";

function isExclusionViolation(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code: unknown }).code === "23P01"
  );
}

async function getGarageAppointmentSettings(
  garageId: string,
  db: PrismaTx | typeof prisma = prisma,
) {
  return (await getGarageById(garageId, db)).appointmentSettings;
}

async function lockGarageAppointment(
  tx: PrismaTx,
  garageId: string,
  appointmentId: string,
): Promise<void> {
  const rows = await tx.$queryRaw<{ id: string }[]>(Prisma.sql`
    SELECT "id"
    FROM "appointments"
    WHERE "id" = ${appointmentId} AND "garageId" = ${garageId}
    FOR UPDATE
  `);
  if (rows.length === 0) throw new NotFoundError("Không tìm thấy lịch hẹn.");
}

async function lockPortalAppointment(
  tx: PrismaTx,
  userId: string,
  appointmentId: string,
): Promise<void> {
  const rows = await tx.$queryRaw<{ id: string }[]>(Prisma.sql`
    SELECT a."id"
    FROM "appointments" AS a
    INNER JOIN "customers" AS c ON c."id" = a."customerId"
    WHERE a."id" = ${appointmentId}
      AND c."userId" = ${userId}
      AND c."deletedAt" IS NULL
    FOR UPDATE OF a
  `);
  if (rows.length === 0) throw new NotFoundError("Không tìm thấy lịch hẹn.");
}

async function createPortalAppointment(
  userId: string,
  input: AppointmentInput,
  tx: PrismaTx | undefined = undefined,
): Promise<{ id: string }> {
  const db = tx ?? prisma;
  const owner = await getCurrentPortalVehicleOwner(userId, input.vehicleId, db);
  const settings = await getGarageAppointmentSettings(owner.garageId, db);
  const endsAt = assertAppointmentSlot(settings, input.scheduledAt);
  try {
    return await createAppointment(
      {
        garageId: owner.garageId,
        customerId: owner.customerId,
        vehicleId: input.vehicleId,
        scheduledAt: input.scheduledAt,
        endsAt,
        serviceRequest: input.serviceRequest,
        note: input.note,
        createdById: userId,
      },
      db,
    );
  } catch (error) {
    if (isExclusionViolation(error)) {
      throw new BusinessRuleError("Xe đã có lịch hẹn trùng thời gian.");
    }
    throw error;
  }
}

export async function createCustomerAppointment(
  userId: string,
  input: AppointmentInput,
): Promise<{ id: string }> {
  return createPortalAppointment(userId, input);
}

export async function confirmAppointment(
  garageId: string,
  actorId: string,
  appointmentId: string,
): Promise<void> {
  await prisma.$transaction(async (tx) => {
    await lockGarageAppointment(tx, garageId, appointmentId);
    const appointment = await getGarageAppointment(garageId, appointmentId, tx);
    assertAppointmentTransition(appointment.status, "CONFIRMED");
    await updateAppointmentStatus(appointment.id, "CONFIRMED", { confirmedById: actorId }, tx);
    await recordAudit(
      {
        action: AUDIT_ACTIONS.APPOINTMENT_STATUS_CHANGED,
        entityType: "Appointment",
        entityId: appointment.id,
        garageId,
        actorUserId: actorId,
        before: { status: appointment.status },
        after: { status: "CONFIRMED" },
      },
      tx,
    );
  });
}

export async function markAppointmentNoShow(
  garageId: string,
  actorId: string,
  appointmentId: string,
): Promise<void> {
  await prisma.$transaction(async (tx) => {
    await lockGarageAppointment(tx, garageId, appointmentId);
    const appointment = await getGarageAppointment(garageId, appointmentId, tx);
    assertAppointmentTransition(appointment.status, "NO_SHOW");
    await updateAppointmentStatus(appointment.id, "NO_SHOW", {}, tx);
    await recordAudit(
      {
        action: AUDIT_ACTIONS.APPOINTMENT_STATUS_CHANGED,
        entityType: "Appointment",
        entityId: appointment.id,
        garageId,
        actorUserId: actorId,
        before: { status: appointment.status },
        after: { status: "NO_SHOW" },
      },
      tx,
    );
  });
}

export async function cancelCustomerAppointment(
  userId: string,
  appointmentId: string,
  reason: string,
): Promise<void> {
  await prisma.$transaction(async (tx) => {
    await lockPortalAppointment(tx, userId, appointmentId);
    const appointment = await getPortalAppointment(userId, appointmentId, tx);
    assertAppointmentTransition(appointment.status, "CANCELLED");
    await updateAppointmentStatus(
      appointment.id,
      "CANCELLED",
      { cancelledById: userId, cancelReason: reason },
      tx,
    );
    await recordAudit(
      {
        action: AUDIT_ACTIONS.APPOINTMENT_STATUS_CHANGED,
        entityType: "Appointment",
        entityId: appointment.id,
        garageId: appointment.garageId,
        actorUserId: userId,
        before: { status: appointment.status },
        after: { status: "CANCELLED", cancelReason: reason },
      },
      tx,
    );
  });
}

export async function rescheduleCustomerAppointment(
  userId: string,
  appointmentId: string,
  scheduledAt: Date,
): Promise<{ id: string }> {
  return prisma.$transaction(async (tx) => {
    await lockPortalAppointment(tx, userId, appointmentId);
    const appointment = await getPortalAppointment(userId, appointmentId, tx);
    if (appointment.status !== "PENDING" && appointment.status !== "CONFIRMED") {
      throw new BusinessRuleError("Chỉ có thể đổi lịch hẹn đang chờ xác nhận hoặc đã xác nhận.");
    }

    await updateAppointmentStatus(
      appointment.id,
      "CANCELLED",
      { cancelledById: userId, cancelReason: RESCHEDULE_CANCEL_REASON },
      tx,
    );
    const replacement = await createPortalAppointment(
      userId,
      {
        vehicleId: appointment.vehicleId,
        scheduledAt,
        serviceRequest: appointment.serviceRequest,
        note: appointment.note,
      },
      tx,
    );
    await recordAudit(
      {
        action: AUDIT_ACTIONS.APPOINTMENT_RESCHEDULED,
        entityType: "Appointment",
        entityId: appointment.id,
        garageId: appointment.garageId,
        actorUserId: userId,
        before: { status: appointment.status, scheduledAt: appointment.scheduledAt },
        after: { status: "CANCELLED", cancelReason: RESCHEDULE_CANCEL_REASON },
        metadata: { replacementAppointmentId: replacement.id },
      },
      tx,
    );
    await recordAudit(
      {
        action: AUDIT_ACTIONS.APPOINTMENT_RESCHEDULED,
        entityType: "Appointment",
        entityId: replacement.id,
        garageId: appointment.garageId,
        actorUserId: userId,
        before: null,
        after: { status: "PENDING", scheduledAt },
        metadata: { replacedAppointmentId: appointment.id },
      },
      tx,
    );
    return replacement;
  });
}
