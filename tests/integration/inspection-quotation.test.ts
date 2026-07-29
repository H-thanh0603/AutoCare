import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { BusinessRuleError, NotFoundError } from "@/lib/errors";
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
  await prisma.notification.deleteMany({ where: { userId: customerUserId } });
  await prisma.quotationItem.deleteMany({ where: { quotation: { garageId } } });
  await prisma.quotation.deleteMany({ where: { garageId } });
  await prisma.inspectionItem.deleteMany({ where: { inspection: { garageId } } });
  await prisma.inspection.deleteMany({ where: { garageId } });
  await prisma.auditLog.deleteMany({ where: { garageId } });
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

  it("calculates a draft quotation and sends it to the customer", async () => {
    const { saveQuotationDraft, sendQuotation } = await import(
      "@/features/quotations/service"
    );
    const input = {
      repairOrderId,
      note: "Báo giá xử lý phanh.",
      validUntil: new Date(Date.now() + 24 * 60 * 60_000),
      items: [
        {
          type: "OTHER" as const,
          description: "Thay má phanh trước",
          quantity: 2,
          unitPrice: 350_000,
          discountAmount: 100_000,
        },
      ],
    };

    const quotation = await saveQuotationDraft(garageId, actorUserId, input);
    expect(quotation).toMatchObject({ versionNo: 1, status: "DRAFT", totalAmount: 600_000 });

    await sendQuotation(garageId, actorUserId, quotation.id);

    await expect(
      prisma.quotation.findUniqueOrThrow({ where: { id: quotation.id }, include: { items: true } }),
    ).resolves.toMatchObject({
      status: "SENT",
      totalAmount: 600_000,
      items: [expect.objectContaining({ totalAmount: 600_000, status: "PENDING" })],
    });
    await expect(prisma.repairOrder.findUniqueOrThrow({ where: { id: repairOrderId } })).resolves.toMatchObject({
      status: "WAITING_CUSTOMER_APPROVAL",
    });
    await expect(
      prisma.notification.findFirst({ where: { userId: customerUserId, type: "QUOTATION" } }),
    ).resolves.toMatchObject({ data: { href: `/tai-khoan/bao-gia/${quotation.id}` } });
    await expect(
      saveQuotationDraft(garageId, actorUserId, { ...input, id: quotation.id }),
    ).rejects.toBeInstanceOf(BusinessRuleError);
  });

  it("lets only the current vehicle owner approve a quotation item", async () => {
    const { decideQuotationItem } = await import("@/features/quotations/service");
    const quotation = await prisma.quotation.findFirstOrThrow({
      where: { repairOrderId, status: "SENT" },
      include: { items: true },
    });
    const item = quotation.items[0];

    await expect(
      decideQuotationItem("not-the-owner", item.id, { status: "APPROVED", customerNote: null }),
    ).rejects.toBeInstanceOf(NotFoundError);

    await decideQuotationItem(customerUserId, item.id, {
      status: "APPROVED",
      customerNote: "Đồng ý thay thế.",
    });

    await expect(prisma.quotation.findUniqueOrThrow({ where: { id: quotation.id } })).resolves.toMatchObject({
      status: "APPROVED",
    });
    await expect(prisma.quotationItem.findUniqueOrThrow({ where: { id: item.id } })).resolves.toMatchObject({
      status: "APPROVED",
      customerNote: "Đồng ý thay thế.",
    });
    await expect(
      prisma.auditLog.findFirst({ where: { garageId, entityId: item.id, action: "quotation.item_decided" } }),
    ).resolves.not.toBeNull();
  });

  it("replaces a sent quotation with an immutable revision", async () => {
    const { createQuotationRevision } = await import("@/features/quotations/service");
    const original = await prisma.quotation.findFirstOrThrow({
      where: { repairOrderId, status: "APPROVED" },
    });

    const revision = await createQuotationRevision(garageId, actorUserId, {
      quotationId: original.id,
      version: original.version,
      note: "Điều chỉnh sau khi tư vấn.",
      validUntil: new Date(Date.now() + 48 * 60 * 60_000),
      items: [
        {
          type: "OTHER",
          description: "Thay má phanh trước loại tiêu chuẩn",
          quantity: 1,
          unitPrice: 500_000,
          discountAmount: 0,
        },
      ],
    });

    await expect(prisma.quotation.findUniqueOrThrow({ where: { id: original.id } })).resolves.toMatchObject({
      status: "SUPERSEDED",
      supersededById: revision.id,
      version: original.version + 1,
    });
    expect(revision).toMatchObject({ versionNo: 2, status: "DRAFT", totalAmount: 500_000 });
  });

  it("scopes quotation reads and notification read state to the customer", async () => {
    const { getPortalQuotation } = await import("@/data/portal");
    const { listNotificationsForUser, markNotificationRead } = await import(
      "@/data/notifications"
    );
    const quotation = await prisma.quotation.findFirstOrThrow({ where: { repairOrderId } });
    const notifications = await listNotificationsForUser(customerUserId);

    await expect(getPortalQuotation("not-the-owner", quotation.id)).rejects.toBeInstanceOf(
      NotFoundError,
    );
    await expect(getPortalQuotation(customerUserId, quotation.id)).resolves.toMatchObject({
      id: quotation.id,
      repairOrder: { vehicle: { licensePlate: PREFIX } },
    });
    expect(notifications).toHaveLength(1);
    await markNotificationRead(customerUserId, notifications[0].id);
    await expect(prisma.notification.findUniqueOrThrow({ where: { id: notifications[0].id } })).resolves.toMatchObject({
      readAt: expect.any(Date),
    });
  });
});
