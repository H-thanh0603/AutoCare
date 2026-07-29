import { Prisma } from "@/generated/prisma/client";
import { getGarageAppointment, updateAppointmentStatus } from "@/data/appointments";
import { createMileageLog, setCurrentKm } from "@/data/vehicles";
import type { ReceptionInput } from "@/features/repair-orders/schema";
import { AUDIT_ACTIONS, recordAudit } from "@/lib/audit";
import { NotFoundError } from "@/lib/errors";
import { prisma, type PrismaTx } from "@/lib/prisma";
import { assertAppointmentTransition } from "@/lib/transitions";
import { validateMileageChange } from "@/features/vehicles/mileage";

async function lockGarageAppointment(
  tx: PrismaTx,
  garageId: string,
  appointmentId: string,
): Promise<void> {
  const rows = await tx.$queryRaw<{ id: string }[]>(Prisma.sql`
    SELECT "id" FROM "appointments"
    WHERE "id" = ${appointmentId} AND "garageId" = ${garageId}
    FOR UPDATE
  `);
  if (rows.length === 0) throw new NotFoundError("Không tìm thấy lịch hẹn.");
}

async function nextRepairOrderCode(tx: PrismaTx, garageId: string, year: number): Promise<string> {
  const row = await tx.repairOrderSequence.upsert({
    where: { garageId_year: { garageId, year } },
    create: { garageId, year, nextValue: 2 },
    update: { nextValue: { increment: 1 } },
    select: { nextValue: true },
  });
  return `RO-${year}-${String(row.nextValue - 1).padStart(4, "0")}`;
}

export async function checkInAppointment(
  garageId: string,
  actorUserId: string,
  isGarageManager: boolean,
  appointmentId: string,
  input: ReceptionInput,
): Promise<{ id: string; code: string }> {
  return prisma.$transaction(async (tx) => {
    await lockGarageAppointment(tx, garageId, appointmentId);
    const appointment = await getGarageAppointment(garageId, appointmentId, tx);
    assertAppointmentTransition(appointment.status, "ARRIVED");

    const vehicle = await tx.vehicle.findUnique({
      where: { id: appointment.vehicleId },
      select: { currentKm: true },
    });
    if (!vehicle) throw new NotFoundError("Không tìm thấy xe.");
    validateMileageChange({
      previousKm: vehicle.currentKm,
      nextKm: input.mileageKm,
      overrideReason: input.overrideReason,
      isGarageManager,
    });

    const code = await nextRepairOrderCode(tx, garageId, new Date().getFullYear());
    const repairOrder = await tx.repairOrder.create({
      data: {
        garageId,
        code,
        vehicleId: appointment.vehicleId,
        customerId: appointment.customerId,
        appointmentId: appointment.id,
        mileageKm: input.mileageKm,
        fuelLevel: input.fuelLevel,
        initialNote: input.initialNote,
        intakeChecklist: input.intakeChecklist,
        advisorId: actorUserId,
      },
      select: { id: true, code: true },
    });
    await createMileageLog(
      {
        vehicleId: appointment.vehicleId,
        garageId,
        mileageKm: input.mileageKm,
        note: input.initialNote,
        overrideReason: input.overrideReason,
        createdById: actorUserId,
      },
      tx,
    );
    await setCurrentKm(appointment.vehicleId, input.mileageKm, tx);
    await updateAppointmentStatus(appointment.id, "ARRIVED", {}, tx);
    await recordAudit(
      {
        action: AUDIT_ACTIONS.REPAIR_ORDER_RECEIVED,
        entityType: "RepairOrder",
        entityId: repairOrder.id,
        garageId,
        actorUserId,
        before: { appointmentStatus: appointment.status, vehicleKm: vehicle.currentKm },
        after: { code: repairOrder.code, appointmentStatus: "ARRIVED", vehicleKm: input.mileageKm },
      },
      tx,
    );
    return repairOrder;
  });
}

export async function createWalkInRepairOrder(
  garageId: string,
  actorUserId: string,
  isGarageManager: boolean,
  input: ReceptionInput & { vehicleId: string },
): Promise<{ id: string; code: string }> {
  return prisma.$transaction(async (tx) => {
    const ownership = await tx.vehicleOwnership.findFirst({
      where: {
        vehicleId: input.vehicleId,
        isCurrent: true,
        endedAt: null,
        vehicle: { deletedAt: null },
        customer: { garageId, deletedAt: null },
      },
      select: { customerId: true, vehicle: { select: { currentKm: true } } },
    });
    if (!ownership) throw new NotFoundError("Không tìm thấy xe.");
    validateMileageChange({
      previousKm: ownership.vehicle.currentKm,
      nextKm: input.mileageKm,
      overrideReason: input.overrideReason,
      isGarageManager,
    });

    const code = await nextRepairOrderCode(tx, garageId, new Date().getFullYear());
    const repairOrder = await tx.repairOrder.create({
      data: {
        garageId,
        code,
        vehicleId: input.vehicleId,
        customerId: ownership.customerId,
        mileageKm: input.mileageKm,
        fuelLevel: input.fuelLevel,
        initialNote: input.initialNote,
        intakeChecklist: input.intakeChecklist,
        advisorId: actorUserId,
      },
      select: { id: true, code: true },
    });
    await createMileageLog(
      {
        vehicleId: input.vehicleId,
        garageId,
        mileageKm: input.mileageKm,
        note: input.initialNote,
        overrideReason: input.overrideReason,
        createdById: actorUserId,
      },
      tx,
    );
    await setCurrentKm(input.vehicleId, input.mileageKm, tx);
    await recordAudit(
      {
        action: AUDIT_ACTIONS.REPAIR_ORDER_WALK_IN,
        entityType: "RepairOrder",
        entityId: repairOrder.id,
        garageId,
        actorUserId,
        before: { vehicleKm: ownership.vehicle.currentKm },
        after: { code: repairOrder.code, vehicleKm: input.mileageKm },
      },
      tx,
    );
    return repairOrder;
  });
}

export { nextRepairOrderCode };
