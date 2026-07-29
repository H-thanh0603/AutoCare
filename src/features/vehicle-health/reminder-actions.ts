"use server";

import { generateVehicleServiceReminders } from "@/features/vehicle-health/reminder-service";
import { getSessionUser } from "@/lib/auth";
import { runAction } from "@/lib/errors";
import { requireGarageScope, requirePermission } from "@/lib/rbac";

export async function triggerAiServiceRemindersAction() {
  return runAction(async () => {
    const user = requirePermission(await getSessionUser(), "vehicle:read");
    const { garageId } = requireGarageScope(user);
    return generateVehicleServiceReminders(garageId);
  });
}
