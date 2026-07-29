"use server";

import { revalidatePath } from "next/cache";

import { appointmentInputSchema } from "@/features/appointments/schema";
import {
  cancelCustomerAppointment,
  cancelGarageAppointment,
  confirmAppointment,
  createCustomerAppointment,
  markAppointmentNoShow,
  rescheduleCustomerAppointment,
} from "@/features/appointments/service";
import { getSessionUser } from "@/lib/auth";
import { runAction, ValidationError, type ActionResult } from "@/lib/errors";
import { requireGarageScope, requirePermission } from "@/lib/rbac";
import { updateGarageAppointmentSettings } from "@/data/garages";
import { parseAppointmentSettings } from "@/lib/appointment-settings";

function formErrors(error: { issues: { path: PropertyKey[]; message: string }[] }): Record<string, string[]> {
  const fieldErrors: Record<string, string[]> = {};
  for (const issue of error.issues) {
    const field = String(issue.path[0] ?? "form");
    fieldErrors[field] = [...(fieldErrors[field] ?? []), issue.message];
  }
  return fieldErrors;
}

function bookingInput(formData: FormData) {
  return {
    vehicleId: formData.get("vehicleId"),
    scheduledAt: formData.get("scheduledAt"),
    serviceRequest: formData.get("serviceRequest"),
    note: formData.get("note"),
  };
}

export async function createPortalAppointmentAction(formData: FormData): Promise<ActionResult<{ id: string }>> {
  return runAction(async () => {
    const parsed = appointmentInputSchema.safeParse(bookingInput(formData));
    if (!parsed.success) throw new ValidationError("Dữ liệu lịch hẹn không hợp lệ.", formErrors(parsed.error));
    const user = requirePermission(await getSessionUser(), "appointment:write");
    const result = await createCustomerAppointment(user.id, parsed.data);
    revalidatePath("/tai-khoan");
    revalidatePath("/tai-khoan/lich-hen");
    return result;
  });
}

export async function createPortalAppointmentFormAction(formData: FormData): Promise<void> {
  await createPortalAppointmentAction(formData);
}

export async function cancelPortalAppointmentAction(appointmentId: string, formData: FormData): Promise<ActionResult<void>> {
  return runAction(async () => {
    const user = requirePermission(await getSessionUser(), "appointment:write");
    await cancelCustomerAppointment(user.id, appointmentId, String(formData.get("reason") ?? "Khách hủy lịch"));
    revalidatePath("/tai-khoan");
    revalidatePath(`/tai-khoan/lich-hen/${appointmentId}`);
  });
}

export async function reschedulePortalAppointmentAction(appointmentId: string, formData: FormData): Promise<ActionResult<{ id: string }>> {
  return runAction(async () => {
    const scheduledAt = new Date(String(formData.get("scheduledAt") ?? ""));
    if (Number.isNaN(scheduledAt.getTime())) throw new ValidationError("Thời gian hẹn không hợp lệ.");
    const user = requirePermission(await getSessionUser(), "appointment:write");
    const result = await rescheduleCustomerAppointment(user.id, appointmentId, scheduledAt);
    revalidatePath("/tai-khoan");
    revalidatePath("/tai-khoan/lich-hen");
    return result;
  });
}

export async function confirmAppointmentAction(appointmentId: string): Promise<ActionResult<void>> {
  return runAction(async () => {
    const user = requirePermission(await getSessionUser(), "appointment:confirm");
    const { garageId } = requireGarageScope(user);
    await confirmAppointment(garageId, user.id, appointmentId);
    revalidatePath("/lich-hen");
  });
}

export async function noShowAppointmentAction(appointmentId: string): Promise<ActionResult<void>> {
  return runAction(async () => {
    const user = requirePermission(await getSessionUser(), "appointment:confirm");
    const { garageId } = requireGarageScope(user);
    await markAppointmentNoShow(garageId, user.id, appointmentId);
    revalidatePath("/lich-hen");
  });
}

export async function cancelGarageAppointmentAction(appointmentId: string, formData: FormData): Promise<ActionResult<void>> {
  return runAction(async () => {
    const user = requirePermission(await getSessionUser(), "appointment:confirm");
    const { garageId } = requireGarageScope(user);
    await cancelGarageAppointment(garageId, user.id, appointmentId, String(formData.get("reason") ?? "Gara hủy lịch"));
    revalidatePath("/lich-hen");
  });
}

export async function confirmAppointmentFormAction(formData: FormData): Promise<void> {
  await confirmAppointmentAction(String(formData.get("appointmentId") ?? ""));
}

export async function noShowAppointmentFormAction(formData: FormData): Promise<void> {
  await noShowAppointmentAction(String(formData.get("appointmentId") ?? ""));
}

export async function cancelGarageAppointmentFormAction(formData: FormData): Promise<void> {
  await cancelGarageAppointmentAction(String(formData.get("appointmentId") ?? ""), formData);
}

export async function updateAppointmentSettingsFormAction(formData: FormData): Promise<void> {
  const user = requirePermission(await getSessionUser(), "garage-settings:write");
  const { garageId } = requireGarageScope(user);
  const workingHours = Object.fromEntries(
    [1, 2, 3, 4, 5, 6].flatMap((day) => {
      const open = String(formData.get(`open-${day}`) ?? "");
      const close = String(formData.get(`close-${day}`) ?? "");
      return open && close ? [[day, { open, close }]] : [];
    }),
  );
  const settings = parseAppointmentSettings({
    appointmentSlotMinutes: Number(formData.get("appointmentSlotMinutes")),
    workingHours,
  });
  await updateGarageAppointmentSettings(garageId, settings);
  revalidatePath("/cai-dat");
}
