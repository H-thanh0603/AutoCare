import { randomUUID } from "crypto";
import { RecordSource, TimelineEventType } from "@/generated/prisma/enums";
import { assertVehicleInGarage } from "@/data/vehicles";
import {
  calculateNextServiceDue,
  sanitizePublicVehicleHealth,
} from "@/features/vehicle-health/domain";
import { AUDIT_ACTIONS, recordAudit } from "@/lib/audit";
import { BusinessRuleError, NotFoundError, ValidationError } from "@/lib/errors";
import { PrismaClientOrTx, prisma } from "@/lib/prisma";

export async function syncVehicleHealthFromRepairOrder(
  repairOrderId: string,
  tx: PrismaClientOrTx = prisma,
): Promise<void> {
  const order = await tx.repairOrder.findUnique({
    where: { id: repairOrderId },
    include: {
      vehicle: true,
      workTasks: {
        where: { status: "COMPLETED" },
        include: { quotationItem: true },
      },
    },
  });

  if (!order) return;

  const now = new Date();
  const { nextDueDate, nextDueMileageKm } = calculateNextServiceDue(order.mileageKm ?? order.vehicle.currentKm, now);

  const completedTaskTitles = order.workTasks.map((t) => t.title).join(", ");
  const summaryTitle = `Sửa chữa đợt ${order.code}`;
  const summaryDesc = completedTaskTitles ? `Các hạng mục hoàn thành: ${completedTaskTitles}` : "Hoàn thành gói dịch vụ sửa chữa.";

  // 1. Create MaintenanceRecord
  const maintenanceRecord = await tx.maintenanceRecord.create({
    data: {
      vehicleId: order.vehicleId,
      garageId: order.garageId,
      repairOrderId: order.id,
      title: summaryTitle,
      description: summaryDesc,
      performedAt: now,
      mileageKm: order.mileageKm ?? order.vehicle.currentKm,
      nextDueDate,
      nextDueMileageKm,
      source: RecordSource.VERIFIED_GARAGE_RECORD,
    },
  });

  // 2. Create Timeline Event
  await tx.vehicleTimelineEvent.create({
    data: {
      vehicleId: order.vehicleId,
      garageId: order.garageId,
      type: TimelineEventType.REPAIR,
      source: RecordSource.VERIFIED_GARAGE_RECORD,
      title: summaryTitle,
      description: summaryDesc,
      occurredAt: now,
      mileageKm: order.mileageKm ?? order.vehicle.currentKm,
      repairOrderId: order.id,
    },
  });

  // 3. Create default Warranties for completed parts/services
  for (const task of order.workTasks) {
    const warrantyMonths = 6;
    const expiresAt = new Date(now.getTime() + warrantyMonths * 30 * 86400 * 1000);

    await tx.warranty.create({
      data: {
        vehicleId: order.vehicleId,
        garageId: order.garageId,
        repairOrderId: order.id,
        quotationItemId: task.quotationItemId ?? null,
        name: `Bảo hành: ${task.title}`,
        terms: "Bảo hành tiêu chuẩn garage 6 tháng / 10.000 km",
        startsAt: now,
        expiresAt,
        mileageLimitKm: (order.mileageKm ?? order.vehicle.currentKm ?? 0) + 10000,
        isActive: true,
      },
    });
  }

  await recordAudit(
    {
      action: "vehicle_health.synced" as never,
      entityType: "MaintenanceRecord",
      entityId: maintenanceRecord.id,
      garageId: order.garageId,
      after: { vehicleId: order.vehicleId, repairOrderId, nextDueDate, nextDueMileageKm },
    },
    tx,
  );
}

export async function createShareLink(input: {
  vehicleId: string;
  durationDays?: number;
  garageId: string;
  createdById: string;
}) {
  const { vehicleId, durationDays = 30, garageId, createdById } = input;

  if (durationDays <= 0 || durationDays > 365) {
    throw new ValidationError("Thời gian hiệu lực phải từ 1 đến 365 ngày.");
  }

  const token = randomUUID();
  const expiresAt = new Date(Date.now() + durationDays * 86400 * 1000);

  return prisma.$transaction(async (tx) => {
    // Tenant scope: the vehicle must be owned by a customer of this garage.
    // A missing/foreign vehicle fails identically so ids cannot be probed.
    await assertVehicleInGarage(garageId, vehicleId, tx);

    const shareLink = await tx.shareLink.create({
      data: {
        vehicleId,
        token,
        expiresAt,
        createdById,
      },
    });

    await recordAudit(
      {
        action: AUDIT_ACTIONS.SHARE_LINK_CREATED,
        entityType: "ShareLink",
        entityId: shareLink.id,
        garageId,
        actorUserId: createdById,
        after: { vehicleId, expiresAt },
      },
      tx,
    );

    return shareLink;
  });
}

export async function getPublicVehicleHealth(token: string) {
  if (!token) throw new ValidationError("Mã token chia sẻ là bắt buộc.");

  const shareLink = await prisma.shareLink.findUnique({
    where: { token },
  });

  if (!shareLink) {
    throw new NotFoundError("Liên kết chia sẻ không tồn tại.");
  }

  if (shareLink.revokedAt) {
    throw new BusinessRuleError("Liên kết chia sẻ này đã bị thu hồi.");
  }

  if (shareLink.expiresAt && shareLink.expiresAt < new Date()) {
    throw new BusinessRuleError("Liên kết chia sẻ này đã hết hạn.");
  }

  const vehicle = await prisma.vehicle.findUnique({
    where: { id: shareLink.vehicleId },
    include: {
      timelineEvents: { orderBy: { occurredAt: "desc" } },
      maintenance: { orderBy: { performedAt: "desc" } },
      systemStatuses: { orderBy: { updatedAt: "desc" } },
      warranties: { where: { isActive: true }, orderBy: { startsAt: "desc" } },
    },
  });

  if (!vehicle) throw new NotFoundError("Không tìm thấy thông tin xe.");

  return sanitizePublicVehicleHealth({
    vehicle: {
      brand: vehicle.brand,
      model: vehicle.model,
      year: vehicle.year,
      color: vehicle.color,
      currentKm: vehicle.currentKm,
      licensePlate: vehicle.licensePlate,
    },
    timelineEvents: vehicle.timelineEvents.map((e) => ({
      id: e.id,
      type: e.type,
      title: e.title,
      description: e.description,
      occurredAt: e.occurredAt,
      mileageKm: e.mileageKm,
      source: e.source,
    })),
    maintenanceRecords: vehicle.maintenance.map((m) => ({
      id: m.id,
      title: m.title,
      description: m.description,
      performedAt: m.performedAt,
      mileageKm: m.mileageKm,
      nextDueDate: m.nextDueDate,
      nextDueMileageKm: m.nextDueMileageKm,
    })),
    systemStatuses: vehicle.systemStatuses.map((s) => ({
      system: s.system,
      condition: s.condition,
      note: s.note,
      updatedAt: s.updatedAt,
    })),
    warranties: vehicle.warranties.map((w) => ({
      name: w.name,
      terms: w.terms,
      startsAt: w.startsAt,
      expiresAt: w.expiresAt,
      mileageLimitKm: w.mileageLimitKm,
      isActive: w.isActive,
    })),
  });
}

export async function revokeShareLink(input: {
  shareLinkId: string;
  garageId: string;
  actorUserId: string;
}) {
  const { shareLinkId, garageId, actorUserId } = input;
  if (!shareLinkId) throw new ValidationError("ID liên kết chia sẻ là bắt buộc.");

  return prisma.$transaction(async (tx) => {
    // Tenant scope: only links for vehicles owned by this garage's customers
    // can be revoked. A foreign or nonexistent id yields the same NotFound.
    const link = await tx.shareLink.findFirst({
      where: {
        id: shareLinkId,
        vehicle: {
          ownerships: {
            some: {
              isCurrent: true,
              endedAt: null,
              customer: { garageId, deletedAt: null },
            },
          },
        },
      },
    });
    if (!link) throw new NotFoundError("Không tìm thấy liên kết chia sẻ.");

    if (link.revokedAt) {
      throw new BusinessRuleError("Liên kết chia sẻ đã được thu hồi trước đó.");
    }

    const updated = await tx.shareLink.update({
      where: { id: shareLinkId },
      data: { revokedAt: new Date() },
    });

    await recordAudit(
      {
        action: AUDIT_ACTIONS.SHARE_LINK_REVOKED,
        entityType: "ShareLink",
        entityId: shareLinkId,
        garageId,
        actorUserId,
        after: { revokedAt: updated.revokedAt },
      },
      tx,
    );

    return updated;
  });
}

export async function amendMaintenanceRecord(input: {
  garageId: string;
  recordId: string;
  correctionNote: string;
  actorUserId: string;
}) {
  const { garageId, recordId, correctionNote, actorUserId } = input;
  const trimmed = correctionNote.trim();
  if (trimmed.length < 10) {
    throw new ValidationError("Lý do điều chỉnh lịch sử phải dài tối thiểu 10 ký tự.");
  }

  return prisma.$transaction(async (tx) => {
    const record = await tx.maintenanceRecord.findFirst({
      where: { id: recordId, garageId },
    });
    if (!record) throw new NotFoundError("Không tìm thấy lịch sử bảo dưỡng.");

    const updated = await tx.maintenanceRecord.update({
      where: { id: recordId },
      data: {
        description: `${record.description ?? ""}\n[ĐIỀU CHỈNH - ${new Date().toISOString()}]: ${trimmed}`.trim(),
      },
    });

    await recordAudit(
      {
        action: AUDIT_ACTIONS.MAINTENANCE_RECORD_AMENDED,
        entityType: "MaintenanceRecord",
        entityId: recordId,
        garageId,
        actorUserId,
        before: { description: record.description },
        after: { description: updated.description, correctionNote: trimmed },
      },
      tx,
    );

    return updated;
  });
}

export async function getVehicleHealthOverview(vehicleId: string) {
  const vehicle = await prisma.vehicle.findUnique({
    where: { id: vehicleId },
    include: {
      timelineEvents: { orderBy: { occurredAt: "desc" } },
      maintenance: { orderBy: { performedAt: "desc" } },
      systemStatuses: { orderBy: { updatedAt: "desc" } },
      warranties: { orderBy: { startsAt: "desc" } },
      shareLinks: { where: { revokedAt: null, expiresAt: { gt: new Date() } } },
    },
  });

  if (!vehicle) throw new NotFoundError("Không tìm thấy thông tin xe.");
  return vehicle;
}
