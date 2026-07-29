"use server";

import { WorkTaskStatus } from "@/generated/prisma/enums";
import {
  addWorkLog,
  assignTechnician,
  syncWorkTasksFromQuotation,
  updateWorkTaskStatus,
} from "@/features/work-tasks/service";
import { getSessionUser } from "@/lib/auth";
import { runAction, UnauthenticatedError } from "@/lib/errors";
import { requireGarageScope, requirePermission } from "@/lib/rbac";

export async function assignTechnicianAction(workTaskId: string, technicianId: string | null) {
  return runAction(async () => {
    const user = requirePermission(await getSessionUser(), "work-task:assign");
    const { garageId } = requireGarageScope(user);
    await assignTechnician({
      garageId,
      workTaskId,
      technicianId,
      actorUserId: user.id,
    });
  });
}

export async function updateWorkTaskStatusAction(
  workTaskId: string,
  status: WorkTaskStatus,
  cancelReason?: string,
) {
  return runAction(async () => {
    const user = await getSessionUser();
    if (!user) throw new UnauthenticatedError();
    const authorizedUser =
      user.garageRole === "TECHNICIAN"
        ? requirePermission(user, "work-task:progress")
        : requirePermission(user, "work-task:write");
    const { garageId } = requireGarageScope(authorizedUser);

    await updateWorkTaskStatus({
      garageId,
      workTaskId,
      status,
      cancelReason,
      actorUserId: user.id,
    });
  });
}

export async function addWorkLogAction(workTaskId: string, note: string, minutesSpent?: number) {
  return runAction(async () => {
    const user = requirePermission(await getSessionUser(), "work-task:progress");
    const { garageId } = requireGarageScope(user);
    return addWorkLog({
      garageId,
      workTaskId,
      userId: user.id,
      note,
      minutesSpent,
    });
  });
}

export async function syncWorkTasksAction(quotationId: string) {
  return runAction(async () => {
    const user = requirePermission(await getSessionUser(), "work-task:write");
    requireGarageScope(user);
    return syncWorkTasksFromQuotation(quotationId);
  });
}
