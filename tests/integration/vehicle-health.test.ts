import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createInvoiceFromRepairOrder, issueInvoice, recordPayment } from "@/features/invoices/service";
import { saveQuotationDraft, sendQuotation, decideQuotationItem } from "@/features/quotations/service";
import { deliverVehicle, passQualityCheck } from "@/features/repair-orders/service";
import {
  createShareLink,
  getPublicVehicleHealth,
  getVehicleHealthOverview,
  revokeShareLink,
} from "@/features/vehicle-health/service";
import { updateWorkTaskStatus } from "@/features/work-tasks/service";
import { BusinessRuleError } from "@/lib/errors";
import { prisma } from "@/lib/prisma";

const PREFIX = `test-health-${Date.now()}`;

let garageId: string;
let actorUserId: string;
let customerUserId: string;
let vehicleId: string;
let repairOrderId: string;

beforeAll(async () => {
  const garage = await prisma.garage.create({
    data: { name: `${PREFIX}-garage`, phone: "0900000000" },
  });
  garageId = garage.id;

  const [customerUser, actorUser] = await Promise.all([
    prisma.user.create({
      data: { email: `${PREFIX}-cust@example.com`, passwordHash: "hash", name: "Trần Văn Khách" },
    }),
    prisma.user.create({
      data: { email: `${PREFIX}-staff@example.com`, passwordHash: "hash", name: "Nhân Viên Garage", role: "STAFF" },
    }),
  ]);
  customerUserId = customerUser.id;
  actorUserId = actorUser.id;

  await prisma.garageMember.create({
    data: { garageId, userId: actorUserId, role: "GARAGE_MANAGER" },
  });

  const customer = await prisma.customer.create({
    data: {
      garageId,
      userId: customerUserId,
      name: "Trần Văn Khách",
      phone: "0987654321",
      email: "tranvankhach@example.com",
      address: "100 Nguyen Hue, Q1",
    },
  });

  const vehicle = await prisma.vehicle.create({
    data: { licensePlate: "51K-77777", brand: "Ford", model: "Ranger", currentKm: 50000 },
  });
  vehicleId = vehicle.id;

  await prisma.vehicleOwnership.create({
    data: { vehicleId, customerId: customer.id, isCurrent: true },
  });

  const order = await prisma.repairOrder.create({
    data: {
      garageId,
      code: `RO-HLT-${Date.now()}`,
      vehicleId,
      customerId: customer.id,
      status: "INSPECTING",
      mileageKm: 50000,
    },
  });
  repairOrderId = order.id;

  // Complete repair order pipeline
  const q = await saveQuotationDraft(garageId, actorUserId, {
    repairOrderId,
    note: "Thay nhớt & lọc nhớt",
    validUntil: null,
    items: [
      { type: "SERVICE", description: "Bảo dưỡng 50.000 km", quantity: 1, unitPrice: 1200000, discountAmount: 0 },
    ],
  });
  await sendQuotation(garageId, actorUserId, q.id);

  const items = await prisma.quotationItem.findMany({ where: { quotationId: q.id } });
  await decideQuotationItem(customerUserId, items[0].id, { status: "APPROVED", customerNote: null });

  const tasks = await prisma.workTask.findMany({ where: { repairOrderId } });
  await updateWorkTaskStatus({ garageId, workTaskId: tasks[0].id, status: "IN_PROGRESS", actorUserId });
  await updateWorkTaskStatus({ garageId, workTaskId: tasks[0].id, status: "COMPLETED", actorUserId });

  await passQualityCheck({ garageId, repairOrderId, actorUserId });

  const inv = await createInvoiceFromRepairOrder({ garageId, repairOrderId, actorUserId });
  await issueInvoice({ garageId, invoiceId: inv.id, actorUserId });
  await recordPayment({ garageId, invoiceId: inv.id, amount: 1200000, actorUserId });
});

afterAll(async () => {
  await prisma.shareLink.deleteMany({ where: { vehicleId } });
  await prisma.warranty.deleteMany({ where: { vehicleId } });
  await prisma.vehicleTimelineEvent.deleteMany({ where: { vehicleId } });
  await prisma.maintenanceRecord.deleteMany({ where: { vehicleId } });
  await prisma.payment.deleteMany({ where: { garageId } });
  await prisma.invoiceItem.deleteMany({ where: { invoice: { garageId } } });
  await prisma.invoice.deleteMany({ where: { garageId } });
  await prisma.workTask.deleteMany({ where: { garageId } });
  await prisma.quotationItem.deleteMany({ where: { quotation: { garageId } } });
  await prisma.quotation.deleteMany({ where: { garageId } });
  await prisma.repairOrder.deleteMany({ where: { garageId } });
  await prisma.vehicleOwnership.deleteMany({ where: { vehicleId } });
  await prisma.vehicle.deleteMany({ where: { id: vehicleId } });
  await prisma.customer.deleteMany({ where: { garageId } });
  await prisma.garageMember.deleteMany({ where: { garageId } });
  await prisma.notification.deleteMany({ where: { garageId } });
  await prisma.auditLog.deleteMany({ where: { garageId } });
  await prisma.repairOrderSequence.deleteMany({ where: { garageId } });
  await prisma.user.deleteMany({ where: { id: { in: [customerUserId, actorUserId] } } });
  await prisma.garage.deleteMany({ where: { id: garageId } });
});

describe("Vehicle Health Record & Share Link Integration", () => {
  let shareLinkId: string;
  let shareToken: string;

  it("automatically generates MaintenanceRecord, TimelineEvent, and Warranty upon delivery", async () => {
    await deliverVehicle({ garageId, repairOrderId, actorUserId });

    const overview = await getVehicleHealthOverview(vehicleId);

    expect(overview.maintenance).toHaveLength(1);
    expect(overview.maintenance[0].source).toBe("VERIFIED_GARAGE_RECORD");
    expect(overview.maintenance[0].nextDueMileageKm).toBe(55000);

    expect(overview.timelineEvents).toHaveLength(1);
    expect(overview.timelineEvents[0].type).toBe("REPAIR");

    expect(overview.warranties.length).toBeGreaterThanOrEqual(1);
    expect(overview.warranties[0].isActive).toBe(true);
  });

  it("creates a share link and fetches public health record without owner PII (Rule 17)", async () => {
    const link = await createShareLink({
      vehicleId,
      durationDays: 14,
      garageId,
      createdById: actorUserId,
    });

    shareLinkId = link.id;
    shareToken = link.token;

    const publicHealth = await getPublicVehicleHealth(shareToken);

    expect(publicHealth.vehicle.brand).toBe("Ford");
    expect(publicHealth.vehicle.model).toBe("Ranger");
    expect(publicHealth.vehicle.licensePlateMasked).toBe("51K***77");

    // Ensure customer name/phone/address/email are NOT present in response
    const rawJSON = JSON.stringify(publicHealth);
    expect(rawJSON).not.toContain("Trần Văn Khách");
    expect(rawJSON).not.toContain("0987654321");
    expect(rawJSON).not.toContain("tranvankhach@example.com");
    expect(rawJSON).not.toContain("100 Nguyen Hue");
  });

  it("revokes share link and rejects access (Rule 18)", async () => {
    await revokeShareLink({ shareLinkId, actorUserId });

    await expect(getPublicVehicleHealth(shareToken)).rejects.toThrow(BusinessRuleError);
  });
});
