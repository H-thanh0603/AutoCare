import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { prisma } from "@/lib/prisma";

const PREFIX = `test-inspection-quotation-${Date.now()}`;

let garageId: string;
let customerId: string;
let customerUserId: string;
let vehicleId: string;
let repairOrderId: string;

beforeAll(async () => {
  const garage = await prisma.garage.create({
    data: { name: `${PREFIX}-garage`, phone: "0900000000" },
  });
  garageId = garage.id;

  const user = await prisma.user.create({
    data: {
      email: `${PREFIX}-customer@example.com`,
      passwordHash: "test-password-hash",
      name: "Khách kiểm thử",
    },
  });
  customerUserId = user.id;

  const customer = await prisma.customer.create({
    data: { garageId, userId: customerUserId, name: "Khách kiểm thử", phone: PREFIX },
  });
  customerId = customer.id;

  const vehicle = await prisma.vehicle.create({
    data: { licensePlate: PREFIX, brand: "Toyota", model: "Vios" },
  });
  vehicleId = vehicle.id;
  await prisma.vehicleOwnership.create({ data: { vehicleId, customerId } });

  const repairOrder = await prisma.repairOrder.create({
    data: {
      garageId,
      code: "RO-M4-0001",
      vehicleId,
      customerId,
    },
  });
  repairOrderId = repairOrder.id;
});

afterAll(async () => {
  if (!garageId) return;
  await prisma.inspection.deleteMany({ where: { garageId } });
  await prisma.repairOrder.deleteMany({ where: { garageId } });
  await prisma.vehicleOwnership.deleteMany({ where: { vehicleId } });
  await prisma.vehicle.deleteMany({ where: { id: vehicleId } });
  await prisma.customer.deleteMany({ where: { id: customerId } });
  await prisma.garage.deleteMany({ where: { id: garageId } });
  await prisma.user.deleteMany({ where: { id: customerUserId } });
});

describe("inspection and quotation invariants", () => {
  it("rejects a second inspection for the same repair order", async () => {
    await prisma.inspection.create({ data: { garageId, repairOrderId } });

    await expect(
      prisma.inspection.create({ data: { garageId, repairOrderId } }),
    ).rejects.toMatchObject({ code: "P2002" });
  });
});
