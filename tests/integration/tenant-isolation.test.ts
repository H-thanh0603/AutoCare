/**
 * Tenant isolation.
 *
 * Proves the rule from the spec: a resource owned by another garage must read as
 * "not found", never as "forbidden" and never with its data attached. Leaking
 * the difference would tell an attacker that the id exists somewhere else.
 */

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  findRepairOrderById,
  getRepairOrderById,
  listRepairOrders,
} from "@/data/repair-orders";
import { NotFoundError } from "@/lib/errors";
import { prisma } from "@/lib/prisma";

/** Unique per run so parallel runs and seeded demo data never collide. */
const PREFIX = `test-tenant-${Date.now()}`;

let garageAId: string;
let garageBId: string;
let orderAId: string;
let orderBId: string;

async function createGarageWithOrder(label: string) {
  const garage = await prisma.garage.create({
    data: { name: `${PREFIX}-${label}`, phone: "0900000000" },
  });

  const customer = await prisma.customer.create({
    data: {
      garageId: garage.id,
      name: `Khách hàng ${label}`,
      phone: `${PREFIX}-${label}-phone`,
    },
  });

  const vehicle = await prisma.vehicle.create({
    data: {
      licensePlate: `${PREFIX}-${label}`,
      brand: "Toyota",
      model: "Vios",
    },
  });

  await prisma.vehicleOwnership.create({
    data: {
      vehicleId: vehicle.id,
      customerId: customer.id,
      startedAt: new Date(),
      isCurrent: true,
    },
  });

  const order = await prisma.repairOrder.create({
    data: {
      garageId: garage.id,
      code: `${PREFIX}-${label}-RO`,
      vehicleId: vehicle.id,
      customerId: customer.id,
      status: "RECEIVED",
      receivedAt: new Date(),
    },
  });

  return { garageId: garage.id, orderId: order.id };
}

beforeAll(async () => {
  const a = await createGarageWithOrder("a");
  const b = await createGarageWithOrder("b");
  garageAId = a.garageId;
  garageBId = b.garageId;
  orderAId = a.orderId;
  orderBId = b.orderId;
});

afterAll(async () => {
  // Children first: repair orders reference vehicles and customers.
  await prisma.repairOrder.deleteMany({ where: { code: { startsWith: PREFIX } } });
  await prisma.vehicleOwnership.deleteMany({
    where: { vehicle: { licensePlate: { startsWith: PREFIX } } },
  });
  await prisma.vehicle.deleteMany({
    where: { licensePlate: { startsWith: PREFIX } },
  });
  await prisma.customer.deleteMany({ where: { phone: { startsWith: PREFIX } } });
  await prisma.garage.deleteMany({ where: { name: { startsWith: PREFIX } } });
});

describe("repair order tenant isolation", () => {
  it("reads its own order", async () => {
    const order = await getRepairOrderById(garageAId, orderAId);
    expect(order.id).toBe(orderAId);
  });

  it("returns null for an order owned by another garage", async () => {
    await expect(findRepairOrderById(garageAId, orderBId)).resolves.toBeNull();
  });

  it("throws NotFoundError — not ForbiddenError — for another garage's order", async () => {
    await expect(getRepairOrderById(garageAId, orderBId)).rejects.toBeInstanceOf(
      NotFoundError,
    );
  });

  it("uses the same message for a foreign id and a non-existent id", async () => {
    const foreign = await getRepairOrderById(garageAId, orderBId).catch(
      (error: unknown) => error,
    );
    const missing = await getRepairOrderById(
      garageAId,
      "00000000-0000-0000-0000-000000000000",
    ).catch((error: unknown) => error);

    expect(foreign).toBeInstanceOf(NotFoundError);
    expect(missing).toBeInstanceOf(NotFoundError);
    expect((foreign as NotFoundError).message).toBe(
      (missing as NotFoundError).message,
    );
  });

  it("never includes another garage's orders in a list", async () => {
    const listA = await listRepairOrders(garageAId, { take: 200 });
    const listB = await listRepairOrders(garageBId, { take: 200 });

    expect(listA.map((order) => order.id)).toContain(orderAId);
    expect(listA.map((order) => order.id)).not.toContain(orderBId);
    expect(listB.map((order) => order.id)).toContain(orderBId);
    expect(listB.map((order) => order.id)).not.toContain(orderAId);
  });
});
