import { parseVehicleQrCodeData } from "@/lib/qr-generator";
import { NotFoundError, ValidationError } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import { createWalkInRepairOrder } from "./service";

/**
 * Resolves a scanned QR payload (or license plate / VIN) to a vehicle that is
 * currently owned by a customer of THIS garage. A vehicle that exists but is
 * not registered here is treated as "not found" for this garage, so QR check-in
 * can never silently pull a vehicle out of another garage's tenant scope.
 */
export async function lookupVehicleByQrCode(garageId: string, qrData: string) {
  const searchTerm = parseVehicleQrCodeData(qrData);
  if (!searchTerm) {
    throw new ValidationError("Mã QR không đúng định dạng AutoCare.");
  }

  const vehicle = await prisma.vehicle.findFirst({
    where: {
      OR: [
        { id: searchTerm },
        { licensePlate: { equals: searchTerm, mode: "insensitive" } },
        { vin: { equals: searchTerm, mode: "insensitive" } },
      ],
      deletedAt: null,
      // Tenant scope: the vehicle must have a current ownership in this garage.
      ownerships: {
        some: {
          isCurrent: true,
          endedAt: null,
          customer: { garageId, deletedAt: null },
        },
      },
    },
    include: {
      ownerships: {
        where: { isCurrent: true, endedAt: null, customer: { garageId, deletedAt: null } },
        include: { customer: { select: { id: true, name: true, phone: true, email: true, garageId: true } } },
      },
      repairOrders: {
        where: { garageId },
        orderBy: { receivedAt: "desc" },
        take: 3,
        select: {
          id: true,
          code: true,
          status: true,
          receivedAt: true,
          mileageKm: true,
        },
      },
    },
  });

  if (!vehicle) {
    throw new NotFoundError(
      `Không tìm thấy xe của garage ứng với thông tin "${searchTerm}". Nếu là xe mới, hãy tiếp nhận qua luồng khách vãng lai.`,
    );
  }

  const currentOwner = vehicle.ownerships[0]?.customer ?? null;

  return {
    vehicleId: vehicle.id,
    licensePlate: vehicle.licensePlate,
    brand: vehicle.brand,
    model: vehicle.model,
    year: vehicle.year,
    currentKm: vehicle.currentKm,
    owner: currentOwner,
    recentOrders: vehicle.repairOrders,
  };
}

export async function instantCheckinByQrCode(input: {
  garageId: string;
  qrData: string;
  isGarageManager: boolean;
  mileageKm?: number;
  customerNotes?: string;
  actorUserId: string;
}) {
  const { garageId, qrData, isGarageManager, mileageKm, customerNotes, actorUserId } = input;
  const vehicleInfo = await lookupVehicleByQrCode(garageId, qrData);

  // The vehicle is guaranteed to be owned in this garage (see lookup), so we
  // hand straight off to the walk-in flow. The odometer value is passed through
  // untouched: createWalkInRepairOrder -> validateMileageChange decides whether
  // a decrease is allowed based on the actor's real role, instead of silently
  // clamping or forging an override reason.
  const currentKm = vehicleInfo.currentKm ?? 0;
  const inputMileage = mileageKm && mileageKm > 0 ? mileageKm : currentKm;

  const order = await createWalkInRepairOrder(garageId, actorUserId, isGarageManager, {
    vehicleId: vehicleInfo.vehicleId,
    mileageKm: inputMileage,
    fuelLevel: null,
    initialNote: customerNotes ?? "Tiếp nhận 1-Touch bằng quét mã QR Code.",
    intakeChecklist: {},
    overrideReason: null,
  });

  return {
    order,
    vehicle: vehicleInfo,
  };
}
