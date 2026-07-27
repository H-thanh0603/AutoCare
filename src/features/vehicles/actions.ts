"use server";

import { revalidatePath } from "next/cache";

import {
  createVehicleSchema,
  mileageSchema,
  transferOwnershipSchema,
  vehicleSchema,
} from "@/features/vehicles/schema";
import {
  createGarageVehicle,
  deleteGarageVehicle,
  recordVehicleMileage,
  transferVehicleOwnership,
  updateGarageVehicle,
} from "@/features/vehicles/service";
import { getSessionUser } from "@/lib/auth";
import { runAction, ValidationError, type ActionResult } from "@/lib/errors";
import {
  requireGarageRole,
  requireGarageScope,
  requirePermission,
} from "@/lib/rbac";
import { GarageRole } from "@/generated/prisma/enums";

function formErrors(error: { issues: { path: PropertyKey[]; message: string }[] }): Record<string, string[]> {
  const fieldErrors: Record<string, string[]> = {};
  for (const issue of error.issues) {
    const field = String(issue.path[0] ?? "form");
    fieldErrors[field] = [...(fieldErrors[field] ?? []), issue.message];
  }
  return fieldErrors;
}

function vehicleFormInput(formData: FormData): Record<string, FormDataEntryValue | null> {
  return {
    licensePlate: formData.get("licensePlate"),
    vin: formData.get("vin"),
    brand: formData.get("brand"),
    model: formData.get("model"),
    year: formData.get("year"),
    color: formData.get("color"),
    engineNumber: formData.get("engineNumber"),
  };
}

export async function createVehicleAction(
  formData: FormData,
): Promise<ActionResult<{ id: string }>> {
  return runAction(async () => {
    const parsed = createVehicleSchema.safeParse({
      ...vehicleFormInput(formData),
      customerId: formData.get("customerId"),
      currentKm: formData.get("currentKm"),
    });
    if (!parsed.success) {
      throw new ValidationError("Dữ liệu xe không hợp lệ.", formErrors(parsed.error));
    }

    const user = requirePermission(await getSessionUser(), "vehicle:write");
    const { garageId } = requireGarageScope(user);
    const vehicle = await createGarageVehicle(garageId, user.id, parsed.data);
    revalidatePath("/xe");
    revalidatePath("/khach-hang");
    return vehicle;
  });
}

export async function updateVehicleAction(
  vehicleId: string,
  formData: FormData,
): Promise<ActionResult<void>> {
  return runAction(async () => {
    const parsed = vehicleSchema.safeParse(vehicleFormInput(formData));
    if (!parsed.success) {
      throw new ValidationError("Dữ liệu xe không hợp lệ.", formErrors(parsed.error));
    }

    const user = requirePermission(await getSessionUser(), "vehicle:write");
    const { garageId } = requireGarageScope(user);
    await updateGarageVehicle(garageId, vehicleId, parsed.data);
    revalidatePath("/xe");
    revalidatePath(`/xe/${vehicleId}`);
  });
}

export async function deleteVehicleAction(vehicleId: string): Promise<ActionResult<void>> {
  return runAction(async () => {
    const user = requirePermission(await getSessionUser(), "vehicle:write");
    const { garageId } = requireGarageScope(user);
    await deleteGarageVehicle(garageId, vehicleId);
    revalidatePath("/xe");
  });
}

export async function transferOwnershipAction(
  vehicleId: string,
  formData: FormData,
): Promise<ActionResult<void>> {
  return runAction(async () => {
    const parsed = transferOwnershipSchema.safeParse({
      customerId: formData.get("customerId"),
      note: formData.get("note"),
    });
    if (!parsed.success) {
      throw new ValidationError("Dữ liệu chuyển chủ sở hữu không hợp lệ.", formErrors(parsed.error));
    }

    const user = requirePermission(await getSessionUser(), "vehicle:write");
    const { garageId } = requireGarageScope(user);
    await transferVehicleOwnership(garageId, vehicleId, user.id, parsed.data);
    revalidatePath("/xe");
    revalidatePath(`/xe/${vehicleId}`);
  });
}

export async function recordMileageAction(
  vehicleId: string,
  formData: FormData,
): Promise<ActionResult<void>> {
  return runAction(async () => {
    const parsed = mileageSchema.safeParse({
      mileageKm: formData.get("mileageKm"),
      note: formData.get("note"),
      overrideReason: formData.get("overrideReason"),
    });
    if (!parsed.success) {
      throw new ValidationError("Dữ liệu số km không hợp lệ.", formErrors(parsed.error));
    }

    const user = requirePermission(await getSessionUser(), "vehicle:write");
    const { garageId } = requireGarageScope(user);
    const isGarageManager = user.garageRole === GarageRole.GARAGE_MANAGER;
    if (parsed.data.overrideReason) {
      requireGarageRole(user, GarageRole.GARAGE_MANAGER);
    }
    await recordVehicleMileage(
      garageId,
      vehicleId,
      user.id,
      isGarageManager,
      parsed.data,
    );
    revalidatePath("/xe");
    revalidatePath(`/xe/${vehicleId}`);
  });
}
