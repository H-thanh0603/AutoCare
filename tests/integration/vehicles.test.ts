import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { getCustomerById } from "@/data/customers";
import { getVehicleById } from "@/data/vehicles";
import { createGarageCustomer } from "@/features/customers/service";
import {
  createGarageVehicle,
  recordVehicleMileage,
  transferVehicleOwnership,
} from "@/features/vehicles/service";
import { createVehicleSchema } from "@/features/vehicles/schema";
import { NotFoundError } from "@/lib/errors";
import { prisma } from "@/lib/prisma";

const PREFIX = `test-vehicles-${Date.now()}`;
let garageAId: string;
let garageBId: string;
let customerAId: string;
let customerA2Id: string;
let actorUserId: string;
let vehicleId: string;

beforeAll(async () => {
  const [garageA, garageB] = await Promise.all([
    prisma.garage.create({ data: { name: `${PREFIX}-a`, phone: "0900000001" } }),
    prisma.garage.create({ data: { name: `${PREFIX}-b`, phone: "0900000002" } }),
  ]);
  garageAId = garageA.id;
  garageBId = garageB.id;
  const actor = await prisma.user.create({
    data: {
      email: `${PREFIX}@example.com`,
      passwordHash: "test-password-hash",
      name: "Nhân viên kiểm thử",
      role: "STAFF",
    },
  });
  actorUserId = actor.id;

  const customerA = await createGarageCustomer(garageAId, {
    name: "Nguyễn Minh An",
    phone: "0912345678",
    email: null,
    address: null,
    note: null,
  });
  customerAId = customerA.id;
  const customerA2 = await createGarageCustomer(garageAId, {
    name: "Trần Thu Bình",
    phone: "0987654321",
    email: null,
    address: null,
    note: null,
  });
  customerA2Id = customerA2.id;

  const vehicleInput = createVehicleSchema.parse({
    customerId: customerAId,
    licensePlate: "51F-123.45",
    vin: "",
    brand: "Toyota",
    model: "Vios",
    year: 2023,
    color: "",
    engineNumber: "",
    currentKm: 50_000,
  });
  const vehicle = await createGarageVehicle(garageAId, actorUserId, vehicleInput);
  vehicleId = vehicle.id;
});

afterAll(async () => {
  await prisma.auditLog.deleteMany({ where: { entityId: vehicleId } });
  await prisma.vehicleTimelineEvent.deleteMany({ where: { vehicleId } });
  await prisma.mileageLog.deleteMany({ where: { vehicleId } });
  await prisma.vehicleOwnership.deleteMany({ where: { vehicleId } });
  await prisma.vehicle.deleteMany({ where: { id: vehicleId } });
  await prisma.customer.deleteMany({ where: { garageId: { in: [garageAId, garageBId] } } });
  await prisma.garage.deleteMany({ where: { id: { in: [garageAId, garageBId] } } });
  await prisma.user.deleteMany({ where: { id: actorUserId } });
});

describe("vehicle garage scope", () => {
  it("normalizes the stored license plate and exposes it in its owner garage", async () => {
    const vehicle = await getVehicleById(garageAId, vehicleId);
    expect(vehicle.licensePlate).toBe("51F12345");
    expect(vehicle.owner?.id).toBe(customerAId);
  });

  it("returns NotFoundError for a vehicle outside the garage", async () => {
    await expect(getVehicleById(garageBId, vehicleId)).rejects.toBeInstanceOf(NotFoundError);
  });

  it("allows a duplicate phone in a different garage", async () => {
    const customerB = await createGarageCustomer(garageBId, {
      name: "Khách khác gara",
      phone: "0912345678",
      email: null,
      address: null,
      note: null,
    });
    expect(customerB.id).toBeTruthy();
  });
});

describe("vehicle ownership and mileage", () => {
  it("transfers ownership atomically and retains technical history", async () => {
    await transferVehicleOwnership(garageAId, vehicleId, actorUserId, {
      customerId: customerA2Id,
      note: "Bán lại xe cho chủ mới.",
    });

    const vehicle = await prisma.vehicle.findUniqueOrThrow({
      where: { id: vehicleId },
      select: {
        ownerships: { select: { customerId: true, isCurrent: true, endedAt: true } },
        mileageLogs: { select: { mileageKm: true } },
      },
    });
    expect(vehicle.ownerships.filter((ownership) => ownership.isCurrent)).toEqual([
      expect.objectContaining({ customerId: customerA2Id, endedAt: null }),
    ]);
    expect(vehicle.mileageLogs).toContainEqual({ mileageKm: 50_000 });
  });

  it("rejects a lower mileage without an override", async () => {
    await expect(
      recordVehicleMileage(garageAId, vehicleId, actorUserId, false, {
        mileageKm: 49_000,
        note: null,
        overrideReason: null,
      }),
    ).rejects.toMatchObject({ message: expect.stringContaining("không được nhỏ hơn") });
  });

  it("records a manager mileage override with an audit row", async () => {
    await recordVehicleMileage(garageAId, vehicleId, actorUserId, true, {
      mileageKm: 49_000,
      note: "Thay cụm đồng hồ.",
      overrideReason: "Đồng hồ đã được thay mới.",
    });

    const [vehicle, audit] = await Promise.all([
      prisma.vehicle.findUniqueOrThrow({ where: { id: vehicleId }, select: { currentKm: true } }),
      prisma.auditLog.findFirst({
        where: { entityId: vehicleId, action: "vehicle.mileage_overridden" },
        select: { id: true },
      }),
    ]);
    expect(vehicle.currentKm).toBe(49_000);
    expect(audit).not.toBeNull();
  });

  it("keeps a transferred customer in the same garage readable", async () => {
    await expect(getCustomerById(garageAId, customerA2Id)).resolves.toMatchObject({ id: customerA2Id });
  });
});
