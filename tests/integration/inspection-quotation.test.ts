import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { NotFoundError } from "@/lib/errors";
import { prisma } from "@/lib/prisma";

const PREFIX = `test-inspection-quotation-${Date.now()}`;

let garageId: string;
let otherGarageId: string;
let actorUserId: string;
let customerId: string;
let customerUserId: string;
let vehicleId: string;
let repairOrderId: string;

beforeAll(async () => {
  const [garage, otherGarage] = await Promise.all([
    prisma.garage.create({
      data: { name: `${PREFIX}-garage`, phone: "0900000000" },
    }),
    prisma.garage.create({
      data: { name: `${PREFIX}-other`, phone: "0900000001" },
    }),
  ]);
  garageId = garage.id;
  otherGarageId = otherGarage.id;

  const [user, actor] = await Promise.all([
    prisma.user.create({
      data: {
        email: `${PREFIX}-customer@example.com`,
        passwordHash: "test-password-hash",
        name: "Khách kiểm thử",
      },
    }),
    prisma.user.create({
      data: {
        email: `${PREFIX}-actor@example.com`,
        passwordHash: "test-password-hash",
        name: "Nhân viên kiểm thử",
        role: "STAFF",
      },
    }),
  ]);
  customerUserId = user.id;
  actorUserId = actor.id;

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
  await prisma.inspectionItem.deleteMany({ where: { inspection: { garageId } } });
  await prisma.inspection.deleteMany({ where: { garageId } });
  await prisma.repairOrder.deleteMany({ where: { garageId } });
  await prisma.vehicleOwnership.deleteMany({ where: { vehicleId } });
  await prisma.vehicle.deleteMany({ where: { id: vehicleId } });
  await prisma.customer.deleteMany({ where: { id: customerId } });
  await prisma.garage.deleteMany({ where: { id: { in: [garageId, otherGarageId] } } });
  await prisma.user.deleteMany({ where: { id: { in: [customerUserId, actorUserId] } } });
});

describe("inspection and quotation invariants", () => {
  it("rejects a second inspection for the same repair order", async () => {
    await prisma.inspection.create({ data: { garageId, repairOrderId } });

    await expect(
      prisma.inspection.create({ data: { garageId, repairOrderId } }),
    ).rejects.toMatchObject({ code: "P2002" });

    await prisma.inspection.deleteMany({ where: { repairOrderId } });
  });

  it("starts a scoped inspection and saves its findings", async () => {
    const { getInspectionForRepairOrder } = await import("@/data/inspections");
    const { saveInspection, startInspection } = await import(
      "@/features/inspections/service"
    );

    await expect(startInspection(otherGarageId, actorUserId, repairOrderId)).rejects.toBeInstanceOf(
      NotFoundError,
    );

    const inspection = await startInspection(garageId, actorUserId, repairOrderId);
    await saveInspection(garageId, actorUserId, repairOrderId, {
      summary: "Phát hiện cần xử lý phanh trước.",
      items: [
        {
          category: "Phanh",
          name: "Má phanh trước",
          severity: "URGENT",
          finding: "Mòn dưới giới hạn.",
          recommendation: "Thay má phanh trước.",
        },
      ],
    });

    await expect(prisma.repairOrder.findUniqueOrThrow({ where: { id: repairOrderId } })).resolves.toMatchObject({
      status: "INSPECTING",
    });
    await expect(getInspectionForRepairOrder(garageId, repairOrderId)).resolves.toMatchObject({
      id: inspection.id,
      summary: "Phát hiện cần xử lý phanh trước.",
      items: [
        expect.objectContaining({ name: "Má phanh trước", severity: "URGENT", sortOrder: 0 }),
      ],
    });
    await expect(
      prisma.auditLog.findFirst({ where: { garageId, entityId: inspection.id, action: "inspection.updated" } }),
    ).resolves.not.toBeNull();
  });
});
