"use server";

import { revalidatePath } from "next/cache";
import { markNotificationRead } from "@/data/notifications";
import { getSessionUser } from "@/lib/auth";
import { runAction } from "@/lib/errors";
import { requirePermission } from "@/lib/rbac";

export async function markNotificationReadFormAction(formData: FormData): Promise<void> {
  await runAction(async () => {
    const user = requirePermission(await getSessionUser(), "quotation:read");
    await markNotificationRead(user.id, String(formData.get("notificationId") ?? ""));
    revalidatePath("/tai-khoan/thong-bao");
  });
}
