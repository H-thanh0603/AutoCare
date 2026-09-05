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
import { assertAppointmentSlot, buildSlotsForDay } from "@/lib/appointment-settings";
import { AUDIT_ACTIONS, recordAudit } from "@/lib/audit";
import { getGarageById } from "@/data/garages";
import { BusinessRuleError, NotFoundError } from "@/lib/errors";
import { prisma, type PrismaTx } from "@/lib/prisma";
import { assertAppointmentTransition } from "@/lib/transitions";

const RESCHEDULE_CANCEL_REASON = "Đổi lịch hẹn";

function isExclusionViolation(error: unknown): boolean {
  const seen = new Set<object>();

  function containsPostgresCode(value: unknown): boolean {
    if (typeof value !== "object" || value === null || seen.has(value)) return false;
    seen.add(value);

    if ("code" in value && value.code === "23P01") return true;
    if ("originalCode" in value && value.originalCode === "23P01") return true;
    return Object.values(value).some(containsPostgresCode);
  }

  return containsPostgresCode(error);
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

async function createPortalAppointmentInTx(
  db: PrismaTx,
  userId: string,
  input: AppointmentInput,
): Promise<{ id: string }> {
  const owner = await getCurrentPortalVehicleOwner(userId, input.vehicleId, db);
  const settings = await getGarageAppointmentSettings(owner.garageId, db);
  const endsAt = assertAppointmentSlot(settings, input.scheduledAt);

  if (settings.maxConcurrentPerSlot > 0) {
    // Serialize concurrent bookings of the same garage slot: a plain
    // count-then-insert lets N simultaneous requests all observe "slot not
    // full" and oversubscribe it. The transaction-scoped advisory lock is
    // keyed on (garage, slot start) so only same-slot bookings contend.
    const slotEpochSeconds = Math.floor(input.scheduledAt.getTime() / 1000);
    await db.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${owner.garageId}), ${slotEpochSeconds}::int)`;

    const overlapping = await db.appointment.count({
      where: {
        garageId: owner.garageId,
        status: { in: ["PENDING", "CONFIRMED"] },
        scheduledAt: { lt: endsAt },
        endsAt: { gt: input.scheduledAt },
      },
    });
    if (overlapping >= settings.maxConcurrentPerSlot) {
      throw new BusinessRuleError("Khung giờ này đã đầy, vui lòng chọn thời điểm khác.");
    }
  }
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

async function createPortalAppointment(
  userId: string,
  input: AppointmentInput,
  tx: PrismaTx | undefined = undefined,
): Promise<{ id: string }> {
  // The capacity check and the insert must share one transaction so the
  // advisory lock above actually guards the read-then-write pair.
  if (tx) return createPortalAppointmentInTx(tx, userId, input);
  return prisma.$transaction((db) => createPortalAppointmentInTx(db, userId, input));
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

export async function cancelGarageAppointment(
  garageId: string,
  actorId: string,
  appointmentId: string,
  reason: string,
): Promise<void> {
  await prisma.$transaction(async (tx) => {
    await lockGarageAppointment(tx, garageId, appointmentId);
    const appointment = await getGarageAppointment(garageId, appointmentId, tx);
    assertAppointmentTransition(appointment.status, "CANCELLED");
    await updateAppointmentStatus(
      appointment.id,
      "CANCELLED",
      { cancelledById: actorId, cancelReason: reason },
      tx,
    );
    await recordAudit(
      {
        action: AUDIT_ACTIONS.APPOINTMENT_STATUS_CHANGED,
        entityType: "Appointment",
        entityId: appointment.id,
        garageId,
        actorUserId: actorId,
        before: { status: appointment.status },
        after: { status: "CANCELLED", cancelReason: reason },
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

export interface SlotAvailability {
  start: Date;
  end: Date;
  booked: number;
  /** Null when capacity is unlimited (maxConcurrentPerSlot = 0). */
  remaining: number | null;
  overbooked: boolean;
  full: boolean;
}

export interface DayAvailability {
  date: string;
  capacity: number;
  slotMinutes: number;
  slots: SlotAvailability[];
}

const ACTIVE_BOOKING_STATUS = ["PENDING", "CONFIRMED"] as const;

/**
 * Per-slot remaining capacity for one garage-local day (YYYY-MM-DD).
 * Powers "khung giờ còn trống" UI and the overload warning on /cai-dat.
 * Counts every PENDING/CONFIRMED booking overlapping each slot — the same
 * population the booking-time capacity check enforces.
 */
export async function getDaySlotAvailability(
  garageId: string,
  date: string,
): Promise<DayAvailability> {
  const settings = await getGarageAppointmentSettings(garageId);
  const slots = buildSlotsForDay(settings, date);
  const capacity = settings.maxConcurrentPerSlot;

  if (slots.length === 0) {
    return { date, capacity, slotMinutes: settings.appointmentSlotMinutes, slots: [] };
  }

  const dayStart = slots[0].start;
  const dayEnd = slots[slots.length - 1].end;
  const bookings = await prisma.appointment.findMany({
    where: {
      garageId,
      status: { in: [...ACTIVE_BOOKING_STATUS] },
      scheduledAt: { lt: dayEnd },
      endsAt: { gt: dayStart },
    },
    select: { scheduledAt: true, endsAt: true },
  });

  const result: DayAvailability = {
    date,
    capacity,
    slotMinutes: settings.appointmentSlotMinutes,
    slots: slots.map((slot) => {
      const booked = bookings.filter(
        (b) => b.scheduledAt < slot.end && b.endsAt > slot.start,
      ).length;
      const remaining = capacity > 0 ? capacity - booked : null;
      return {
        ...slot,
        booked,
        remaining,
        overbooked: capacity > 0 && booked > capacity,
        full: capacity > 0 && booked >= capacity,
      };
    }),
  };
  return result;
}

export interface OverloadedDay {
  date: string;
  capacity: number;
  slots: { start: Date; end: Date; booked: number }[];
}

/**
 * Days in the next `daysAhead` days with at least one slot over capacity.
 * Shown on /cai-dat so managers see the impact before/after lowering
 * `maxConcurrentPerSlot`. Returns [] when capacity is unlimited.
 * One booking query for the whole window; slot math stays in memory.
 */
export async function getUpcomingOverload(
  garageId: string,
  daysAhead = 14,
): Promise<OverloadedDay[]> {
  const settings = await getGarageAppointmentSettings(garageId);
  const capacity = settings.maxConcurrentPerSlot;
  if (capacity <= 0 || daysAhead <= 0) return [];

  const now = new Date();
  const windowEnd = new Date(now.getTime() + daysAhead * 86_400_000);
  const bookings = await prisma.appointment.findMany({
    where: {
      garageId,
      status: { in: [...ACTIVE_BOOKING_STATUS] },
      scheduledAt: { lt: windowEnd },
      endsAt: { gt: now },
    },
    select: { scheduledAt: true, endsAt: true },
  });

  const overloaded: OverloadedDay[] = [];
  for (let offset = 0; offset < daysAhead; offset++) {
    const cursor = new Date(now.getTime() + offset * 86_400_000);
    // Garage-local calendar day for the cursor instant.
    const parts = new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Ho_Chi_Minh",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(cursor);
    const slots = buildSlotsForDay(settings, parts);
    if (slots.length === 0) continue;

    const bad = slots
      .map((slot) => ({
        ...slot,
        booked: bookings.filter((b) => b.scheduledAt < slot.end && b.endsAt > slot.start)
          .length,
      }))
      .filter((s) => s.booked > capacity)
      .map(({ start, end, booked }) => ({ start, end, booked }));

    if (bad.length > 0) overloaded.push({ date: parts, capacity, slots: bad });
    if (overloaded.length >= 10) break;
  }
  return overloaded;
}
