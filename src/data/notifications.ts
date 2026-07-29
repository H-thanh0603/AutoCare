import { NotFoundError } from "@/lib/errors";
import { prisma, type PrismaClientOrTx } from "@/lib/prisma";

export async function listNotificationsForUser(
  userId: string,
  db: PrismaClientOrTx = prisma,
) {
  return db.notification.findMany({
    where: { userId },
    select: {
      id: true,
      type: true,
      title: true,
      body: true,
      data: true,
      readAt: true,
      createdAt: true,
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function markNotificationRead(
  userId: string,
  notificationId: string,
  db: PrismaClientOrTx = prisma,
): Promise<void> {
  const updated = await db.notification.updateMany({
    where: { id: notificationId, userId, readAt: null },
    data: { readAt: new Date() },
  });
  if (updated.count !== 1) throw new NotFoundError("Không tìm thấy thông báo.");
}
