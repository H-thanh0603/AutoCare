import { prisma } from "@/lib/prisma";

export interface ServiceReminderDTO {
  vehicleId: string;
  licensePlate: string;
  ownerId: string | null;
  currentKm: number | null;
  projectedKm: number;
  daysUntilServiceDue: number;
  recommendation: string;
}

export async function generateVehicleServiceReminders(garageId: string): Promise<{
  remindersCount: number;
  notificationsCreated: number;
  reminders: ServiceReminderDTO[];
}> {
  const vehicles = await prisma.vehicle.findMany({
    include: {
      ownerships: {
        where: { isCurrent: true },
        include: { customer: { select: { id: true, name: true, email: true, phone: true, userId: true } } },
      },
      maintenance: { orderBy: { performedAt: "desc" }, take: 1 },
    },
  });

  const reminders: ServiceReminderDTO[] = [];
  let notificationsCreated = 0;

  for (const v of vehicles) {
    const ownerCustomer = v.ownerships[0]?.customer ?? null;
    const targetUserId = ownerCustomer?.userId ?? ownerCustomer?.id ?? null;

    if (!targetUserId) continue;

    const lastKm = v.currentKm ?? 0;

    // AI Projection: 20 km per day average usage
    const dailyAverageKm = 20;
    const targetKmInterval = 5000;

    let targetDueKm = Math.ceil((lastKm + 1) / targetKmInterval) * targetKmInterval;
    if (targetDueKm <= lastKm) targetDueKm += targetKmInterval;

    const remainingKm = targetDueKm - lastKm;
    const daysUntilDue = Math.max(1, Math.round(remainingKm / dailyAverageKm));

    // If service is due within 15 days or remaining km <= 500 km
    if (daysUntilDue <= 15 || remainingKm <= 500) {
      reminders.push({
        vehicleId: v.id,
        licensePlate: v.licensePlate,
        ownerId: targetUserId,
        currentKm: lastKm,
        projectedKm: targetDueKm,
        daysUntilServiceDue: daysUntilDue,
        recommendation: `Bảo dưỡng định kỳ mốc ${targetDueKm.toLocaleString("vi-VN")} km (Còn ~${remainingKm} km / ${daysUntilDue} ngày).`,
      });

      // Create notification for vehicle owner if not created today
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      const existingNotification = await prisma.notification.findFirst({
        where: {
          userId: targetUserId,
          createdAt: { gte: todayStart },
          title: { contains: v.licensePlate },
        },
      });

      if (!existingNotification) {
        await prisma.notification.create({
          data: {
            userId: targetUserId,
            title: `🔔 Nhắc lịch bảo dưỡng xe ${v.licensePlate}`,
            body: `Xe ${v.licensePlate} của bạn dự kiến sắp tới mốc bảo dưỡng ${targetDueKm.toLocaleString("vi-VN")} km (còn ~${daysUntilDue} ngày). Đặt lịch ngay trên AutoCare!`,
            data: { href: "/tai-khoan/lich-hen/moi", vehicleId: v.id },
          },
        });
        notificationsCreated++;
      }
    }
  }

  return {
    remindersCount: reminders.length,
    notificationsCreated,
    reminders,
  };
}
