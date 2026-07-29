import { assertWorkTaskTransition, WORK_TASK_LABELS } from "@/lib/transitions";

export { assertWorkTaskTransition, WORK_TASK_LABELS };

export function canTechnicianUpdateTask(
  userGarageRole: string | null,
  assignedToId: string | null,
  userId: string,
): boolean {
  if (userGarageRole === "GARAGE_MANAGER") return true;
  if (userGarageRole === "TECHNICIAN") {
    return assignedToId === userId;
  }
  return false;
}
