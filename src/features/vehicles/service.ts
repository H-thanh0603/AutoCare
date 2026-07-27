/**
 * Vehicle business operations.
 *
 * Actions validate and authorize requests, repositories scope and read/write data,
 * and this layer keeps multi-record operations atomic.
 */

import { getCustomerById } from "@/data/customers";
import {
  assertVehicleInGarage,
  closeCurrentOwnerships,
  countOpenRepairOrdersForVehicle,
  createMileageLog,
  createOwnership,
  createTimelineEvent,
  createVehicle,
  findCurrentOwnership,
  findVehicleByVin,
  setCurrentKm,
  softDeleteVehicle,
  updateVehicle,
  type VehicleWriteInput,
} from "@/data/vehicles";
import type {
  CreateVehicleInput,
  MileageInput,
  TransferOwnershipInput,
  VehicleInput,
} from "@/features/vehicles/schema";
import { AUDIT_ACTIONS, recordAudit } from "@/lib/audit";
import { BusinessRuleError } from "@/lib/errors";
import { prisma, type PrismaTx } from "@/lib/prisma";
import { Prisma } from "@/generated/prisma/client";
import { validateMileageChange } from "./mileage";

export { validateMileageChange } from "./mileage";

/** Prisma reports a unique-constraint breach as error code P2002. */
function isUniqueViolation(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code: unknown }).code === "P2002"
  );
}

/**
 * Serializes writes to one vehicle after applying the same tenant scope as its
 * normal reads. This prevents racing transfers or odometer updates from leaving
 * two current owners or a stale `currentKm`.
 */
async function lockGarageVehicle(
  tx: PrismaTx,
  garageId: string,
  vehicleId: string,
): Promise<void> {
  await tx.$queryRaw<{ id: string }[]>(Prisma.sql`
    SELECT v."id"
    FROM "vehicles" AS v
    INNER JOIN "vehicle_ownerships" AS o ON o."vehicleId" = v."id"
    INNER JOIN "customers" AS c ON c."id" = o."customerId"
    WHERE v."id" = ${vehicleId}
      AND v."deletedAt" IS NULL
      AND o."isCurrent" = true
      AND o."endedAt" IS NULL
      AND c."garageId" = ${garageId}
      AND c."deletedAt" IS NULL
    FOR UPDATE OF v
  `);
}

function vehicleWriteInput(input: VehicleInput): VehicleWriteInput {
  return {
    licensePlate: input.licensePlate,
    vin: input.vin,
    brand: input.brand,
    model: input.model,
    year: input.year,
    color: input.color,
    engineNumber: input.engineNumber,
  };
}

async function ensureVinAvailable(vin: string | null, vehicleId?: string): Promise<void> {
  if (!vin) return;
  const existing = await findVehicleByVin(vin);
  if (existing && existing.id !== vehicleId) {
    throw new BusinessRuleError("Số VIN/số khung đã tồn tại.");
  }
}

export async function createGarageVehicle(
  garageId: string,
  actorUserId: string,
  input: CreateVehicleInput,
): Promise<{ id: string }> {
  await ensureVinAvailable(input.vin);

  try {
    return await prisma.$transaction(async (tx) => {
      await getCustomerById(garageId, input.customerId, tx);
      const vehicle = await createVehicle(
        { ...vehicleWriteInput(input), currentKm: input.currentKm },
        tx,
      );
      await createOwnership({ vehicleId: vehicle.id, customerId: input.customerId }, tx);

      if (input.currentKm !== null) {
        await createMileageLog(
          {
            vehicleId: vehicle.id,
            garageId,
            mileageKm: input.currentKm,
            createdById: actorUserId,
          },
          tx,
        );
        await createTimelineEvent(
          {
            vehicleId: vehicle.id,
            garageId,
            type: "MILEAGE_UPDATE",
            title: "Ghi nhận số km ban đầu",
            mileageKm: input.currentKm,
            createdById: actorUserId,
          },
          tx,
        );
      }
      return vehicle;
    });
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw new BusinessRuleError("Số VIN/số khung đã tồn tại.");
    }
    throw error;
  }
}

export async function updateGarageVehicle(
  garageId: string,
  vehicleId: string,
  input: VehicleInput,
): Promise<void> {
  await assertVehicleInGarage(garageId, vehicleId);
  await ensureVinAvailable(input.vin, vehicleId);
  try {
    await updateVehicle(vehicleId, vehicleWriteInput(input));
  } catch (error) {
    if (isUniqueViolation(error)) {
      throw new BusinessRuleError("Số VIN/số khung đã tồn tại.");
    }
    throw error;
  }
}

export async function deleteGarageVehicle(
  garageId: string,
  vehicleId: string,
): Promise<void> {
  await assertVehicleInGarage(garageId, vehicleId);
  const openOrderCount = await countOpenRepairOrdersForVehicle(garageId, vehicleId);
  if (openOrderCount > 0) {
    throw new BusinessRuleError("Không thể xóa xe còn lệnh sửa chữa đang mở.");
  }
  await softDeleteVehicle(vehicleId);
}

export async function transferVehicleOwnership(
  garageId: string,
  vehicleId: string,
  actorUserId: string,
  input: TransferOwnershipInput,
): Promise<void> {
  await prisma.$transaction(async (tx) => {
    await lockGarageVehicle(tx, garageId, vehicleId);
    await assertVehicleInGarage(garageId, vehicleId, tx);
    await getCustomerById(garageId, input.customerId, tx);
    const currentOwnership = await findCurrentOwnership(vehicleId, tx);
    if (!currentOwnership) {
      throw new BusinessRuleError("Xe chưa có chủ sở hữu hiện tại.");
    }
    if (currentOwnership.customerId === input.customerId) {
      throw new BusinessRuleError("Khách hàng này đang là chủ sở hữu hiện tại.");
    }

    const transferredAt = new Date();
    await closeCurrentOwnerships(vehicleId, transferredAt, tx);
    await createOwnership({ vehicleId, customerId: input.customerId, note: input.note }, tx);
    await createTimelineEvent(
      {
        vehicleId,
        garageId,
        type: "OWNERSHIP_TRANSFER",
        title: "Chuyển chủ sở hữu xe",
        description: input.note,
        occurredAt: transferredAt,
        createdById: actorUserId,
      },
      tx,
    );
    await recordAudit(
      {
        action: AUDIT_ACTIONS.OWNERSHIP_TRANSFERRED,
        entityType: "VehicleOwnership",
        entityId: vehicleId,
        garageId,
        actorUserId,
        before: { customerId: currentOwnership.customerId },
        after: { customerId: input.customerId },
      },
      tx,
    );
  });
}

export async function recordVehicleMileage(
  garageId: string,
  vehicleId: string,
  actorUserId: string,
  isGarageManager: boolean,
  input: MileageInput,
): Promise<void> {
  await prisma.$transaction(async (tx) => {
    await lockGarageVehicle(tx, garageId, vehicleId);
    await assertVehicleInGarage(garageId, vehicleId, tx);
    const vehicle = await tx.vehicle.findUnique({
      where: { id: vehicleId },
      select: { currentKm: true },
    });
    if (!vehicle) {
      throw new BusinessRuleError("Không tìm thấy xe.");
    }

    validateMileageChange({
      previousKm: vehicle.currentKm,
      nextKm: input.mileageKm,
      overrideReason: input.overrideReason,
      isGarageManager,
    });

    const recordedAt = new Date();
    await createMileageLog(
      {
        vehicleId,
        garageId,
        mileageKm: input.mileageKm,
        note: input.note,
        overrideReason: input.overrideReason,
        createdById: actorUserId,
      },
      tx,
    );
    await setCurrentKm(vehicleId, input.mileageKm, tx);
    await createTimelineEvent(
      {
        vehicleId,
        garageId,
        type: "MILEAGE_UPDATE",
        title: "Cập nhật số km",
        description: input.note,
        occurredAt: recordedAt,
        mileageKm: input.mileageKm,
        createdById: actorUserId,
      },
      tx,
    );

    if (input.overrideReason) {
      await recordAudit(
        {
          action: AUDIT_ACTIONS.MILEAGE_OVERRIDDEN,
          entityType: "MileageLog",
          entityId: vehicleId,
          garageId,
          actorUserId,
          before: { mileageKm: vehicle.currentKm },
          after: { mileageKm: input.mileageKm },
          metadata: { overrideReason: input.overrideReason },
        },
        tx,
      );
    }
  });
}
