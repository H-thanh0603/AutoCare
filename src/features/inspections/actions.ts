"use server";

import { revalidatePath } from "next/cache";

import { inspectionSchema } from "@/features/inspections/schema";
import { saveInspection, startInspection } from "@/features/inspections/service";
import { getSessionUser } from "@/lib/auth";
import { runAction, ValidationError } from "@/lib/errors";
import { runStaffFormAction } from "@/lib/form-action";
import { requireGarageScope, requirePermission } from "@/lib/rbac";

export async function startInspectionFormAction(formData: FormData): Promise<void> {
  const repairOrderId = String(formData.get("repairOrderId") ?? "");
  await runStaffFormAction(`/lenh-sua-chua/${repairOrderId}`, () =>
    runAction(async () => {
      const user = requirePermission(await getSessionUser(), "inspection:write");
      const { garageId } = requireGarageScope(user);
      await startInspection(garageId, user.id, repairOrderId);
      revalidatePath(`/lenh-sua-chua/${repairOrderId}`);
    }),
  );
}

export async function saveInspectionFormAction(formData: FormData): Promise<void> {
  const repairOrderId = String(formData.get("repairOrderId") ?? "");
  await runStaffFormAction(`/lenh-sua-chua/${repairOrderId}`, () =>
    runAction(async () => {
      const parsed = inspectionSchema.safeParse({
        summary: String(formData.get("summary") ?? ""),
        items: [{
          category: String(formData.get("category") ?? ""),
          name: String(formData.get("name") ?? ""),
          severity: String(formData.get("severity") ?? ""),
          finding: String(formData.get("finding") ?? ""),
          recommendation: String(formData.get("recommendation") ?? ""),
        }],
      });
      if (!parsed.success) throw new ValidationError("Dữ liệu kiểm tra không hợp lệ.");
      const user = requirePermission(await getSessionUser(), "inspection:write");
      const { garageId } = requireGarageScope(user);
      await saveInspection(garageId, user.id, repairOrderId, parsed.data);
      revalidatePath(`/lenh-sua-chua/${repairOrderId}`);
    }),
  );
}
