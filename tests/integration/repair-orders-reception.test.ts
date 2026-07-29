import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { createCustomerAppointment, confirmAppointment } from "@/features/appointments/service";
import { checkInAppointment, createWalkInRepairOrder } from "@/features/repair-orders/service";
import { getRepairOrderDetail } from "@/data/repair-orders";
import { BusinessRuleError } from "@/lib/errors";
import { prisma } from "@/lib/prisma";

const PREFIX = `test-reception-${Date.now()}`;
const scheduledAt = new Date("2030-01-02T02:00:00.000Z");
let garageId: string;
let customerUserId: string;
let actorUserId: string;
let customerId: string;
let vehicleId: string;

beforeAll(async () => {
  const garage = await prisma.garage.create({ data: { name: PREFIX, phone: "0900000000" } });
  garageId = garage.id;
  const [customerUser, actor] = await Promise.all([
    prisma.user.create({
      data: { email: `${PREFIX}-customer@example.com`, passwordHash: "test", name: "Khách" },
    }),
    prisma.user.create({
      data: { email: `${PREFIX}-staff@example.com`, passwordHash: "test", name: "Lễ tân", role: "STAFF" },
    }),
  ]);
  customerUserId = customerUser.id;
  actorUserId = actor.id;
  const customer = await prisma.customer.create({
    data: { garageId, userId: customerUserId, name: "Khách", phone: PREFIX },
  });
  customerId = customer.id;
  const vehicle = await prisma.vehicle.create({
    data: { licensePlate: PREFIX, brand: "Toyota", model: "Vios", currentKm: 10_000 },
  });
  vehicleId = vehicle.id;
  await prisma.vehicleOwnership.create({ data: { vehicleId, customerId } });
});

afterAll(async () => {
  if (!garageId) return;
  await prisma.auditLog.deleteMany({ where: { garageId } });
  await prisma.mileageLog.deleteMany({ where: { vehicleId } });
  await prisma.repairOrder.deleteMany({ where: { garageId } });
  await prisma.repairOrderSequence.deleteMany({ where: { garageId } });
  await prisma.appointment.deleteMany({ where: { garageId } });
  await prisma.vehicleOwnership.deleteMany({ where: { vehicleId } });
  await prisma.vehicle.deleteMany({ where: { id: vehicleId } });
  await prisma.customer.deleteMany({ where: { id: customerId } });
  await prisma.garage.deleteMany({ where: { id: garageId } });
  await prisma.user.deleteMany({ where: { id: { in: [customerUserId, actorUserId].filter(Boolean) } } });
});

describe("repair order reception", () => {
  it("checks in one confirmed appointment atomically", async () => {
    const appointment = await createCustomerAppointment(customerUserId, {
      vehicleId,
      scheduledAt,
      serviceRequest: "Bảo dưỡng",
      note: null,
    });
    await confirmAppointment(garageId, actorUserId, appointment.id);

    const result = await checkInAppointment(garageId, actorUserId, false, appointment.id, {
      mileageKm: 10_100,
      fuelLevel: 50,
      initialNote: "Xe rung nhẹ.",
      intakeChecklist: { exterior: true },
      overrideReason: null,
    });

    const [order, storedAppointment, vehicle, mileageLog] = await Promise.all([
      prisma.repairOrder.findUniqueOrThrow({ where: { id: result.id } }),
      prisma.appointment.findUniqueOrThrow({ where: { id: appointment.id } }),
      prisma.vehicle.findUniqueOrThrow({ where: { id: vehicleId } }),
      prisma.mileageLog.findFirst({ where: { vehicleId }, orderBy: { recordedAt: "desc" } }),
    ]);
    expect(result.code).toMatch(new RegExp(`^RO-${new Date().getFullYear()}-\\d{4}$`));
    expect(order).toMatchObject({ status: "RECEIVED", appointmentId: appointment.id, fuelLevel: 50 });
    expect(storedAppointment.status).toBe("ARRIVED");
    expect(vehicle.currentKm).toBe(10_100);
    expect(mileageLog?.mileageKm).toBe(10_100);

    await expect(
      checkInAppointment(garageId, actorUserId, false, appointment.id, {
        mileageKm: 10_100,
        fuelLevel: null,
        initialNote: null,
        intakeChecklist: {},
        overrideReason: null,
      }),
    ).rejects.toBeInstanceOf(BusinessRuleError);
    expect(await prisma.repairOrder.count({ where: { appointmentId: appointment.id } })).toBe(1);
  });

  it("creates a walk-in repair order only for a vehicle in the garage", async () => {
    const result = await createWalkInRepairOrder(garageId, actorUserId, false, {
      vehicleId,
      mileageKm: 10_200,
      fuelLevel: null,
      initialNote: null,
      intakeChecklist: {},
      overrideReason: null,
    });

    await expect(prisma.repairOrder.findUniqueOrThrow({ where: { id: result.id } })).resolves.toMatchObject({
      garageId,
      vehicleId,
      customerId,
      appointmentId: null,
      status: "RECEIVED",
    });
    await expect(getRepairOrderDetail(garageId, result.id)).resolves.toMatchObject({
      id: result.id,
      code: result.code,
      intakeChecklist: {},
      vehicle: { id: vehicleId },
      customer: { id: customerId },
    });
  });
});
