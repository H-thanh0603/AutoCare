import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  AlertTriangle,
  ArrowLeft,
  Award,
  CalendarCheck,
  Car,
  CheckCircle2,
  Clock,
  ExternalLink,
  FileCheck2,
  Gauge,
  Info,
  Package,
  Share2,
  ShieldCheck,
  Sparkles,
  Wrench,
  Zap,
} from "lucide-react";

import { requireUserPage } from "@/features/auth/guards";
import { getPortalVehicleHealth } from "@/features/vehicle-health/service";
import { formatVnd } from "@/lib/money";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Sổ Sức Khỏe Kỹ Thuật Xe · AutoCare",
};

const DATE_FORMATTER = new Intl.DateTimeFormat("vi-VN", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

const KM_FORMATTER = new Intl.NumberFormat("vi-VN");

export default async function PortalVehicleDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUserPage("/tai-khoan");
  const vehicleId = (await params).id;

  let vehicle;
  try {
    vehicle = await getPortalVehicleHealth(user.id, vehicleId);
  } catch {
    notFound();
  }

  // Calculate Health Score based on system statuses
  let totalScore = 100;
  if (vehicle.systemStatuses.length > 0) {
    let penalty = 0;
    for (const sys of vehicle.systemStatuses) {
      if (sys.condition === "POOR") penalty += 25;
      else if (sys.condition === "FAIR") penalty += 10;
    }
    totalScore = Math.max(30, 100 - penalty);
  }

  return (
    <div className="space-y-8">
      {/* Back Navigation */}
      <div className="flex items-center justify-between">
        <Link
          href="/tai-khoan"
          className="inline-flex items-center gap-2 text-xs font-bold text-slate-600 hover:text-blue-600 transition-colors"
        >
          <ArrowLeft className="size-4" /> Quay lại danh sách xe
        </Link>
        <span className="px-3 py-1 bg-emerald-100 text-emerald-800 text-xs font-extrabold rounded-full border border-emerald-200">
          ✓ Dữ liệu Gara xác thực 100%
        </span>
      </div>

      {/* Vehicle Header Banner */}
      <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 text-white rounded-3xl p-6 sm:p-8 shadow-xl space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 border-b border-white/20 pb-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-white/20 text-white uppercase tracking-wide">
              <Sparkles className="size-3.5 text-amber-300 fill-amber-300" />
              <span>Hồ Sơ Kỹ Thuật Xe Điện Tử</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-black font-mono tracking-tight">
              {vehicle.licensePlate}
            </h1>
            <p className="text-blue-100 text-sm font-semibold">
              {vehicle.brand} {vehicle.model} {vehicle.year ? `· Năm sản xuất: ${vehicle.year}` : ""} {vehicle.color ? `· Màu: ${vehicle.color}` : ""}
            </p>
          </div>

          {/* Health Score Badge */}
          <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-4 text-center shrink-0 min-w-[140px]">
            <span className="text-[11px] text-blue-100 block font-bold uppercase tracking-wider">Chỉ số Sức khỏe</span>
            <span className="text-3xl font-black font-mono text-amber-300">{totalScore} / 100</span>
            <span className="text-[10px] text-emerald-300 font-bold block mt-0.5">
              {totalScore >= 80 ? "Tốt - An toàn" : totalScore >= 60 ? "Cần bảo dưỡng" : "Cảnh báo kỹ thuật"}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
          <div>
            <span className="text-blue-200 block font-medium">Số km hiện tại:</span>
            <strong className="text-white font-mono text-sm">
              {vehicle.currentKm ? `${KM_FORMATTER.format(vehicle.currentKm)} km` : "Chưa ghi nhận"}
            </strong>
          </div>

          <div>
            <span className="text-blue-200 block font-medium">Số VIN / Khung:</span>
            <strong className="text-white font-mono text-sm">{vehicle.vin ?? "Chưa cập nhật"}</strong>
          </div>

          <div>
            <span className="text-blue-200 block font-medium">Lượt sửa chữa tại Gara:</span>
            <strong className="text-white font-mono text-sm">{vehicle.maintenance.length} Đợt</strong>
          </div>

          <div>
            <span className="text-blue-200 block font-medium">Bảo hành còn hiệu lực:</span>
            <strong className="text-emerald-300 font-mono text-sm">{vehicle.warranties.length} Gói</strong>
          </div>
        </div>
      </div>

      {/* System Technical Conditions */}
      <section aria-labelledby="technical-conditions-heading" className="space-y-4">
        <h2 id="technical-conditions-heading" className="text-xl font-black text-slate-900 flex items-center gap-2">
          <ShieldCheck className="size-5 text-blue-600" />
          <span>Tình Trạng Kỹ Thuật Các Hệ Thống Xe</span>
        </h2>

        {vehicle.systemStatuses.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-3xl p-6 text-center text-slate-500 text-sm">
            Hệ thống kỹ thuật được kiểm tra và ghi nhận khi xe vào Gara bảo dưỡng lần đầu.
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {vehicle.systemStatuses.map((sys) => {
              const isGood = sys.condition === "GOOD";
              return (
                <div
                  key={sys.id}
                  className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-2 flex items-start justify-between gap-4"
                >
                  <div className="space-y-1">
                    <span className="font-bold text-slate-900 text-sm block">{sys.system}</span>
                    <p className="text-xs text-slate-500">{sys.note ?? "Hoạt động bình thường"}</p>
                    <span className="text-[10px] text-slate-400 font-mono block">Cập nhật: {DATE_FORMATTER.format(new Date(sys.updatedAt))}</span>
                  </div>

                  <span
                    className={`px-3 py-1 rounded-full text-xs font-black shrink-0 ${
                      isGood
                        ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                        : "bg-amber-100 text-amber-800 border border-amber-200"
                    }`}
                  >
                    {isGood ? "✓ AN TOÀN" : "⚠️ CẦN CHÚ Ý"}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Maintenance History Records */}
      <section aria-labelledby="maintenance-history-heading" className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-xl space-y-6">
        <h2 id="maintenance-history-heading" className="text-xl font-black text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2">
          <Wrench className="size-5 text-indigo-600" />
          <span>Lịch Sử Bảo Dưỡng Xác Thực Gara ({vehicle.maintenance.length})</span>
        </h2>

        {vehicle.maintenance.length === 0 ? (
          <p className="text-slate-400 text-xs italic">Chưa có lịch sử bảo dưỡng nào được ghi nhận.</p>
        ) : (
          <div className="space-y-4">
            {vehicle.maintenance.map((m) => (
              <div key={m.id} className="bg-slate-50 border border-slate-100 rounded-2xl p-5 space-y-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200/60 pb-2">
                  <span className="font-bold text-slate-900 text-sm">{m.title}</span>
                  <div className="flex items-center gap-3 text-xs">
                    {m.mileageKm !== null && <span className="font-mono font-bold text-blue-600">{KM_FORMATTER.format(m.mileageKm)} km</span>}
                    <span className="text-slate-400 font-mono">{DATE_FORMATTER.format(new Date(m.performedAt))}</span>
                  </div>
                </div>
                {m.description && <p className="text-xs text-slate-600 leading-relaxed">{m.description}</p>}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Active Warranties Card */}
      <section aria-labelledby="warranties-heading" className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-xl space-y-4">
        <h2 id="warranties-heading" className="text-xl font-black text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2">
          <Award className="size-5 text-emerald-600" />
          <span>Bảo Hành Phụ Tùng & Dịch Vụ Còn Hiệu Lực ({vehicle.warranties.length})</span>
        </h2>

        {vehicle.warranties.length === 0 ? (
          <p className="text-slate-400 text-xs italic">Không có gói bảo hành nào đang hoạt động.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {vehicle.warranties.map((w) => (
              <div key={w.id} className="bg-emerald-50/60 border border-emerald-200 rounded-2xl p-4 space-y-1 text-xs">
                <span className="font-bold text-emerald-900 text-sm block">{w.name}</span>
                <p className="text-slate-600">{w.terms}</p>
                <span className="text-[11px] font-mono text-emerald-700 block pt-1">
                  Hết hạn: {w.expiresAt ? DATE_FORMATTER.format(new Date(w.expiresAt)) : "Vĩnh viễn"}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
