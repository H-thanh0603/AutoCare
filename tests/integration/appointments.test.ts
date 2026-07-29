import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { prisma } from "@/lib/prisma";

const PREFIX = `test-appointments-${Date.now()}`;
const at9 = new Date("2030-01-02T09:00:00.000Z");
const at10 = new Date("2030-01-02T10:00:00.000Z");
const at930 = new Date("2030-01-02T09:30:00.000Z");
const at1030 = new Date("2030-01-02T10:30:00.000Z");

let garageId: string;
let customerId: string;
let vehicleId: string;

beforeAll(async () => {
  const garage = await prisma.garage.create({
    data: { name: PREFIX, phone: "0900000000" },
  });
  garageId = garage.id;

  const customer = await prisma.customer.create({
    data: { garageId, name: "Khách hẹn kiểm thử", phone: PREFIX },
  });
  customerId = customer.id;

  const vehicle = await prisma.vehicle.create({
    data: { licensePlate: PREFIX, brand: "Toyota", model: "Vios" },
  });
  vehicleId = vehicle.id;
});

afterAll(async () => {
  await prisma.appointment.deleteMany({ where: { garageId } });
  await prisma.vehicle.deleteMany({ where: { id: vehicleId } });
  await prisma.customer.deleteMany({ where: { id: customerId } });
  await prisma.garage.deleteMany({ where: { id: garageId } });
});

describe("appointment ranges", () => {
  it("rejects overlapping PENDING appointments for one vehicle", async () => {
    const base = { garageId, customerId, vehicleId };

    await prisma.appointment.create({
      data: { ...base, scheduledAt: at9, endsAt: at10 },
    });

    await expect(
      prisma.appointment.create({
        data: { ...base, scheduledAt: at930, endsAt: at1030 },
      }),
    ).rejects.toMatchObject({ code: "23P01" });
  });
});
