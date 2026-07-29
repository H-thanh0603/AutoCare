import { parseVehicleQrCodeData } from "@/lib/qr-generator";
import { NotFoundError, ValidationError } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import { createWalkInRepairOrder } from "./service";

export async function lookupVehicleByQrCode(garageId: string, qrData: string) {
  const vehicleId = parseVehicleQrCodeData(qrData);
  if (!vehicleId) {
    throw new ValidationError("Mã QR không đúng định dạng AutoCare.");
  }

  const vehicle = await prisma.vehicle.findFirst({
    where: { id: vehicleId },
    include: {
      ownerships: {
        where: { isCurrent: true },
        include: { customer: { select: { id: true, name: true, phone: true, email: true } } },
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
    throw new NotFoundError("Không tìm thấy xe ứng với mã QR này.");
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
  mileageKm?: number;
  customerNotes?: string;
  actorUserId: string;
}) {
  const { garageId, qrData, mileageKm, customerNotes, actorUserId } = input;
  const vehicle = await lookupVehicleByQrCode(garageId, qrData);

  const finalMileage = mileageKm ?? vehicle.currentKm ?? 0;

  const order = await createWalkInRepairOrder(garageId, actorUserId, true, {
    vehicleId: vehicle.vehicleId,
    mileageKm: finalMileage,
    fuelLevel: null,
    initialNote: customerNotes ?? "Tiếp nhận 1-Touch bằng quét mã QR Code.",
    intakeChecklist: {},
    overrideReason: null,
  });

  return {
    order,
    vehicle,
  };
}
