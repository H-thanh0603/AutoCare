/**
 * Demo data seed.
 *
 * Creates two garages so tenant isolation can be exercised, a full set of staff
 * roles, and repair orders at every interesting stage of the workflow: waiting
 * for customer approval, in progress, and delivered with a paid invoice.
 *
 * Amounts are integers in VND. Run with `pnpm db:seed` (idempotent: it clears
 * the demo rows first, so never point it at production).
 */

import "dotenv/config";

import { hashPassword } from "../src/lib/password";
import { calculateInvoiceTotals, calculateLineTotal } from "../src/lib/money";
import { prisma } from "../src/lib/prisma";

const DEMO_PASSWORD = "AutoCare@2026";

/** Fixed clock so relative dates in the demo data stay consistent. */
const NOW = new Date();

function daysAgo(days: number): Date {
  const date = new Date(NOW);
  date.setDate(date.getDate() - days);
  return date;
}

function daysFromNow(days: number): Date {
  return daysAgo(-days);
}

function monthsFromNow(months: number): Date {
  const date = new Date(NOW);
  date.setMonth(date.getMonth() + months);
  return date;
}

/**
 * Deletes existing rows in dependency order. Truncating instead of upserting
 * keeps the seed readable and guarantees a known state for E2E runs.
 */
async function resetDatabase(): Promise<void> {
  await prisma.$transaction([
    prisma.notification.deleteMany(),
    prisma.media.deleteMany(),
    prisma.shareLink.deleteMany(),
    prisma.warranty.deleteMany(),
    prisma.vehicleSystemStatus.deleteMany(),
    prisma.maintenanceRecord.deleteMany(),
    prisma.vehicleTimelineEvent.deleteMany(),
    prisma.payment.deleteMany(),
    prisma.invoiceItem.deleteMany(),
    prisma.invoice.deleteMany(),
    prisma.inventoryTransaction.deleteMany(),
    prisma.workLog.deleteMany(),
    prisma.workTask.deleteMany(),
    prisma.quotationItem.deleteMany(),
    prisma.quotation.deleteMany(),
    prisma.inspectionItem.deleteMany(),
    prisma.inspection.deleteMany(),
    prisma.auditLog.deleteMany(),
    prisma.repairOrder.deleteMany(),
    prisma.repairOrderSequence.deleteMany(),
    prisma.appointment.deleteMany(),
    prisma.mileageLog.deleteMany(),
    prisma.vehicleOwnership.deleteMany(),
    prisma.vehicle.deleteMany(),
    prisma.customer.deleteMany(),
    prisma.part.deleteMany(),
    prisma.service.deleteMany(),
    prisma.garageMember.deleteMany(),
    prisma.garage.deleteMany(),
    prisma.user.deleteMany(),
  ]);
}

async function main(): Promise<void> {
  console.log("Đang xóa dữ liệu cũ...");
  await resetDatabase();

  const passwordHash = await hashPassword(DEMO_PASSWORD);

  /* ---------------------------------------------------------------- */
  /* Garages                                                          */
  /* ---------------------------------------------------------------- */

  const garage = await prisma.garage.create({
    data: {
      name: "Gara Ô Tô Thành Đạt",
      address: "185 Nguyễn Văn Cừ, Long Biên, Hà Nội",
      phone: "02438725160",
      email: "lienhe@garathanhdat.vn",
      settings: {
        allowNegativeStock: false,
        taxPercent: 8,
        appointmentSlotMinutes: 60,
        workingHours: {
          1: { open: "08:00", close: "17:00" },
          2: { open: "08:00", close: "17:00" },
          3: { open: "08:00", close: "17:00" },
          4: { open: "08:00", close: "17:00" },
          5: { open: "08:00", close: "17:00" },
          6: { open: "08:00", close: "17:00" },
        },
      },
    },
  });

  // Second tenant: exists so integration tests can prove data never crosses over.
  const otherGarage = await prisma.garage.create({
    data: {
      name: "Gara Minh Phát Auto",
      address: "62 Trường Chinh, Thanh Xuân, Hà Nội",
      phone: "02436281944",
      email: "cskh@minhphatauto.vn",
      settings: {
        allowNegativeStock: false,
        taxPercent: 8,
        appointmentSlotMinutes: 60,
        workingHours: {
          1: { open: "08:00", close: "17:00" },
          2: { open: "08:00", close: "17:00" },
          3: { open: "08:00", close: "17:00" },
          4: { open: "08:00", close: "17:00" },
          5: { open: "08:00", close: "17:00" },
          6: { open: "08:00", close: "17:00" },
        },
      },
    },
  });

  /* ---------------------------------------------------------------- */
  /* Staff                                                            */
  /* ---------------------------------------------------------------- */

  const manager = await prisma.user.create({
    data: {
      email: "quanly@garathanhdat.vn",
      name: "Trần Quốc Thành",
      phone: "0912345001",
      passwordHash,
      role: "STAFF",
      memberships: { create: { garageId: garage.id, role: "GARAGE_MANAGER" } },
    },
  });

  const receptionist = await prisma.user.create({
    data: {
      email: "letan@garathanhdat.vn",
      name: "Nguyễn Thu Hà",
      phone: "0912345002",
      passwordHash,
      role: "STAFF",
      memberships: { create: { garageId: garage.id, role: "RECEPTIONIST" } },
    },
  });

  const technician = await prisma.user.create({
    data: {
      email: "kythuat1@garathanhdat.vn",
      name: "Lê Văn Dũng",
      phone: "0912345003",
      passwordHash,
      role: "STAFF",
      memberships: { create: { garageId: garage.id, role: "TECHNICIAN" } },
    },
  });

  const technician2 = await prisma.user.create({
    data: {
      email: "kythuat2@garathanhdat.vn",
      name: "Phạm Minh Tuấn",
      phone: "0912345004",
      passwordHash,
      role: "STAFF",
      memberships: { create: { garageId: garage.id, role: "TECHNICIAN" } },
    },
  });

  const cashier = await prisma.user.create({
    data: {
      email: "thungan@garathanhdat.vn",
      name: "Vũ Thị Lan",
      phone: "0912345005",
      passwordHash,
      role: "STAFF",
      memberships: { create: { garageId: garage.id, role: "CASHIER" } },
    },
  });

  // Staff of the other garage, for cross-tenant access tests.
  await prisma.user.create({
    data: {
      email: "quanly@minhphatauto.vn",
      name: "Đỗ Minh Phát",
      phone: "0987650001",
      passwordHash,
      role: "STAFF",
      memberships: { create: { garageId: otherGarage.id, role: "GARAGE_MANAGER" } },
    },
  });

  await prisma.user.create({
    data: {
      email: "admin@autocare.vn",
      name: "Quản trị hệ thống",
      passwordHash,
      role: "PLATFORM_ADMIN",
    },
  });

  /* ---------------------------------------------------------------- */
  /* Portal customers                                                 */
  /* ---------------------------------------------------------------- */

  const hoangUser = await prisma.user.create({
    data: {
      email: "hoang.nguyen@example.com",
      name: "Nguyễn Văn Hoàng",
      phone: "0903111222",
      passwordHash,
      role: "CUSTOMER",
    },
  });

  const maiUser = await prisma.user.create({
    data: {
      email: "mai.tran@example.com",
      name: "Trần Thị Mai",
      phone: "0903333444",
      passwordHash,
      role: "CUSTOMER",
    },
  });

  const hoang = await prisma.customer.create({
    data: {
      garageId: garage.id,
      userId: hoangUser.id,
      name: "Nguyễn Văn Hoàng",
      phone: "0903111222",
      email: "hoang.nguyen@example.com",
      address: "Số 12, ngõ 45 Trần Đại Nghĩa, Hai Bà Trưng, Hà Nội",
      note: "Khách quen, thường bảo dưỡng định kỳ mỗi 6 tháng.",
    },
  });

  const mai = await prisma.customer.create({
    data: {
      garageId: garage.id,
      userId: maiUser.id,
      name: "Trần Thị Mai",
      phone: "0903333444",
      email: "mai.tran@example.com",
      address: "88 Nguyễn Trãi, Thanh Xuân, Hà Nội",
    },
  });

  const cuong = await prisma.customer.create({
    data: {
      garageId: garage.id,
      name: "Phạm Văn Cường",
      phone: "0903555666",
      address: "Khu đô thị Việt Hưng, Long Biên, Hà Nội",
      note: "Chạy dịch vụ, số km tăng nhanh.",
    },
  });

  // Customer of the other garage (same phone would be legal there).
  await prisma.customer.create({
    data: {
      garageId: otherGarage.id,
      name: "Lê Thị Bích",
      phone: "0903111222",
      address: "23 Khương Trung, Thanh Xuân, Hà Nội",
    },
  });

  /* ---------------------------------------------------------------- */
  /* Vehicles                                                         */
  /* ---------------------------------------------------------------- */

  const vios = await prisma.vehicle.create({
    data: {
      vin: "RL4KA2CD8LA123456",
      licensePlate: "30G-123.45",
      brand: "Toyota",
      model: "Vios 1.5G",
      year: 2020,
      color: "Bạc",
      engineNumber: "2NR-1234567",
      currentKm: 64_500,
      ownerships: {
        create: {
          customerId: hoang.id,
          startedAt: daysAgo(1200),
          isCurrent: true,
          note: "Mua mới tại đại lý.",
        },
      },
    },
  });

  const cx5 = await prisma.vehicle.create({
    data: {
      vin: "JM7KFBCM2M0345678",
      licensePlate: "30K-678.90",
      brand: "Mazda",
      model: "CX-5 2.0 Premium",
      year: 2021,
      color: "Đỏ pha lê",
      currentKm: 41_200,
      ownerships: {
        create: {
          customerId: mai.id,
          startedAt: daysAgo(900),
          isCurrent: true,
        },
      },
    },
  });

  const xpander = await prisma.vehicle.create({
    data: {
      licensePlate: "29A-456.78",
      brand: "Mitsubishi",
      model: "Xpander 1.5 AT",
      year: 2019,
      color: "Trắng",
      currentKm: 138_900,
      ownerships: {
        create: {
          customerId: cuong.id,
          startedAt: daysAgo(400),
          isCurrent: true,
          note: "Xe mua lại, chủ trước ở tỉnh khác.",
        },
      },
    },
  });

  await prisma.mileageLog.createMany({
    data: [
      { vehicleId: vios.id, garageId: garage.id, mileageKm: 52_000, recordedAt: daysAgo(210), note: "Bảo dưỡng 50.000 km" },
      { vehicleId: vios.id, garageId: garage.id, mileageKm: 58_300, recordedAt: daysAgo(95), note: "Thay dầu động cơ" },
      { vehicleId: vios.id, garageId: garage.id, mileageKm: 64_500, recordedAt: daysAgo(3), note: "Tiếp nhận sửa chữa" },
      { vehicleId: cx5.id, garageId: garage.id, mileageKm: 35_800, recordedAt: daysAgo(160) },
      { vehicleId: cx5.id, garageId: garage.id, mileageKm: 41_200, recordedAt: daysAgo(1) },
      { vehicleId: xpander.id, garageId: garage.id, mileageKm: 120_400, recordedAt: daysAgo(180) },
      { vehicleId: xpander.id, garageId: garage.id, mileageKm: 138_900, recordedAt: daysAgo(2) },
    ],
  });

  await prisma.vehicleSystemStatus.createMany({
    data: [
      { vehicleId: vios.id, system: "ENGINE", condition: "GOOD", lastCheckedAt: daysAgo(3) },
      { vehicleId: vios.id, system: "BRAKES", condition: "FAIR", note: "Má phanh trước còn khoảng 30%.", lastCheckedAt: daysAgo(3) },
      { vehicleId: vios.id, system: "TIRES", condition: "GOOD", lastCheckedAt: daysAgo(3) },
      { vehicleId: vios.id, system: "BATTERY", condition: "FAIR", note: "Ắc quy dùng 3 năm, cần theo dõi.", lastCheckedAt: daysAgo(3) },
      { vehicleId: cx5.id, system: "ENGINE", condition: "GOOD", lastCheckedAt: daysAgo(1) },
      { vehicleId: cx5.id, system: "AIR_CONDITIONING", condition: "POOR", note: "Lạnh yếu, nghi thiếu ga.", lastCheckedAt: daysAgo(1) },
      { vehicleId: xpander.id, system: "SUSPENSION", condition: "POOR", note: "Rotuyn trụ có tiếng kêu.", lastCheckedAt: daysAgo(2) },
      { vehicleId: xpander.id, system: "BRAKES", condition: "FAIR", lastCheckedAt: daysAgo(2) },
    ],
  });

  /* ---------------------------------------------------------------- */
  /* Catalogue                                                        */
  /* ---------------------------------------------------------------- */

  const services = await Promise.all(
    [
      { name: "Bảo dưỡng định kỳ 10.000 km", basePrice: 850_000, estimatedMinutes: 120, description: "Thay dầu máy, lọc dầu, kiểm tra tổng quát 30 điểm." },
      { name: "Thay dầu động cơ", basePrice: 350_000, estimatedMinutes: 45 },
      { name: "Thay má phanh trước", basePrice: 400_000, estimatedMinutes: 60 },
      { name: "Vệ sinh hệ thống điều hòa", basePrice: 550_000, estimatedMinutes: 90 },
      { name: "Nạp ga điều hòa", basePrice: 600_000, estimatedMinutes: 60 },
      { name: "Thay rotuyn trụ", basePrice: 500_000, estimatedMinutes: 120 },
      { name: "Cân chỉnh thước lái", basePrice: 450_000, estimatedMinutes: 90 },
      { name: "Đảo lốp và cân bằng động", basePrice: 300_000, estimatedMinutes: 60 },
      { name: "Kiểm tra tổng quát trước chuyến đi xa", basePrice: 200_000, estimatedMinutes: 45 },
    ].map((service) =>
      prisma.service.create({ data: { garageId: garage.id, ...service } }),
    ),
  );

  const serviceByName = new Map(services.map((s) => [s.name, s]));

  const parts = await Promise.all(
    [
      { sku: "OIL-5W30-4L", name: "Dầu động cơ Total 5W30 (4L)", unit: "lon", costPrice: 620_000, sellPrice: 780_000, quantityInStock: 24, lowStockThreshold: 6 },
      { sku: "FLT-OIL-TY01", name: "Lọc dầu Toyota Vios", unit: "cái", costPrice: 95_000, sellPrice: 150_000, quantityInStock: 18, lowStockThreshold: 5 },
      { sku: "FLT-AIR-TY01", name: "Lọc gió động cơ Toyota Vios", unit: "cái", costPrice: 180_000, sellPrice: 280_000, quantityInStock: 12, lowStockThreshold: 4 },
      { sku: "BRK-PAD-TY01", name: "Má phanh trước Toyota Vios", unit: "bộ", costPrice: 480_000, sellPrice: 720_000, quantityInStock: 8, lowStockThreshold: 3 },
      { sku: "BRK-PAD-MZ01", name: "Má phanh trước Mazda CX-5", unit: "bộ", costPrice: 720_000, sellPrice: 1_050_000, quantityInStock: 4, lowStockThreshold: 2 },
      { sku: "AC-GAS-R134A", name: "Ga điều hòa R134a", unit: "kg", costPrice: 180_000, sellPrice: 300_000, quantityInStock: 15, lowStockThreshold: 5 },
      { sku: "AC-FLT-MZ01", name: "Lọc gió điều hòa Mazda CX-5", unit: "cái", costPrice: 210_000, sellPrice: 350_000, quantityInStock: 9, lowStockThreshold: 3 },
      { sku: "SUS-BJ-MI01", name: "Rotuyn trụ Mitsubishi Xpander", unit: "cái", costPrice: 620_000, sellPrice: 950_000, quantityInStock: 2, lowStockThreshold: 4 },
      { sku: "BAT-45AH", name: "Ắc quy GS 45Ah", unit: "cái", costPrice: 1_450_000, sellPrice: 1_950_000, quantityInStock: 5, lowStockThreshold: 2 },
      { sku: "WPR-BLADE-24", name: "Lưỡi gạt mưa 24 inch", unit: "cái", costPrice: 120_000, sellPrice: 200_000, quantityInStock: 20, lowStockThreshold: 6 },
    ].map((part) => prisma.part.create({ data: { garageId: garage.id, ...part } })),
  );

  const partBySku = new Map(parts.map((p) => [p.sku, p]));

  // Opening stock is recorded as receipts so the ledger explains the balance.
  await prisma.inventoryTransaction.createMany({
    data: parts.map((part) => ({
      garageId: garage.id,
      partId: part.id,
      type: "RECEIPT" as const,
      quantity: part.quantityInStock,
      unitCost: part.costPrice,
      reason: "Tồn kho đầu kỳ",
      createdById: manager.id,
      createdAt: daysAgo(30),
    })),
  });

  await prisma.part.create({
    data: {
      garageId: otherGarage.id,
      sku: "OIL-5W30-4L",
      name: "Dầu động cơ Castrol 5W30 (4L)",
      costPrice: 640_000,
      sellPrice: 820_000,
      quantityInStock: 10,
      lowStockThreshold: 4,
    },
  });

  /* ---------------------------------------------------------------- */
  /* Repair order 1 — delivered and paid                              */
  /* ---------------------------------------------------------------- */

  const appointment1 = await prisma.appointment.create({
    data: {
      garageId: garage.id,
      customerId: hoang.id,
      vehicleId: vios.id,
      status: "COMPLETED",
      scheduledAt: daysAgo(3),
      endsAt: new Date(daysAgo(3).getTime() + 60 * 60 * 1000),
      serviceRequest: "Bảo dưỡng định kỳ, xe có tiếng kêu khi phanh.",
      createdById: hoangUser.id,
      confirmedById: receptionist.id,
    },
  });

  const ro1 = await prisma.repairOrder.create({
    data: {
      garageId: garage.id,
      code: "RO-2026-0001",
      vehicleId: vios.id,
      customerId: hoang.id,
      appointmentId: appointment1.id,
      status: "COMPLETED",
      receivedAt: daysAgo(3),
      mileageKm: 64_500,
      fuelLevel: 45,
      initialNote: "Khách phản ánh có tiếng kêu ở bánh trước khi phanh.",
      advisorId: receptionist.id,
      completedAt: daysAgo(2),
      deliveredAt: daysAgo(2),
    },
  });

  await prisma.inspection.create({
    data: {
      garageId: garage.id,
      repairOrderId: ro1.id,
      inspectorId: technician.id,
      summary: "Má phanh trước mòn tới giới hạn. Các hệ thống khác trong ngưỡng an toàn.",
      startedAt: daysAgo(3),
      completedAt: daysAgo(3),
      items: {
        create: [
          { category: "Phanh", name: "Má phanh trước", severity: "URGENT", finding: "Còn 1.5mm, dưới mức khuyến nghị.", recommendation: "Thay bộ má phanh trước.", sortOrder: 1 },
          { category: "Phanh", name: "Má phanh sau", severity: "OK", finding: "Còn 6mm.", sortOrder: 2 },
          { category: "Động cơ", name: "Dầu động cơ", severity: "ATTENTION", finding: "Đã chạy 6.200 km từ lần thay trước.", recommendation: "Thay dầu và lọc dầu.", sortOrder: 3 },
          { category: "Điện", name: "Ắc quy", severity: "ATTENTION", finding: "Điện áp 12.3V, sụt nhẹ khi khởi động.", recommendation: "Theo dõi, dự kiến thay trong 6 tháng.", sortOrder: 4 },
          { category: "Lốp", name: "Bốn bánh", severity: "OK", finding: "Gai lốp còn 70%, áp suất đạt chuẩn.", sortOrder: 5 },
        ],
      },
    },
  });

  const ro1Lines = [
    {
      type: "SERVICE" as const,
      serviceId: serviceByName.get("Bảo dưỡng định kỳ 10.000 km")?.id,
      description: "Bảo dưỡng định kỳ 10.000 km",
      quantity: 1,
      unitPrice: 850_000,
      status: "APPROVED" as const,
    },
    {
      type: "PART" as const,
      partId: partBySku.get("OIL-5W30-4L")?.id,
      description: "Dầu động cơ Total 5W30 (4L)",
      quantity: 1,
      unitPrice: 780_000,
      status: "APPROVED" as const,
    },
    {
      type: "PART" as const,
      partId: partBySku.get("FLT-OIL-TY01")?.id,
      description: "Lọc dầu Toyota Vios",
      quantity: 1,
      unitPrice: 150_000,
      status: "APPROVED" as const,
    },
    {
      type: "SERVICE" as const,
      serviceId: serviceByName.get("Thay má phanh trước")?.id,
      description: "Thay má phanh trước",
      quantity: 1,
      unitPrice: 400_000,
      status: "APPROVED" as const,
    },
    {
      type: "PART" as const,
      partId: partBySku.get("BRK-PAD-TY01")?.id,
      description: "Má phanh trước Toyota Vios",
      quantity: 1,
      unitPrice: 720_000,
      discountAmount: 50_000,
      status: "APPROVED" as const,
    },
    {
      type: "PART" as const,
      partId: partBySku.get("FLT-AIR-TY01")?.id,
      description: "Lọc gió động cơ Toyota Vios",
      quantity: 1,
      unitPrice: 280_000,
      // Customer declined this one: it must never become a work task.
      status: "REJECTED" as const,
      customerNote: "Lần sau làm, đợt này chưa cần.",
    },
  ];

  const ro1ItemData = ro1Lines.map((line, index) => {
    const totalAmount = calculateLineTotal({
      quantity: line.quantity,
      unitPrice: line.unitPrice,
      discountAmount: line.discountAmount ?? 0,
    });
    return { ...line, discountAmount: line.discountAmount ?? 0, totalAmount, sortOrder: index + 1 };
  });

  const approvedTotal = ro1ItemData
    .filter((item) => item.status === "APPROVED")
    .reduce((sum, item) => sum + item.totalAmount, 0);

  const quotation1 = await prisma.quotation.create({
    data: {
      garageId: garage.id,
      repairOrderId: ro1.id,
      versionNo: 1,
      status: "PARTIALLY_APPROVED",
      note: "Báo giá theo kết quả kiểm tra ngày tiếp nhận.",
      validUntil: daysFromNow(4),
      sentAt: daysAgo(3),
      decidedAt: daysAgo(3),
      totalAmount: ro1ItemData.reduce((sum, item) => sum + item.totalAmount, 0),
      createdById: receptionist.id,
      items: {
        create: ro1ItemData.map((item) => ({
          ...item,
          decidedAt: daysAgo(3),
        })),
      },
    },
    include: { items: true },
  });

  const approvedItems = quotation1.items.filter((item) => item.status === "APPROVED");

  // Work tasks exist only for approved items — the rejected air filter has none.
  const task1 = await prisma.workTask.create({
    data: {
      garageId: garage.id,
      repairOrderId: ro1.id,
      quotationItemId: approvedItems.find((i) => i.description.startsWith("Bảo dưỡng"))?.id,
      title: "Bảo dưỡng định kỳ 10.000 km",
      description: "Thay dầu máy, lọc dầu, kiểm tra 30 điểm.",
      status: "COMPLETED",
      assignedToId: technician.id,
      estimatedMinutes: 120,
      startedAt: daysAgo(3),
      completedAt: daysAgo(3),
      workLogs: {
        create: [
          { userId: technician.id, note: "Đã thay dầu và lọc dầu, xả khí hệ thống.", minutesSpent: 70 },
          { userId: technician.id, note: "Kiểm tra 30 điểm, không phát hiện thêm lỗi.", minutesSpent: 40 },
        ],
      },
    },
  });

  const task2 = await prisma.workTask.create({
    data: {
      garageId: garage.id,
      repairOrderId: ro1.id,
      quotationItemId: approvedItems.find((i) => i.description === "Thay má phanh trước")?.id,
      title: "Thay má phanh trước",
      status: "COMPLETED",
      assignedToId: technician2.id,
      estimatedMinutes: 60,
      startedAt: daysAgo(3),
      completedAt: daysAgo(2),
      workLogs: {
        create: [
          { userId: technician2.id, note: "Thay bộ má phanh trước, vệ sinh heo dầu, test phanh đạt.", minutesSpent: 55 },
        ],
      },
    },
  });

  // Parts issued against the tasks, with matching stock deduction.
  const issuedParts = [
    { sku: "OIL-5W30-4L", quantity: 1, workTaskId: task1.id },
    { sku: "FLT-OIL-TY01", quantity: 1, workTaskId: task1.id },
    { sku: "BRK-PAD-TY01", quantity: 1, workTaskId: task2.id },
  ];

  for (const issue of issuedParts) {
    const part = partBySku.get(issue.sku);
    if (!part) continue;
    await prisma.$transaction([
      prisma.inventoryTransaction.create({
        data: {
          garageId: garage.id,
          partId: part.id,
          type: "ISSUE",
          quantity: -issue.quantity,
          reason: `Xuất cho lệnh ${ro1.code}`,
          repairOrderId: ro1.id,
          workTaskId: issue.workTaskId,
          createdById: technician.id,
          createdAt: daysAgo(3),
        },
      }),
      prisma.part.update({
        where: { id: part.id },
        data: {
          quantityInStock: { decrement: issue.quantity },
          version: { increment: 1 },
        },
      }),
    ]);
  }

  const ro1Totals = calculateInvoiceTotals({
    lineTotals: approvedItems.map((item) => item.totalAmount),
    taxPercent: 8,
  });

  const invoice1 = await prisma.invoice.create({
    data: {
      garageId: garage.id,
      code: "INV-2026-0001",
      repairOrderId: ro1.id,
      customerId: hoang.id,
      status: "PAID",
      subtotal: ro1Totals.subtotal,
      discountAmount: ro1Totals.discountAmount,
      taxAmount: ro1Totals.taxAmount,
      totalAmount: ro1Totals.totalAmount,
      paidAmount: ro1Totals.totalAmount,
      issuedAt: daysAgo(2),
      dueAt: daysAgo(2),
      createdById: cashier.id,
      items: {
        create: approvedItems.map((item, index) => ({
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          discountAmount: item.discountAmount,
          totalAmount: item.totalAmount,
          sourceQuotationItemId: item.id,
          sortOrder: index + 1,
        })),
      },
      payments: {
        create: [
          {
            garageId: garage.id,
            type: "PAYMENT",
            method: "BANK_TRANSFER",
            amount: ro1Totals.totalAmount,
            paidAt: daysAgo(2),
            reference: "CK VCB 20260724",
            receivedById: cashier.id,
          },
        ],
      },
    },
  });

  if (approvedTotal !== ro1Totals.subtotal) {
    throw new Error("Seed inconsistency: approved item total does not match invoice subtotal");
  }

  await prisma.vehicleTimelineEvent.createMany({
    data: [
      {
        vehicleId: vios.id,
        garageId: garage.id,
        type: "MAINTENANCE",
        source: "VERIFIED_GARAGE_RECORD",
        title: "Bảo dưỡng định kỳ 10.000 km",
        description: "Thay dầu động cơ, lọc dầu; kiểm tra tổng quát 30 điểm.",
        occurredAt: daysAgo(3),
        mileageKm: 64_500,
        repairOrderId: ro1.id,
        createdById: technician.id,
      },
      {
        vehicleId: vios.id,
        garageId: garage.id,
        type: "PART_REPLACEMENT",
        source: "VERIFIED_GARAGE_RECORD",
        title: "Thay má phanh trước",
        description: "Thay bộ má phanh trước, vệ sinh heo dầu.",
        occurredAt: daysAgo(2),
        mileageKm: 64_500,
        repairOrderId: ro1.id,
        createdById: technician2.id,
      },
      {
        vehicleId: vios.id,
        garageId: garage.id,
        type: "INSPECTION",
        source: "VERIFIED_GARAGE_RECORD",
        title: "Kiểm tra tổng quát khi tiếp nhận",
        description: "Phát hiện má phanh trước mòn tới giới hạn.",
        occurredAt: daysAgo(3),
        mileageKm: 64_500,
        repairOrderId: ro1.id,
        createdById: technician.id,
      },
      {
        vehicleId: vios.id,
        type: "REGISTRATION",
        source: "OWNER_PROVIDED_RECORD",
        title: "Đăng kiểm định kỳ",
        description: "Khách tự cung cấp thông tin, gara chưa xác thực.",
        occurredAt: daysAgo(150),
        mileageKm: 55_000,
      },
    ],
  });

  await prisma.maintenanceRecord.createMany({
    data: [
      {
        vehicleId: vios.id,
        garageId: garage.id,
        repairOrderId: ro1.id,
        title: "Bảo dưỡng định kỳ 10.000 km",
        description: "Dầu Total 5W30, lọc dầu chính hãng.",
        performedAt: daysAgo(3),
        mileageKm: 64_500,
        nextDueDate: monthsFromNow(6),
        nextDueMileageKm: 74_500,
      },
      {
        vehicleId: vios.id,
        garageId: garage.id,
        repairOrderId: ro1.id,
        title: "Thay má phanh trước",
        performedAt: daysAgo(2),
        mileageKm: 64_500,
        nextDueMileageKm: 104_500,
      },
    ],
  });

  await prisma.warranty.create({
    data: {
      vehicleId: vios.id,
      garageId: garage.id,
      repairOrderId: ro1.id,
      name: "Bảo hành má phanh trước",
      terms: "Bảo hành 6 tháng hoặc 10.000 km, không áp dụng cho hao mòn do sử dụng sai.",
      startsAt: daysAgo(2),
      expiresAt: monthsFromNow(6),
      mileageLimitKm: 74_500,
    },
  });

  await prisma.shareLink.create({
    data: {
      vehicleId: vios.id,
      token: "demo-share-vios-30g12345",
      scope: { showOwner: false, showInvoices: false },
      expiresAt: daysFromNow(30),
      createdById: hoangUser.id,
    },
  });

  /* ---------------------------------------------------------------- */
  /* Repair order 2 — waiting for customer approval                   */
  /* ---------------------------------------------------------------- */

  const appointment2 = await prisma.appointment.create({
    data: {
      garageId: garage.id,
      customerId: mai.id,
      vehicleId: cx5.id,
      status: "ARRIVED",
      scheduledAt: daysAgo(1),
      endsAt: new Date(daysAgo(1).getTime() + 60 * 60 * 1000),
      serviceRequest: "Điều hòa lạnh yếu.",
      createdById: maiUser.id,
      confirmedById: receptionist.id,
    },
  });

  const ro2 = await prisma.repairOrder.create({
    data: {
      garageId: garage.id,
      code: "RO-2026-0002",
      vehicleId: cx5.id,
      customerId: mai.id,
      appointmentId: appointment2.id,
      status: "WAITING_CUSTOMER_APPROVAL",
      receivedAt: daysAgo(1),
      mileageKm: 41_200,
      fuelLevel: 60,
      initialNote: "Điều hòa lạnh yếu, có mùi ẩm khi bật quạt.",
      advisorId: receptionist.id,
    },
  });

  await prisma.inspection.create({
    data: {
      garageId: garage.id,
      repairOrderId: ro2.id,
      inspectorId: technician2.id,
      summary: "Ga điều hòa thiếu, lọc gió cabin bẩn nặng. Chưa phát hiện rò rỉ lớn.",
      startedAt: daysAgo(1),
      completedAt: daysAgo(1),
      items: {
        create: [
          { category: "Điều hòa", name: "Áp suất ga", severity: "URGENT", finding: "Áp suất thấp hơn chuẩn khoảng 30%.", recommendation: "Nạp ga và kiểm tra rò rỉ.", sortOrder: 1 },
          { category: "Điều hòa", name: "Lọc gió cabin", severity: "ATTENTION", finding: "Bám bụi dày, có mùi.", recommendation: "Thay lọc gió cabin.", sortOrder: 2 },
          { category: "Điều hòa", name: "Dàn lạnh", severity: "ATTENTION", finding: "Bám bẩn.", recommendation: "Vệ sinh hệ thống điều hòa.", sortOrder: 3 },
        ],
      },
    },
  });

  const ro2Lines = [
    { type: "SERVICE" as const, serviceId: serviceByName.get("Nạp ga điều hòa")?.id, description: "Nạp ga điều hòa", quantity: 1, unitPrice: 600_000 },
    { type: "PART" as const, partId: partBySku.get("AC-GAS-R134A")?.id, description: "Ga điều hòa R134a", quantity: 1, unitPrice: 300_000 },
    { type: "SERVICE" as const, serviceId: serviceByName.get("Vệ sinh hệ thống điều hòa")?.id, description: "Vệ sinh hệ thống điều hòa", quantity: 1, unitPrice: 550_000 },
    { type: "PART" as const, partId: partBySku.get("AC-FLT-MZ01")?.id, description: "Lọc gió điều hòa Mazda CX-5", quantity: 1, unitPrice: 350_000 },
  ];

  const ro2ItemData = ro2Lines.map((line, index) => ({
    ...line,
    discountAmount: 0,
    totalAmount: calculateLineTotal({ quantity: line.quantity, unitPrice: line.unitPrice }),
    sortOrder: index + 1,
  }));

  await prisma.quotation.create({
    data: {
      garageId: garage.id,
      repairOrderId: ro2.id,
      versionNo: 1,
      status: "SENT",
      note: "Kính mời anh/chị xác nhận từng hạng mục để gara bắt đầu thi công.",
      validUntil: daysFromNow(6),
      sentAt: daysAgo(1),
      totalAmount: ro2ItemData.reduce((sum, item) => sum + item.totalAmount, 0),
      createdById: receptionist.id,
      items: { create: ro2ItemData },
    },
  });

  await prisma.notification.create({
    data: {
      userId: maiUser.id,
      garageId: garage.id,
      type: "QUOTATION",
      title: "Báo giá mới cho xe 30K-678.90",
      body: "Gara Thành Đạt đã gửi báo giá cho lệnh RO-2026-0002. Vui lòng xác nhận từng hạng mục.",
      data: { href: `/portal/lenh-sua-chua/${ro2.id}` },
    },
  });

  /* ---------------------------------------------------------------- */
  /* Repair order 3 — in progress with a supplementary quotation       */
  /* ---------------------------------------------------------------- */

  const ro3 = await prisma.repairOrder.create({
    data: {
      garageId: garage.id,
      code: "RO-2026-0003",
      vehicleId: xpander.id,
      customerId: cuong.id,
      status: "IN_PROGRESS",
      receivedAt: daysAgo(2),
      mileageKm: 138_900,
      fuelLevel: 25,
      initialNote: "Có tiếng lộc cộc phía trước khi đi đường xấu.",
      advisorId: receptionist.id,
    },
  });

  await prisma.inspection.create({
    data: {
      garageId: garage.id,
      repairOrderId: ro3.id,
      inspectorId: technician.id,
      summary: "Rotuyn trụ hai bên có độ rơ lớn. Thước lái cần cân chỉnh sau khi thay.",
      startedAt: daysAgo(2),
      completedAt: daysAgo(2),
      items: {
        create: [
          { category: "Gầm", name: "Rotuyn trụ trước", severity: "URGENT", finding: "Rơ rõ cả hai bên.", recommendation: "Thay 2 rotuyn trụ.", sortOrder: 1 },
          { category: "Lái", name: "Thước lái", severity: "ATTENTION", finding: "Lệch nhẹ sang phải.", recommendation: "Cân chỉnh sau khi thay rotuyn.", sortOrder: 2 },
        ],
      },
    },
  });

  const ro3Lines = [
    { type: "SERVICE" as const, serviceId: serviceByName.get("Thay rotuyn trụ")?.id, description: "Thay rotuyn trụ (2 bên)", quantity: 2, unitPrice: 500_000, status: "APPROVED" as const },
    { type: "PART" as const, partId: partBySku.get("SUS-BJ-MI01")?.id, description: "Rotuyn trụ Mitsubishi Xpander", quantity: 2, unitPrice: 950_000, status: "APPROVED" as const },
  ];

  const ro3ItemData = ro3Lines.map((line, index) => ({
    ...line,
    discountAmount: 0,
    totalAmount: calculateLineTotal({ quantity: line.quantity, unitPrice: line.unitPrice }),
    sortOrder: index + 1,
    decidedAt: daysAgo(2),
  }));

  const quotation3 = await prisma.quotation.create({
    data: {
      garageId: garage.id,
      repairOrderId: ro3.id,
      versionNo: 1,
      status: "APPROVED",
      validUntil: daysFromNow(5),
      sentAt: daysAgo(2),
      decidedAt: daysAgo(2),
      totalAmount: ro3ItemData.reduce((sum, item) => sum + item.totalAmount, 0),
      createdById: receptionist.id,
      items: { create: ro3ItemData },
    },
    include: { items: true },
  });

  // Extra work found during the job goes into a supplementary quotation, not
  // into the approved one.
  await prisma.quotation.create({
    data: {
      garageId: garage.id,
      repairOrderId: ro3.id,
      versionNo: 2,
      status: "SENT",
      isSupplementary: true,
      note: "Phát sinh trong quá trình tháo gầm: cao su càng A nứt.",
      validUntil: daysFromNow(5),
      sentAt: daysAgo(1),
      totalAmount: 900_000,
      createdById: technician.id,
      items: {
        create: [
          {
            type: "OTHER",
            description: "Thay cao su càng A bên phải (phát sinh)",
            quantity: 1,
            unitPrice: 900_000,
            totalAmount: 900_000,
            sortOrder: 1,
          },
        ],
      },
    },
  });

  const ro3ServiceItem = quotation3.items.find((item) => item.type === "SERVICE");

  await prisma.workTask.create({
    data: {
      garageId: garage.id,
      repairOrderId: ro3.id,
      quotationItemId: ro3ServiceItem?.id,
      title: "Thay rotuyn trụ trước hai bên",
      status: "WAITING_PARTS",
      assignedToId: technician.id,
      estimatedMinutes: 240,
      startedAt: daysAgo(2),
      workLogs: {
        create: [
          { userId: technician.id, note: "Tháo gầm, xác nhận rơ rotuyn. Kho còn 2 cái, chờ nhập thêm cho tồn tối thiểu.", minutesSpent: 90 },
        ],
      },
    },
  });

  await prisma.workTask.create({
    data: {
      garageId: garage.id,
      repairOrderId: ro3.id,
      title: "Cân chỉnh thước lái sau khi thay rotuyn",
      status: "NOT_STARTED",
      assignedToId: technician2.id,
      estimatedMinutes: 90,
    },
  });

  /* ---------------------------------------------------------------- */
  /* Upcoming appointment                                             */
  /* ---------------------------------------------------------------- */

  await prisma.appointment.create({
    data: {
      garageId: garage.id,
      customerId: hoang.id,
      vehicleId: vios.id,
      status: "PENDING",
      scheduledAt: daysFromNow(5),
      endsAt: new Date(daysFromNow(5).getTime() + 60 * 60 * 1000),
      serviceRequest: "Kiểm tra tổng quát trước chuyến đi xa.",
      createdById: hoangUser.id,
    },
  });

  const partsIssuedCount = issuedParts.length;
  console.log("Seed hoàn tất:");
  console.log(`  - 2 gara, 7 nhân sự, 3 khách hàng, 3 xe`);
  console.log(`  - ${services.length} dịch vụ, ${parts.length} phụ tùng`);
  console.log(`  - 3 lệnh sửa chữa (${ro1.code} đã giao, ${ro2.code} chờ duyệt, ${ro3.code} đang làm)`);
  console.log(`  - ${partsIssuedCount} lần xuất kho, hóa đơn ${invoice1.code} đã thanh toán`);
  console.log(`  - Mật khẩu demo cho mọi tài khoản: ${DEMO_PASSWORD}`);
}

main()
  .catch((error) => {
    console.error("Seed thất bại:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
