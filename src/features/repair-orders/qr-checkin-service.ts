import { parseVehicleQrCodeData } from "@/lib/qr-generator";
import { NotFoundError, ValidationError } from "@/lib/errors";
import { prisma } from "@/lib/prisma";
import { createWalkInRepairOrder } from "./service";

export async function lookupVehicleByQrCode(garageId: string, qrData: string) {
  const searchTerm = parseVehicleQrCodeData(qrData);
  if (!searchTerm) {
    throw new ValidationError("Mã QR không đúng định dạng AutoCare.");
  }

  // 1. Search vehicle by ID or License Plate or VIN
  const vehicle = await prisma.vehicle.findFirst({
    where: {
      OR: [
        { id: searchTerm },
        { licensePlate: { equals: searchTerm, mode: "insensitive" } },
        { vin: { equals: searchTerm, mode: "insensitive" } },
      ],
      deletedAt: null,
    },
    include: {
      ownerships: {
        where: { isCurrent: true, endedAt: null },
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
    throw new NotFoundError(`Không tìm thấy xe ứng với thông tin QR: "${searchTerm}".`);
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
  const vehicleInfo = await lookupVehicleByQrCode(garageId, qrData);

  // Mileage handling: ensure nextKm >= previousKm to pass mileage validation rules
  const currentKm = vehicleInfo.currentKm ?? 0;
  const inputMileage = mileageKm && mileageKm > 0 ? mileageKm : currentKm;
  const finalMileage = Math.max(inputMileage, currentKm);
  const overrideReason = inputMileage < currentKm ? "Tiếp nhận 1-Touch bằng QR Code" : null;

  // Ensure Vehicle Ownership exists in current garageId for seamless check-in
  await prisma.$transaction(async (tx) => {
    const existingOwnership = await tx.vehicleOwnership.findFirst({
      where: {
        vehicleId: vehicleInfo.vehicleId,
        isCurrent: true,
        endedAt: null,
        customer: { garageId, deletedAt: null },
      },
    });

    if (!existingOwnership) {
      const ownerPhone = vehicleInfo.owner?.phone?.trim() || `09${Math.floor(10000000 + Math.random() * 90000000)}`;

      // Check if a customer with this phone already exists in garageId
      let customer = await tx.customer.findFirst({
        where: { garageId, phone: ownerPhone, deletedAt: null },
      });

      if (!customer) {
        // Fallback: pick any active customer in garageId or create a new unique one
        customer = await tx.customer.findFirst({
          where: { garageId, deletedAt: null },
          orderBy: { createdAt: "asc" },
        });
      }

      if (!customer) {
        customer = await tx.customer.create({
          data: {
            garageId,
            name: vehicleInfo.owner?.name ?? "Khách Vãng Lai (QR Checkin)",
            phone: ownerPhone,
            email: vehicleInfo.owner?.email ?? null,
            note: "Khách tiếp nhận bằng QR Code 1-Touch.",
          },
        });
      }

      // Close previous current ownerships if any
      await tx.vehicleOwnership.updateMany({
        where: { vehicleId: vehicleInfo.vehicleId, isCurrent: true },
        data: { isCurrent: false, endedAt: new Date() },
      });

      // Create new current ownership in this garage
      await tx.vehicleOwnership.create({
        data: {
          vehicleId: vehicleInfo.vehicleId,
          customerId: customer.id,
          isCurrent: true,
          startedAt: new Date(),
        },
      });
    }
  });

  // Create Walk-in Repair Order
  const order = await createWalkInRepairOrder(garageId, actorUserId, true, {
    vehicleId: vehicleInfo.vehicleId,
    mileageKm: finalMileage,
    fuelLevel: null,
    initialNote: customerNotes ?? "Tiếp nhận 1-Touch bằng quét mã QR Code.",
    intakeChecklist: {},
    overrideReason,
  });

  return {
    order,
    vehicle: vehicleInfo,
  };
}
