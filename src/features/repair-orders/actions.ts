"use server";

import { revalidatePath } from "next/cache";

import { receptionSchema } from "@/features/repair-orders/schema";
import {
  checkInAppointment,
  createWalkInRepairOrder,
  deliverVehicle,
  failQualityCheck,
  passQualityCheck,
} from "@/features/repair-orders/service";
import { getSessionUser } from "@/lib/auth";
import { runAction, ValidationError, type ActionResult } from "@/lib/errors";
import { requireGarageScope, requirePermission } from "@/lib/rbac";
import { runStaffFormAction } from "@/lib/form-action";
import { GarageRole } from "@/generated/prisma/enums";

function receptionInput(formData: FormData) {
  return {
    mileageKm: formData.get("mileageKm"),
    fuelLevel: formData.get("fuelLevel"),
    initialNote: formData.get("initialNote"),
    intakeChecklist: { exterior: formData.get("exterior") === "on", documents: formData.get("documents") === "on" },
    overrideReason: formData.get("overrideReason"),
  };
}

function parseReception(formData: FormData) {
  const parsed = receptionSchema.safeParse(receptionInput(formData));
  if (!parsed.success) throw new ValidationError("Dữ liệu tiếp nhận không hợp lệ.");
  return parsed.data;
}

export async function checkInAppointmentAction(appointmentId: string, formData: FormData): Promise<ActionResult<{ id: string; code: string }>> {
  return runAction(async () => {
    const user = requirePermission(await getSessionUser(), "repair-order:write");
    const { garageId } = requireGarageScope(user);
    const result = await checkInAppointment(garageId, user.id, user.garageRole === GarageRole.GARAGE_MANAGER, appointmentId, parseReception(formData));
    revalidatePath("/lich-hen"); revalidatePath("/lenh-sua-chua"); revalidatePath(`/lenh-sua-chua/${result.id}`);
    return result;
  });
}

export async function createWalkInRepairOrderAction(formData: FormData): Promise<ActionResult<{ id: string; code: string }>> {
  return runAction(async () => {
    const vehicleId = String(formData.get("vehicleId") ?? "").trim();
    if (!vehicleId) throw new ValidationError("Vui lòng chọn xe.");
    const user = requirePermission(await getSessionUser(), "repair-order:write");
    const { garageId } = requireGarageScope(user);
    const result = await createWalkInRepairOrder(garageId, user.id, user.garageRole === GarageRole.GARAGE_MANAGER, { vehicleId, ...parseReception(formData) });
    revalidatePath("/lenh-sua-chua"); revalidatePath(`/lenh-sua-chua/${result.id}`);
    return result;
  });
}

export async function checkInAppointmentFormAction(formData: FormData): Promise<void> {
  await runStaffFormAction("/lich-hen", () =>
    checkInAppointmentAction(String(formData.get("appointmentId") ?? ""), formData),
  );
}

export async function createWalkInRepairOrderFormAction(formData: FormData): Promise<void> {
  await runStaffFormAction("/lenh-sua-chua", () => createWalkInRepairOrderAction(formData));
}

export async function passQualityCheckAction(repairOrderId: string, note?: string): Promise<ActionResult<void>> {
  return runAction(async () => {
    const user = requirePermission(await getSessionUser(), "quality-check:write");
    const { garageId } = requireGarageScope(user);
    await passQualityCheck({ garageId, repairOrderId, actorUserId: user.id, note });
    revalidatePath(`/lenh-sua-chua/${repairOrderId}`);
  });
}

export async function failQualityCheckAction(repairOrderId: string, reason: string): Promise<ActionResult<void>> {
  return runAction(async () => {
    const user = requirePermission(await getSessionUser(), "quality-check:write");
    const { garageId } = requireGarageScope(user);
    await failQualityCheck({ garageId, repairOrderId, actorUserId: user.id, reason });
    revalidatePath(`/lenh-sua-chua/${repairOrderId}`);
  });
}

export async function deliverVehicleAction(repairOrderId: string): Promise<ActionResult<void>> {
  return runAction(async () => {
    const user = requirePermission(await getSessionUser(), "repair-order:deliver");
    const { garageId } = requireGarageScope(user);
    await deliverVehicle({ garageId, repairOrderId, actorUserId: user.id });
    revalidatePath(`/lenh-sua-chua/${repairOrderId}`);
  });
}
