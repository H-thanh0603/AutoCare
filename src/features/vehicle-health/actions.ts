"use server";

import {
  amendMaintenanceRecord,
  createShareLink,
  revokeShareLink,
} from "@/features/vehicle-health/service";
import { getSessionUser } from "@/lib/auth";
import { runAction } from "@/lib/errors";
import { requireGarageScope, requirePermission } from "@/lib/rbac";

export async function createShareLinkAction(vehicleId: string, durationDays = 30) {
  return runAction(async () => {
    const user = requirePermission(await getSessionUser(), "share-link:manage");
    const { garageId } = requireGarageScope(user);
    return createShareLink({
      vehicleId,
      durationDays,
      garageId,
      createdById: user.id,
    });
  });
}

export async function revokeShareLinkAction(shareLinkId: string) {
  return runAction(async () => {
    const user = requirePermission(await getSessionUser(), "share-link:manage");
    return revokeShareLink({
      shareLinkId,
      actorUserId: user.id,
    });
  });
}

export async function amendMaintenanceRecordAction(recordId: string, correctionNote: string) {
  return runAction(async () => {
    const user = requirePermission(await getSessionUser(), "vehicle-health:write");
    const { garageId } = requireGarageScope(user);
    return amendMaintenanceRecord({
      garageId,
      recordId,
      correctionNote,
      actorUserId: user.id,
    });
  });
}
