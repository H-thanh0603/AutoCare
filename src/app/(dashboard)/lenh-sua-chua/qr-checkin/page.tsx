import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowLeft,
  CalendarCheck,
  Car,
  CheckCircle2,
  Clock,
  QrCode,
  ShieldCheck,
  Sparkles,
  Zap,
} from "lucide-react";

import { requireStaffPermissionPage } from "@/features/auth/guards";
import { prisma } from "@/lib/prisma";
import { QrCheckinForm } from "./qr-checkin-form";

export const metadata: Metadata = {
  title: "Tiếp nhận xe 1-Touch bằng QR Code · AutoCare",
};

export default async function QrCheckinPage() {
  const { garageId } = await requireStaffPermissionPage("/lenh-sua-chua", "repair-order:write");

  // Fetch recent vehicles owned in THIS garage for quick 1-click check-in.
  const vehiclesRaw = await prisma.vehicle.findMany({
    where: {
      deletedAt: null,
      ownerships: {
        some: { isCurrent: true, endedAt: null, customer: { garageId, deletedAt: null } },
      },
    },
    take: 6,
    orderBy: { createdAt: "desc" },
    include: {
      ownerships: {
        where: { isCurrent: true, endedAt: null, customer: { garageId, deletedAt: null } },
        include: { customer: { select: { name: true, phone: true } } },
      },
    },
  });

  const vehicles = vehiclesRaw.map((v) => ({
    id: v.id,
    licensePlate: v.licensePlate,
    brand: v.brand,
    model: v.model,
    owner: v.ownerships[0]?.customer ?? null,
  }));

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      {/* Back Link */}
      <Link
        href="/lenh-sua-chua"
        className="inline-flex items-center gap-2 text-xs font-bold text-slate-600 hover:text-blue-600 transition-colors"
      >
        <ArrowLeft className="size-4" /> Quay lại danh sách Lệnh sửa chữa
      </Link>

      {/* Header Banner */}
      <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 text-white rounded-3xl p-6 sm:p-8 shadow-xl space-y-3">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-white/20 text-white uppercase tracking-wide">
          <Sparkles className="size-3.5 text-amber-300 fill-amber-300" />
          <span>Công Nghệ Tiếp Nhận Xe 1-Touch</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-black flex items-center gap-2">
          <QrCode className="size-7 text-amber-300" />
          <span>Quét Mã QR Code Tiếp Nhận Xe Tắc Thì</span>
        </h1>
        <p className="text-blue-100 text-xs sm:text-sm font-medium">
          Dùng camera điện thoại hoặc máy quét mã QR để nhận diện xe trong 1 giây, tự động nạp lịch sử bảo dưỡng và khởi tạo Lệnh sửa chữa ngay lập tức.
        </p>
      </div>

      {/* Form Component */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-xl">
        <QrCheckinForm vehicles={vehicles} />
      </div>
    </div>
  );
}
