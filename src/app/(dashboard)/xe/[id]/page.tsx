import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  AlertTriangle,
  Award,
  Calendar,
  Car,
  CheckCircle2,
  Clock,
  Gauge,
  History,
  ShieldCheck,
  User,
  Wrench,
} from "lucide-react";

import { listCustomerOptions } from "@/data/customers";
import { getVehicleDetail } from "@/data/vehicles";
import { requireStaffPermissionPage } from "@/features/auth/guards";
import { getVehicleHealthOverview } from "@/features/vehicle-health/service";
import { ShareLinkManager } from "@/features/vehicle-health/share-link-manager";
import { VehicleHistoryForms } from "@/features/vehicles/vehicle-history-forms";
import { can } from "@/lib/rbac";
import { formatVnd } from "@/lib/money";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Chi tiết xe & Hồ sơ kỹ thuật · AutoCare",
};

const KM_FORMATTER = new Intl.NumberFormat("vi-VN");
const DATE_FORMATTER = new Intl.DateTimeFormat("vi-VN", { dateStyle: "medium", timeStyle: "short" });

export default async function VehicleDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { user, garageId } = await requireStaffPermissionPage("/xe", "vehicle:read");
  const vehicleId = (await params).id;

  let vehicle;
  let healthOverview;
  try {
    vehicle = await getVehicleDetail(garageId, vehicleId);
    healthOverview = await getVehicleHealthOverview(vehicleId);
  } catch {
    notFound();
  }

  const canWrite = user.garageRole === "RECEPTIONIST" || user.garageRole === "GARAGE_MANAGER";
  const canManageShare = can(user, "share-link:manage");
  const owners = canWrite ? await listCustomerOptions(garageId) : [];

  return (
    <div className="space-y-8">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 text-white rounded-3xl p-6 sm:p-8 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-white/20 text-white uppercase tracking-wide">
            <Car className="size-3.5 text-amber-300" />
            <span>Hồ Sơ Xe & Tình Trạng Kỹ Thuật</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-black font-mono tracking-tight">
            {vehicle.licensePlate}
          </h1>
          <p className="text-blue-100 text-sm font-semibold">
            {vehicle.brand} {vehicle.model} {vehicle.year ? `· Năm SX: ${vehicle.year}` : ""} {vehicle.color ? `· Màu: ${vehicle.color}` : ""}
          </p>
        </div>

        {canWrite && (
          <Button
            render={<Link href={`/xe/${vehicle.id}/sua`} />}
            className="bg-white hover:bg-slate-100 text-blue-700 font-black px-6 h-12 rounded-2xl shadow-lg shrink-0"
          >
            Sửa Thông Tin Xe
          </Button>
        )}
      </div>

      {/* KPI Cards */}
      <div className="grid gap-6 md:grid-cols-3">
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-1">
          <span className="text-xs font-bold text-slate-500 uppercase block">Số km hiện tại</span>
          <span className="text-2xl font-black text-blue-600 font-mono">
            {vehicle.currentKm === null ? "Chưa ghi nhận" : `${KM_FORMATTER.format(vehicle.currentKm)} km`}
          </span>
        </div>

        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-1">
          <span className="text-xs font-bold text-slate-500 uppercase block">Chủ sở hữu hiện tại</span>
          {vehicle.owner ? (
            <Link className="text-lg font-black text-slate-900 hover:text-blue-600 transition-colors block truncate" href={`/khach-hang/${vehicle.owner.id}`}>
              {vehicle.owner.name} ({vehicle.owner.phone})
            </Link>
          ) : (
            <span className="text-slate-400 text-sm italic block">Chưa gán chủ sở hữu</span>
          )}
        </div>

        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-1">
          <span className="text-xs font-bold text-slate-500 uppercase block">Số VIN / Số khung</span>
          <span className="text-lg font-mono font-bold text-slate-800 block truncate">{vehicle.vin ?? "Chưa có"}</span>
        </div>
      </div>

      {/* System Technical Conditions */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
        <h2 className="text-lg font-black text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2">
          <ShieldCheck className="size-5 text-blue-600" />
          <span>Tình Trạng Kỹ Thuật Các Hệ Thống Xe</span>
        </h2>

        {healthOverview.systemStatuses.length === 0 ? (
          <p className="text-slate-400 text-xs italic">Chưa ghi nhận tình trạng kỹ thuật hệ thống nào.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {healthOverview.systemStatuses.map((sys) => {
              const isGood = sys.condition === "GOOD";
              return (
                <div key={sys.id} className="bg-slate-50 border border-slate-100 rounded-2xl p-4 flex justify-between items-start text-xs">
                  <div>
                    <span className="font-bold text-slate-900 text-sm block">{sys.system}</span>
                    <p className="text-slate-500 mt-0.5">{sys.note ?? "Bình thường"}</p>
                  </div>
                  <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${isGood ? "bg-emerald-100 text-emerald-800 border border-emerald-200" : "bg-amber-100 text-amber-800 border border-amber-200"}`}>
                    {isGood ? "✓ AN TOÀN" : "⚠️ CẦN CHÚ Ý"}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* History Sections */}
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
          <h2 className="text-lg font-black text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2">
            <Gauge className="size-5 text-indigo-600" />
            <span>Lịch Sử Ghi Nhận Số Km</span>
          </h2>
          {vehicle.mileageLogs.length ? (
            <div className="space-y-3 text-xs">
              {vehicle.mileageLogs.map((log) => (
                <div key={log.id} className="border-b border-slate-100 pb-3 last:border-0 flex justify-between items-center">
                  <div>
                    <span className="font-bold font-mono text-slate-900 text-sm">{KM_FORMATTER.format(log.mileageKm)} km</span>
                    {log.note && <p className="text-slate-500 mt-0.5">{log.note}</p>}
                  </div>
                  <span className="text-slate-400 font-mono">{DATE_FORMATTER.format(new Date(log.recordedAt))}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-slate-400 italic">Chưa có lịch sử số km.</p>
          )}
        </div>

        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
          <h2 className="text-lg font-black text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2">
            <User className="size-5 text-emerald-600" />
            <span>Lịch Sử Chủ Sở Hữu</span>
          </h2>
          {vehicle.ownerships.length ? (
            <div className="space-y-3 text-xs">
              {vehicle.ownerships.map((ownership) => (
                <div key={ownership.id} className="border-b border-slate-100 pb-3 last:border-0 flex justify-between items-center">
                  <span className="font-bold text-slate-900 text-sm">{ownership.customer.name}</span>
                  <span className="text-slate-400 font-mono">
                    Từ {DATE_FORMATTER.format(new Date(ownership.startedAt))}
                    {ownership.endedAt ? ` đến ${DATE_FORMATTER.format(new Date(ownership.endedAt))}` : " · Hiện tại"}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-slate-400 italic">Chưa có lịch sử chuyển nhượng chủ xe.</p>
          )}
        </div>
      </div>

      {canWrite && (
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
          <VehicleHistoryForms vehicleId={vehicle.id} owners={owners} />
        </div>
      )}

      {canManageShare && (
        <ShareLinkManager vehicleId={vehicle.id} links={healthOverview.shareLinks} />
      )}

      {/* Vehicle Timeline */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm space-y-4">
        <h2 className="text-lg font-black text-slate-900 border-b border-slate-100 pb-3 flex items-center gap-2">
          <History className="size-5 text-blue-600" />
          <span>Timeline Sự Kiện Kỹ Thuật Xe ({vehicle.timeline.length})</span>
        </h2>
        {vehicle.timeline.length ? (
          <ol className="space-y-4 border-l-2 border-blue-200 pl-4 ml-2">
            {vehicle.timeline.map((event) => (
              <li key={event.id} className="relative space-y-1">
                <span className="absolute -left-[23px] top-1.5 w-3 h-3 rounded-full bg-blue-600 border-2 border-white" />
                <p className="font-extrabold text-sm text-slate-900">{event.title}</p>
                <p className="text-xs text-slate-400 font-mono">
                  {DATE_FORMATTER.format(new Date(event.occurredAt))}
                  {event.mileageKm !== null ? ` · ${KM_FORMATTER.format(event.mileageKm)} km` : ""}
                </p>
                {event.description && <p className="text-xs text-slate-600 mt-1">{event.description}</p>}
              </li>
            ))}
          </ol>
        ) : (
          <p className="text-xs text-slate-400 italic">Chưa có sự kiện timeline nào.</p>
        )}
      </div>
    </div>
  );
}
