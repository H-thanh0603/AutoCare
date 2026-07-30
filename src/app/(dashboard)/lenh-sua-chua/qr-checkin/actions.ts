"use server";

import { instantCheckinByQrCode } from "@/features/repair-orders/qr-checkin-service";
import { GarageRole } from "@/generated/prisma/enums";
import { getSessionUser } from "@/lib/auth";
import { runAction } from "@/lib/errors";
import { requireGarageScope, requirePermission } from "@/lib/rbac";

export async function instantQrCheckinAction(input: {
  qrData: string;
  mileageKm?: number;
  customerNotes?: string;
}) {
  return runAction(async () => {
    const user = requirePermission(await getSessionUser(), "repair-order:write");
    const { garageId } = requireGarageScope(user);

    return instantCheckinByQrCode({
      garageId,
      qrData: input.qrData,
      isGarageManager: user.garageRole === GarageRole.GARAGE_MANAGER,
      mileageKm: input.mileageKm,
      customerNotes: input.customerNotes,
      actorUserId: user.id,
    });
  });
}
