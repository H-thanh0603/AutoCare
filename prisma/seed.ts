/**
 * Demo data seed.
 *
 * Creates two garages, full staff roles, 4 realistic customers with luxury & family cars,
 * diagnostic telemetry, repair orders, quotations, work tasks, and invoices.
 *
 * Amounts are integers in VND. Run with `pnpm db:seed`.
 */

import "dotenv/config";

import { hashPassword } from "../src/lib/password";
import { calculateInvoiceTotals, calculateLineTotal } from "../src/lib/money";
import { prisma } from "../src/lib/prisma";

if (process.env.NODE_ENV === "production" && !process.env.ALLOW_DEMO_SEED) {
  throw new Error(
    "Từ chối chạy demo seed ở production. Seed xóa toàn bộ dữ liệu và tạo tài khoản với mật khẩu công khai. " +
      'Chỉ chạy khi hiểu rõ rủi ro: đặt biến môi trường ALLOW_DEMO_SEED="1".',
  );
}

const DEMO_PASSWORD = process.env.DEMO_PASSWORD ?? "AutoCare@2026";

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
  console.log("Đang xóa dữ liệu cũ và chuẩn bị nạp dữ liệu mẫu mới...");
  await resetDatabase();

  const passwordHash = await hashPassword(DEMO_PASSWORD);

  /* ---------------------------------------------------------------- */
  /* Garages                                                          */
  /* ---------------------------------------------------------------- */

  const garage = await prisma.garage.create({
    data: {
      name: "Gara Ô Tô AutoCare Long Biên",
      address: "185 Nguyễn Văn Cừ, Long Biên, Hà Nội",
      phone: "02438725160",
      email: "lienhe@autocare.vn",
      settings: {
        allowNegativeStock: false,
        taxPercent: 8,
        appointmentSlotMinutes: 60,
        workingHours: {
          1: { open: "07:30", close: "18:30" },
          2: { open: "07:30", close: "18:30" },
          3: { open: "07:30", close: "18:30" },
          4: { open: "07:30", close: "18:30" },
          5: { open: "07:30", close: "18:30" },
          6: { open: "07:30", close: "18:30" },
          0: { open: "08:00", close: "17:00" },
        },
      },
    },
  });

  const otherGarage = await prisma.garage.create({
    data: {
      name: "Gara AutoCare Cầu Giấy",
      address: "68 Phạm Văn Đồng, Cầu Giấy, Hà Nội",
      phone: "02436281944",
      email: "caugiay@autocare.vn",
      settings: {
        allowNegativeStock: false,
        taxPercent: 8,
        appointmentSlotMinutes: 60,
      },
    },
  });

  /* ---------------------------------------------------------------- */
  /* Staff Users                                                      */
  /* ---------------------------------------------------------------- */

  const manager = await prisma.user.create({
    data: {
      email: "quanly@garathanhdat.vn",
      name: "Trần Quốc Thành (Quản đốc)",
      phone: "0912345001",
      passwordHash,
      role: "STAFF",
      memberships: { create: { garageId: garage.id, role: "GARAGE_MANAGER" } },
    },
  });

  const receptionist = await prisma.user.create({
    data: {
      email: "letan@garathanhdat.vn",
      name: "Nguyễn Thu Hà (Lễ tân)",
      phone: "0912345002",
      passwordHash,
      role: "STAFF",
      memberships: { create: { garageId: garage.id, role: "RECEPTIONIST" } },
    },
  });

  const technician1 = await prisma.user.create({
    data: {
      email: "kythuat1@garathanhdat.vn",
      name: "Lê Văn Dũng (Kỹ thuật trưởng)",
      phone: "0912345003",
      passwordHash,
      role: "STAFF",
      memberships: { create: { garageId: garage.id, role: "TECHNICIAN" } },
    },
  });

  const technician2 = await prisma.user.create({
    data: {
      email: "kythuat2@garathanhdat.vn",
      name: "Phạm Minh Tuấn (Kỹ thuật viên gầm)",
      phone: "0912345004",
      passwordHash,
      role: "STAFF",
      memberships: { create: { garageId: garage.id, role: "TECHNICIAN" } },
    },
  });

  const cashier = await prisma.user.create({
    data: {
      email: "thungan@garathanhdat.vn",
      name: "Vũ Thị Lan (Kế toán & Thu ngân)",
      phone: "0912345005",
      passwordHash,
      role: "STAFF",
      memberships: { create: { garageId: garage.id, role: "CASHIER" } },
    },
  });

  await prisma.user.create({
    data: {
      email: "admin@autocare.vn",
      name: "Quản trị viên Hệ thống",
      passwordHash,
      role: "PLATFORM_ADMIN",
    },
  });

  /* ---------------------------------------------------------------- */
  /* Customer Users (Tài khoản khách hàng demo)                       */
  /* ---------------------------------------------------------------- */

  const khach1User = await prisma.user.create({
    data: {
      email: "khach1@gmail.com",
      name: "Anh Nguyễn Minh Tuấn",
      phone: "0903111222",
      passwordHash,
      role: "CUSTOMER",
    },
  });

  const khach2User = await prisma.user.create({
    data: {
      email: "khach2@gmail.com",
      name: "Chị Trần Thị Mai",
      phone: "0903333444",
      passwordHash,
      role: "CUSTOMER",
    },
  });

  const khach3User = await prisma.user.create({
    data: {
      email: "khach3@gmail.com",
      name: "Anh Lê Hoàng Nam",
      phone: "0903555666",
      passwordHash,
      role: "CUSTOMER",
    },
  });

  const customer1 = await prisma.customer.create({
    data: {
      garageId: garage.id,
      userId: khach1User.id,
      name: "Anh Nguyễn Minh Tuấn",
      phone: "0903111222",
      email: "khach1@gmail.com",
      address: "Biệt thự Vinhome Riverside, Long Biên, Hà Nội",
      note: "Khách VIP, sở hữu Mercedes C200 và Toyota Vios, yêu cầu phụ tùng chính hãng 100%.",
    },
  });

  const customer2 = await prisma.customer.create({
    data: {
      garageId: garage.id,
      userId: khach2User.id,
      name: "Chị Trần Thị Mai",
      phone: "0903333444",
      email: "khach2@gmail.com",
      address: "88 Nguyễn Trãi, Thanh Xuân, Hà Nội",
      note: "Chủ xe Porsche Macan & Mazda CX-5, thường xuyên bảo dưỡng định kỳ đúng hạn.",
    },
  });

  const customer3 = await prisma.customer.create({
    data: {
      garageId: garage.id,
      userId: khach3User.id,
      name: "Anh Lê Hoàng Nam",
      phone: "0903555666",
      email: "khach3@gmail.com",
      address: "Khu đô thị Ngoại Giao Đoàn, Bắc Từ Liêm, Hà Nội",
      note: "Sở hữu Ford Ranger Wildtrak và VinFast VF8.",
    },
  });

  /* ---------------------------------------------------------------- */
  /* Vehicles                                                         */
  /* ---------------------------------------------------------------- */

  // 1. Mercedes-Benz C200 (Khách 1)
  const merc = await prisma.vehicle.create({
    data: {
      vin: "WDD2050401F888222",
      licensePlate: "30H-888.22",
      brand: "Mercedes-Benz",
      model: "C200 Avantgarde Plus",
      year: 2022,
      color: "Trắng Ngọc Trai",
      engineNumber: "M264-987654",
      currentKm: 28_500,
      ownerships: {
        create: {
          customerId: customer1.id,
          startedAt: daysAgo(600),
          isCurrent: true,
          note: "Mua mới chính hãng Mercedes Haxaco.",
        },
      },
    },
  });

  // 2. Toyota Vios 1.5G (Khách 1)
  const vios = await prisma.vehicle.create({
    data: {
      vin: "RL4KA2CD8LA123456",
      licensePlate: "30G-123.45",
      brand: "Toyota",
      model: "Vios 1.5G CVT",
      year: 2020,
      color: "Bạc Ánh Kim",
      engineNumber: "2NR-1234567",
      currentKm: 64_500,
      ownerships: {
        create: {
          customerId: customer1.id,
          startedAt: daysAgo(1200),
          isCurrent: true,
        },
      },
    },
  });

  // 3. Porsche Macan GTS (Khách 2)
  const porsche = await prisma.vehicle.create({
    data: {
      vin: "WP1AA2A58KL668999",
      licensePlate: "51K-668.99",
      brand: "Porsche",
      model: "Macan GTS 2.9 V6 Twin-Turbo",
      year: 2023,
      color: "Đỏ Carmine",
      engineNumber: "EA839-456789",
      currentKm: 18_200,
      ownerships: {
        create: {
          customerId: customer2.id,
          startedAt: daysAgo(350),
          isCurrent: true,
          note: "Xe bảo dưỡng định kỳ nghiêm ngặt theo khuyến cáo Porsche Center.",
        },
      },
    },
  });

  // 4. Mazda CX-5 (Khách 2)
  const cx5 = await prisma.vehicle.create({
    data: {
      vin: "JM7KFBCM2M0345678",
      licensePlate: "30K-678.90",
      brand: "Mazda",
      model: "CX-5 2.0 Premium",
      year: 2021,
      color: "Đỏ Pha Lê (Soul Red)",
      currentKm: 41_200,
      ownerships: {
        create: {
          customerId: customer2.id,
          startedAt: daysAgo(900),
          isCurrent: true,
        },
      },
    },
  });

  // 5. Ford Ranger Wildtrak (Khách 3)
  const ranger = await prisma.vehicle.create({
    data: {
      vin: "MNBUMFF50MW991555",
      licensePlate: "29C-991.55",
      brand: "Ford",
      model: "Ranger Wildtrak 2.0L Bi-Turbo 4x4",
      year: 2022,
      color: "Vàng Cam Pride Orange",
      currentKm: 52_000,
      ownerships: {
        create: {
          customerId: customer3.id,
          startedAt: daysAgo(500),
          isCurrent: true,
        },
      },
    },
  });

  // 6. VinFast VF8 (Khách 3)
  const vf8 = await prisma.vehicle.create({
    data: {
      vin: "VF8PLUS2023VN777888",
      licensePlate: "30F-777.88",
      brand: "VinFast",
      model: "VF8 Plus AWD",
      year: 2023,
      color: "Xanh Deep Ocean",
      currentKm: 22_000,
      ownerships: {
        create: {
          customerId: customer3.id,
          startedAt: daysAgo(280),
          isCurrent: true,
        },
      },
    },
  });

  /* ---------------------------------------------------------------- */
  /* Mileage Logs & Diagnostic Health System Status                   */
  /* ---------------------------------------------------------------- */

  await prisma.mileageLog.createMany({
    data: [
      { vehicleId: merc.id, garageId: garage.id, mileageKm: 15_000, recordedAt: daysAgo(200), note: "Bảo dưỡng Cấp A" },
      { vehicleId: merc.id, garageId: garage.id, mileageKm: 28_500, recordedAt: daysAgo(2), note: "Tiếp nhận bảo dưỡng Cấp B" },
      { vehicleId: vios.id, garageId: garage.id, mileageKm: 50_000, recordedAt: daysAgo(210) },
      { vehicleId: vios.id, garageId: garage.id, mileageKm: 64_500, recordedAt: daysAgo(3) },
      { vehicleId: porsche.id, garageId: garage.id, mileageKm: 10_000, recordedAt: daysAgo(180) },
      { vehicleId: porsche.id, garageId: garage.id, mileageKm: 18_200, recordedAt: daysAgo(1) },
      { vehicleId: cx5.id, garageId: garage.id, mileageKm: 41_200, recordedAt: daysAgo(5) },
      { vehicleId: ranger.id, garageId: garage.id, mileageKm: 52_000, recordedAt: daysAgo(4) },
      { vehicleId: vf8.id, garageId: garage.id, mileageKm: 22_000, recordedAt: daysAgo(7) },
    ],
  });

  await prisma.vehicleSystemStatus.createMany({
    data: [
      // Mercedes C200
      { vehicleId: merc.id, system: "ENGINE", condition: "GOOD", note: "Động cơ M264 vận hành êm ái, không rung giật.", lastCheckedAt: daysAgo(2) },
      { vehicleId: merc.id, system: "BRAKES", condition: "GOOD", note: "Độ dày má phanh trước 8mm, đĩa phanh nhẵn.", lastCheckedAt: daysAgo(2) },
      { vehicleId: merc.id, system: "BATTERY", condition: "GOOD", note: "Ắc quy Varta AGM 12.8V, tình trạng 95%.", lastCheckedAt: daysAgo(2) },
      { vehicleId: merc.id, system: "AIR_CONDITIONING", condition: "GOOD", note: "Lạnh sâu 5.5 độ C, cửa gió sạch sẽ.", lastCheckedAt: daysAgo(2) },
      { vehicleId: merc.id, system: "TIRES", condition: "GOOD", note: "Lốp Pirelli Runflat 2.3 bar đều 4 bánh.", lastCheckedAt: daysAgo(2) },

      // Toyota Vios
      { vehicleId: vios.id, system: "ENGINE", condition: "GOOD", lastCheckedAt: daysAgo(3) },
      { vehicleId: vios.id, system: "BRAKES", condition: "FAIR", note: "Má phanh trước mòn còn 3.2mm.", lastCheckedAt: daysAgo(3) },
      { vehicleId: vios.id, system: "BATTERY", condition: "FAIR", note: "Ắc quy GS dùng 3 năm, CCA sụt nhẹ.", lastCheckedAt: daysAgo(3) },

      // Porsche Macan
      { vehicleId: porsche.id, system: "ENGINE", condition: "GOOD", note: "V6 Twin-Turbo hoàn hảo.", lastCheckedAt: daysAgo(1) },
      { vehicleId: porsche.id, system: "BRAKES", condition: "GOOD", note: "Cụm phanh Porsche Caliper 6-piston đạt chuẩn lực phanh.", lastCheckedAt: daysAgo(1) },
      { vehicleId: porsche.id, system: "SUSPENSION", condition: "GOOD", note: "Phuộc hơi PASM hoạt động chính xác.", lastCheckedAt: daysAgo(1) },

      // Mazda CX-5
      { vehicleId: cx5.id, system: "AIR_CONDITIONING", condition: "POOR", note: "Lạnh yếu, áp suất ga thấp 30%.", lastCheckedAt: daysAgo(5) },
      { vehicleId: cx5.id, system: "ENGINE", condition: "GOOD", lastCheckedAt: daysAgo(5) },

      // Ford Ranger
      { vehicleId: ranger.id, system: "SUSPENSION", condition: "GOOD", note: "Nhíp và phuộc gầm đạt tải tốt.", lastCheckedAt: daysAgo(4) },
      { vehicleId: ranger.id, system: "BRAKES", condition: "GOOD", lastCheckedAt: daysAgo(4) },

      // VinFast VF8
      { vehicleId: vf8.id, system: "BATTERY", condition: "GOOD", note: "Pin cao áp SOH 99%, điện áp cell cân bằng tuyệt đối.", lastCheckedAt: daysAgo(7) },
      { vehicleId: vf8.id, system: "BRAKES", condition: "GOOD", note: "Hệ thống phanh tái sinh năng lượng hoạt động chuẩn.", lastCheckedAt: daysAgo(7) },
    ],
  });

  /* ---------------------------------------------------------------- */
  /* Services & Parts Catalogue                                       */
  /* ---------------------------------------------------------------- */

  const services = await Promise.all([
    prisma.service.create({ data: { garageId: garage.id, name: "Bảo dưỡng định kỳ 10.000 km", basePrice: 850_000, estimatedMinutes: 120 } }),
    prisma.service.create({ data: { garageId: garage.id, name: "Bảo dưỡng Cấp B Mercedes-Benz", basePrice: 1_850_000, estimatedMinutes: 150 } }),
    prisma.service.create({ data: { garageId: garage.id, name: "Thay dầu nhớt & Lọc dầu cao cấp", basePrice: 350_000, estimatedMinutes: 45 } }),
    prisma.service.create({ data: { garageId: garage.id, name: "Thay má phanh trước & Bảo dưỡng cúp-lê", basePrice: 450_000, estimatedMinutes: 60 } }),
    prisma.service.create({ data: { garageId: garage.id, name: "Nội soi vệ sinh dàn lạnh & Khử mùi Ozone", basePrice: 550_000, estimatedMinutes: 60 } }),
    prisma.service.create({ data: { garageId: garage.id, name: "Nạp ga điều hòa tự động R134a", basePrice: 600_000, estimatedMinutes: 45 } }),
    prisma.service.create({ data: { garageId: garage.id, name: "Cân chỉnh góc đặt bánh xe 3D Laser", basePrice: 450_000, estimatedMinutes: 60 } }),
  ]);

  const parts = await Promise.all([
    prisma.part.create({ data: { garageId: garage.id, sku: "OIL-MOBIL1-0W40", name: "Dầu động cơ Mobil 1 ESP 0W-40 (5L)", unit: "can", costPrice: 1_250_000, sellPrice: 1_650_000, quantityInStock: 20, lowStockThreshold: 5 } }),
    prisma.part.create({ data: { garageId: garage.id, sku: "OIL-CASTROL-5W30", name: "Dầu Castrol EDGE Fully Synthetic 5W-30 (4L)", unit: "can", costPrice: 650_000, sellPrice: 850_000, quantityInStock: 35, lowStockThreshold: 8 } }),
    prisma.part.create({ data: { garageId: garage.id, sku: "FLT-OIL-MB01", name: "Lọc dầu động cơ Mercedes C200/E200", unit: "cái", costPrice: 280_000, sellPrice: 450_000, quantityInStock: 12, lowStockThreshold: 4 } }),
    prisma.part.create({ data: { garageId: garage.id, sku: "FLT-OIL-TY01", name: "Lọc dầu Toyota chính hãng", unit: "cái", costPrice: 95_000, sellPrice: 150_000, quantityInStock: 25, lowStockThreshold: 6 } }),
    prisma.part.create({ data: { garageId: garage.id, sku: "BRK-BREMBO-MB", name: "Bộ má phanh trước Brembo Ceramic Mercedes", unit: "bộ", costPrice: 1_450_000, sellPrice: 2_100_000, quantityInStock: 8, lowStockThreshold: 2 } }),
    prisma.part.create({ data: { garageId: garage.id, sku: "BRK-PAD-TY01", name: "Má phanh trước Toyota Vios", unit: "bộ", costPrice: 480_000, sellPrice: 720_000, quantityInStock: 15, lowStockThreshold: 4 } }),
    prisma.part.create({ data: { garageId: garage.id, sku: "AC-GAS-R134A", name: "Ga điều hòa DuPont R134a", unit: "kg", costPrice: 180_000, sellPrice: 300_000, quantityInStock: 30, lowStockThreshold: 10 } }),
    prisma.part.create({ data: { garageId: garage.id, sku: "BAT-VARTA-AGM", name: "Ắc quy Varta AGM 80Ah Mercedes/BMW", unit: "bình", costPrice: 3_850_000, sellPrice: 4_650_000, quantityInStock: 6, lowStockThreshold: 2 } }),
  ]);

  /* ---------------------------------------------------------------- */
  /* Completed Order 1 (Mercedes C200 - Đã thanh toán và bàn giao)   */
  /* ---------------------------------------------------------------- */

  const ro1 = await prisma.repairOrder.create({
    data: {
      garageId: garage.id,
      code: "RO-2026-0001",
      vehicleId: merc.id,
      customerId: customer1.id,
      status: "COMPLETED",
      receivedAt: daysAgo(3),
      mileageKm: 28_500,
      fuelLevel: 75,
      initialNote: "Bảo dưỡng định kỳ Cấp B theo chỉ báo màn hình táp-lô.",
      advisorId: receptionist.id,
      completedAt: daysAgo(2),
      deliveredAt: daysAgo(2),
    },
  });

  const quoteItems1 = [
    { type: "SERVICE" as const, serviceId: services[1].id, description: "Bảo dưỡng Cấp B Mercedes-Benz", quantity: 1, unitPrice: 1_850_000, discountAmount: 0, totalAmount: 1_850_000, status: "APPROVED" as const, sortOrder: 1 },
    { type: "PART" as const, partId: parts[0].id, description: "Dầu động cơ Mobil 1 ESP 0W-40 (5L)", quantity: 1, unitPrice: 1_650_000, discountAmount: 0, totalAmount: 1_650_000, status: "APPROVED" as const, sortOrder: 2 },
    { type: "PART" as const, partId: parts[2].id, description: "Lọc dầu động cơ Mercedes C200/E200", quantity: 1, unitPrice: 450_000, discountAmount: 0, totalAmount: 450_000, status: "APPROVED" as const, sortOrder: 3 },
    { type: "SERVICE" as const, serviceId: services[4].id, description: "Nội soi vệ sinh dàn lạnh & Khử mùi Ozone", quantity: 1, unitPrice: 550_000, discountAmount: 50_000, totalAmount: 500_000, status: "APPROVED" as const, sortOrder: 4 },
  ];

  const totalRo1 = quoteItems1.reduce((sum, item) => sum + item.totalAmount, 0);

  const quotation1 = await prisma.quotation.create({
    data: {
      garageId: garage.id,
      repairOrderId: ro1.id,
      versionNo: 1,
      status: "APPROVED",
      note: "Báo giá bảo dưỡng định kỳ chuẩn hãng Mercedes-Benz.",
      validUntil: daysFromNow(5),
      sentAt: daysAgo(3),
      decidedAt: daysAgo(3),
      totalAmount: totalRo1,
      createdById: receptionist.id,
      items: { create: quoteItems1 },
    },
    include: { items: true },
  });

  const invoice1 = await prisma.invoice.create({
    data: {
      garageId: garage.id,
      code: "INV-2026-0001",
      repairOrderId: ro1.id,
      customerId: customer1.id,
      status: "PAID",
      subtotal: totalRo1,
      discountAmount: 50_000,
      taxAmount: Math.round((totalRo1 * 8) / 100),
      totalAmount: Math.round(totalRo1 * 1.08),
      paidAmount: Math.round(totalRo1 * 1.08),
      issuedAt: daysAgo(2),
      dueAt: daysAgo(2),
      createdById: cashier.id,
      items: {
        create: quoteItems1.map((q, idx) => ({
          description: q.description,
          quantity: q.quantity,
          unitPrice: q.unitPrice,
          discountAmount: q.discountAmount,
          totalAmount: q.totalAmount,
          sortOrder: idx + 1,
        })),
      },
      payments: {
        create: [
          {
            garageId: garage.id,
            type: "PAYMENT",
            method: "BANK_TRANSFER",
            amount: Math.round(totalRo1 * 1.08),
            paidAt: daysAgo(2),
            reference: "VCB-MB-28500KM-88822",
            receivedById: cashier.id,
          },
        ],
      },
    },
  });

  await prisma.vehicleTimelineEvent.createMany({
    data: [
      {
        vehicleId: merc.id,
        garageId: garage.id,
        type: "MAINTENANCE",
        source: "VERIFIED_GARAGE_RECORD",
        title: "Bảo dưỡng Cấp B Mercedes-Benz",
        description: "Thay dầu Mobil 1 0W-40, lọc dầu chính hãng, nội soi dàn lạnh Nano Bạc.",
        occurredAt: daysAgo(2),
        mileageKm: 28_500,
        repairOrderId: ro1.id,
        createdById: technician1.id,
      },
    ],
  });

  await prisma.maintenanceRecord.create({
    data: {
      vehicleId: merc.id,
      garageId: garage.id,
      repairOrderId: ro1.id,
      title: "Bảo dưỡng Cấp B & Nội soi dàn lạnh",
      performedAt: daysAgo(2),
      mileageKm: 28_500,
      nextDueDate: monthsFromNow(6),
      nextDueMileageKm: 36_500,
    },
  });

  /* ---------------------------------------------------------------- */
  /* Order 2: Đang chờ khách duyệt báo giá (Porsche Macan)            */
  /* ---------------------------------------------------------------- */

  const ro2 = await prisma.repairOrder.create({
    data: {
      garageId: garage.id,
      code: "RO-2026-0002",
      vehicleId: porsche.id,
      customerId: customer2.id,
      status: "WAITING_CUSTOMER_APPROVAL",
      receivedAt: daysAgo(1),
      mileageKm: 18_200,
      fuelLevel: 65,
      initialNote: "Bảo dưỡng mốc 20.000km và cân chỉnh góc đặt bánh xe 3D.",
      advisorId: receptionist.id,
    },
  });

  const quotation2 = await prisma.quotation.create({
    data: {
      garageId: garage.id,
      repairOrderId: ro2.id,
      versionNo: 1,
      status: "SENT",
      note: "Kính mời chị Mai duyệt báo giá trên ứng dụng để xưởng tiến hành thi công.",
      validUntil: daysFromNow(6),
      sentAt: daysAgo(1),
      totalAmount: 3_250_000,
      createdById: receptionist.id,
      items: {
        create: [
          { type: "SERVICE", serviceId: services[0].id, description: "Bảo dưỡng định kỳ 20.000 km", quantity: 1, unitPrice: 850_000, totalAmount: 850_000, sortOrder: 1 },
          { type: "PART", partId: parts[0].id, description: "Dầu động cơ Mobil 1 ESP 0W-40 (5L)", quantity: 1, unitPrice: 1_650_000, totalAmount: 1_650_000, sortOrder: 2 },
          { type: "SERVICE", serviceId: services[6].id, description: "Cân chỉnh góc đặt bánh xe 3D Laser Hunter", quantity: 1, unitPrice: 450_000, totalAmount: 450_000, sortOrder: 3 },
          { type: "SERVICE", serviceId: services[4].id, description: "Khử khuẩn Ozone Nano Bạc khoang nội thất", quantity: 1, unitPrice: 300_000, totalAmount: 300_000, sortOrder: 4 },
        ],
      },
    },
  });

  await prisma.notification.create({
    data: {
      userId: khach2User.id,
      garageId: garage.id,
      type: "QUOTATION",
      title: "Báo giá điện tử cho xe Porsche Macan (51K-668.99)",
      body: "Gara AutoCare đã lập báo giá cho lệnh RO-2026-0002. Vui lòng bấm để phê duyệt từng hạng mục.",
      data: { href: `/tai-khoan/bao-gia/${quotation2.id}` },
    },
  });

  /* ---------------------------------------------------------------- */
  /* Upcoming Appointments                                            */
  /* ---------------------------------------------------------------- */

  await prisma.appointment.create({
    data: {
      garageId: garage.id,
      customerId: customer1.id,
      vehicleId: vios.id,
      status: "CONFIRMED",
      scheduledAt: daysFromNow(2),
      endsAt: new Date(daysFromNow(2).getTime() + 60 * 60 * 1000),
      serviceRequest: "Kiểm tra thay má phanh trước và đảo lốp.",
      createdById: khach1User.id,
      confirmedById: receptionist.id,
    },
  });

  await prisma.appointment.create({
    data: {
      garageId: garage.id,
      customerId: customer3.id,
      vehicleId: ranger.id,
      status: "PENDING",
      scheduledAt: daysFromNow(4),
      endsAt: new Date(daysFromNow(4).getTime() + 60 * 60 * 1000),
      serviceRequest: "Bảo dưỡng định kỳ 50.000km và vệ sinh buồng đốt.",
      createdById: khach3User.id,
    },
  });

  console.log("==================================================");
  console.log("✅ SEED DỮ LIỆU DEMO THÀNH CÔNG RỰC RỠ!");
  console.log("==================================================");
  console.log("🔑 MẬT KHẨU CHUNG CHO TẤT CẢ TÀI KHOẢN: " + DEMO_PASSWORD);
  console.log("--------------------------------------------------");
  console.log("👤 TÀI KHOẢN KHÁCH HÀNG (CUSTOMER PORTAL):");
  console.log("   1. khach1@gmail.com (Anh Tuấn: Mercedes C200 & Toyota Vios)");
  console.log("   2. khach2@gmail.com (Chị Mai: Porsche Macan & Mazda CX-5)");
  console.log("   3. khach3@gmail.com (Anh Nam: VinFast VF8 & Ford Ranger)");
  console.log("--------------------------------------------------");
  console.log("🏢 TÀI KHOẢN NHÂN VIÊN GARA (STAFF DASHBOARD):");
  console.log("   - Quản đốc xưởng: quanly@garathanhdat.vn");
  console.log("   - Lễ tân tiếp nhận: letan@garathanhdat.vn");
  console.log("   - Kỹ thuật trưởng: kythuat1@garathanhdat.vn");
  console.log("   - Kế toán thu ngân: thungan@garathanhdat.vn");
  console.log("==================================================");
}

main()
  .catch((error) => {
    console.error("Seed thất bại:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
