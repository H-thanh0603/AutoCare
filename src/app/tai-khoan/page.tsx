import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  Bell,
  CalendarCheck,
  CalendarClock,
  Car,
  ChevronRight,
  Clock,
  FileText,
  Plus,
  ShieldCheck,
  Sparkles,
  Wrench,
} from "lucide-react";

import {
  listPortalAppointments,
  listPortalRepairOrders,
  listPortalVehicles,
} from "@/data/portal";
import { requireUserPage } from "@/features/auth/guards";
import {
  appointmentStatusLabel,
  repairOrderStatusLabel,
} from "@/features/repair-orders/labels";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Tài khoản của tôi · AutoCare",
};

const DATE_TIME_FORMATTER = new Intl.DateTimeFormat("vi-VN", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

const KM_FORMATTER = new Intl.NumberFormat("vi-VN");

export default async function PortalPage() {
  const user = await requireUserPage("/tai-khoan");

  const [vehicles, appointments, orders] = await Promise.all([
    listPortalVehicles(user.id),
    listPortalAppointments(user.id, { take: 5 }),
    listPortalRepairOrders(user.id, { take: 5 }),
  ]);

  const hasAnything = vehicles.length > 0 || appointments.length > 0 || orders.length > 0;

  return (
    <div className="space-y-10">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-blue-900/40 via-indigo-900/40 to-slate-900 border border-blue-500/20 rounded-2xl p-6 sm:p-8 shadow-2xl relative overflow-hidden backdrop-blur-md">
        <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20">
              <Sparkles className="size-3.5 text-blue-400" />
              <span>Chủ xe AutoCare</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Xin chào, {user.name}!
            </h1>
            <p className="text-slate-300 text-sm max-w-xl">
              Quản lý danh sách xe, theo dõi lịch hẹn và kiểm tra toàn bộ lịch sử sửa chữa minh bạch.
            </p>
          </div>

          <Button
            render={<Link href="/tai-khoan/lich-hen/moi" />}
            className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold px-5 py-2.5 rounded-xl shadow-lg shadow-blue-600/30 shrink-0 transition-transform hover:scale-105"
          >
            <Plus className="size-4 mr-1.5" />
            <span>Đặt lịch bảo dưỡng</span>
          </Button>
        </div>
      </div>

      {!hasAnything && (
        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-10 text-center space-y-4 shadow-lg">
          <Car className="size-12 text-slate-500 mx-auto" />
          <h3 className="text-lg font-bold text-slate-200">Chưa có thông tin xe</h3>
          <p className="text-slate-400 text-sm max-w-md mx-auto">
            Tài khoản của bạn chưa liên kết với xe nào. Khi bạn mang xe tới gara đối tác của AutoCare, hồ sơ xe sẽ tự động xuất hiện ở đây.
          </p>
          <Button
            render={<Link href="/tai-khoan/lich-hen/moi" />}
            className="bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl"
          >
            Đặt lịch hẹn đầu tiên
          </Button>
        </div>
      )}

      {/* Vehicles Section */}
      <section aria-labelledby="portal-vehicles-heading" className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 id="portal-vehicles-heading" className="text-xl font-bold text-white flex items-center gap-2">
            <Car className="size-5 text-blue-400" />
            <span>Xe của tôi ({vehicles.length})</span>
          </h2>
        </div>

        {vehicles.length === 0 ? (
          <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-6 text-center text-slate-400 text-sm">
            Chưa ghi nhận chiếc xe nào.
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2">
            {vehicles.map((vehicle) => (
              <div
                key={vehicle.id}
                className="bg-slate-900/80 border border-slate-800 hover:border-blue-500/40 rounded-2xl p-6 shadow-xl space-y-4 transition-all duration-300 hover:-translate-y-1"
              >
                <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
                  <div>
                    <h3 className="font-extrabold text-lg text-white">{vehicle.licensePlate}</h3>
                    <p className="text-xs text-slate-400">
                      {vehicle.brand} {vehicle.model} {vehicle.year ? `· ${vehicle.year}` : ""}
                    </p>
                  </div>
                  <span className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 font-bold text-sm">
                    🏎️
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs pt-1">
                  <span className="text-slate-400">Số km hiện tại:</span>
                  <span className="font-mono font-bold text-blue-400">
                    {vehicle.currentKm === null ? "Chưa ghi nhận" : `${KM_FORMATTER.format(vehicle.currentKm)} km`}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Repair Orders Section */}
      <section aria-labelledby="portal-orders-heading" className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 id="portal-orders-heading" className="text-xl font-bold text-white flex items-center gap-2">
            <Wrench className="size-5 text-indigo-400" />
            <span>Lịch sử Sửa chữa gần nhất</span>
          </h2>
        </div>

        {orders.length === 0 ? (
          <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-6 text-center text-slate-400 text-sm">
            Chưa có lệnh sửa chữa nào.
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => (
              <div
                key={order.id}
                className="bg-slate-900/80 border border-slate-800 hover:border-indigo-500/40 rounded-2xl p-5 shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-slate-100 text-base">{order.code}</span>
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-300 border border-indigo-500/20">
                      {repairOrderStatusLabel(order.status)}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400">
                    Gara: <strong className="text-slate-300">{order.garage.name}</strong> • Xe: <span className="font-mono text-slate-200">{order.vehicle.licensePlate}</span>
                  </p>
                  <p className="text-[11px] text-slate-500 font-mono">
                    Ngày tiếp nhận: {DATE_TIME_FORMATTER.format(new Date(order.receivedAt))}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Appointments Section */}
      <section aria-labelledby="portal-appointments-heading" className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 id="portal-appointments-heading" className="text-xl font-bold text-white flex items-center gap-2">
            <CalendarClock className="size-5 text-emerald-400" />
            <span>Lịch hẹn của tôi</span>
          </h2>
          <Button
            size="sm"
            variant="outline"
            render={<Link href="/tai-khoan/lich-hen/moi" />}
            className="border-slate-700 bg-slate-900 hover:bg-slate-800 text-slate-200 text-xs rounded-xl"
          >
            + Đặt lịch mới
          </Button>
        </div>

        {appointments.length === 0 ? (
          <div className="bg-slate-900/40 border border-slate-800 rounded-xl p-6 text-center text-slate-400 text-sm">
            Chưa có lịch hẹn nào.
          </div>
        ) : (
          <div className="space-y-3">
            {appointments.map((apt) => (
              <div
                key={apt.id}
                className="bg-slate-900/80 border border-slate-800 hover:border-emerald-500/40 rounded-2xl p-5 shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-slate-100 text-sm">
                      {DATE_TIME_FORMATTER.format(new Date(apt.scheduledAt))}
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                      {appointmentStatusLabel(apt.status)}
                    </span>
                  </div>
                  <p className="text-xs text-slate-400">
                    Gara: <strong className="text-slate-300">{apt.garage.name}</strong> • Yêu cầu: {apt.serviceRequest ?? "Bảo dưỡng chung"}
                  </p>
                </div>

                <Link
                  href={`/tai-khoan/lich-hen/${apt.id}`}
                  className="text-xs font-medium text-emerald-400 hover:text-emerald-300 inline-flex items-center gap-1"
                >
                  Chi tiết <ChevronRight className="size-3.5" />
                </Link>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
