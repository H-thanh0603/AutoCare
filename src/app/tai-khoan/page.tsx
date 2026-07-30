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
  title: "Tài khoản của tôi · AutoCare.vn",
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

  const activeOrdersCount = orders.filter((o) => o.status !== "COMPLETED" && o.status !== "CANCELLED").length;
  const pendingAptsCount = appointments.filter((a) => a.status === "PENDING" || a.status === "CONFIRMED").length;

  return (
    <div className="space-y-10">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 text-white rounded-3xl p-6 sm:p-8 shadow-xl relative overflow-hidden">
        <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-extrabold bg-white/20 text-white backdrop-blur-sm">
              <Sparkles className="size-3.5 text-amber-300 fill-amber-300" />
              <span>Cổng Thông Tin Chủ Xe</span>
            </div>
            <h1 className="text-2xl sm:text-4xl font-black tracking-tight">
              Xin chào, {user.name}!
            </h1>
            <p className="text-blue-100 text-sm max-w-xl font-medium">
              Quản lý danh sách xe, theo dõi lịch hẹn trực tuyến và kiểm tra toàn bộ lịch sử sửa chữa minh bạch 100%.
            </p>
          </div>

          <Button
            render={<Link href="/tai-khoan/lich-hen/moi" />}
            className="bg-white hover:bg-slate-100 text-blue-700 font-black px-6 py-3 h-12 rounded-2xl shadow-lg shrink-0 transition-transform hover:scale-105"
          >
            <Plus className="size-5 mr-1.5" />
            <span>Đặt Lịch Bảo Dưỡng</span>
          </Button>
        </div>
      </div>

      {/* Quick Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-xl">
            🚘
          </div>
          <div>
            <span className="text-xs text-slate-500 font-bold block uppercase">Xe đang quản lý</span>
            <span className="text-2xl font-black text-slate-900 font-mono">{vehicles.length} Chiếc</span>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center font-bold text-xl">
            ⏱️
          </div>
          <div>
            <span className="text-xs text-slate-500 font-bold block uppercase">Lịch hẹn sắp tới</span>
            <span className="text-2xl font-black text-emerald-600 font-mono">{pendingAptsCount} Lịch</span>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-100 text-amber-600 flex items-center justify-center font-bold text-xl">
            🛠️
          </div>
          <div>
            <span className="text-xs text-slate-500 font-bold block uppercase">Lệnh xe đang làm</span>
            <span className="text-2xl font-black text-amber-600 font-mono">{activeOrdersCount} Đang làm</span>
          </div>
        </div>
      </div>

      {/* Vehicles Section */}
      <section aria-labelledby="portal-vehicles-heading" className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 id="portal-vehicles-heading" className="text-xl font-black text-slate-900 flex items-center gap-2">
            <Car className="size-5 text-blue-600" />
            <span>Danh Sách Xe Của Tôi ({vehicles.length})</span>
          </h2>
        </div>

        {vehicles.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-3xl p-8 text-center text-slate-500 text-sm shadow-sm">
            Chưa ghi nhận chiếc xe nào. Khi mang xe tới Gara đối tác AutoCare, hồ sơ xe sẽ tự động hiển thị ở đây.
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2">
            {vehicles.map((vehicle) => (
              <div
                key={vehicle.id}
                className="bg-white border border-slate-200 hover:border-blue-500/50 rounded-3xl p-6 shadow-sm hover:shadow-xl space-y-4 transition-all duration-300 hover:-translate-y-1"
              >
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div>
                    <h3 className="font-extrabold text-xl text-slate-900">{vehicle.licensePlate}</h3>
                    <p className="text-xs font-semibold text-slate-500 mt-0.5">
                      {vehicle.brand} {vehicle.model} {vehicle.year ? `· Năm SX: ${vehicle.year}` : ""}
                    </p>
                  </div>
                  <span className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 font-bold text-lg">
                    🏎️
                  </span>
                </div>

                <div className="flex items-center justify-between text-xs pt-1">
                  <span className="text-slate-500 font-bold">Số km hiện tại:</span>
                  <span className="font-mono font-black text-blue-600 text-sm">
                    {vehicle.currentKm === null ? "Chưa ghi nhận" : `${KM_FORMATTER.format(vehicle.currentKm)} km`}
                  </span>
                </div>

                <div className="pt-2 border-t border-slate-100 flex items-center justify-end">
                  <Button
                    size="sm"
                    variant="outline"
                    render={<Link href={`/tai-khoan/xe/${vehicle.id}`} />}
                    className="border-blue-200 bg-blue-50/50 hover:bg-blue-600 hover:text-white text-blue-700 font-extrabold text-xs rounded-xl h-9 px-4 transition-all"
                  >
                    <ShieldCheck className="size-4 mr-1.5" />
                    <span>Xem Sổ Sức Khỏe Xe</span>
                    <ChevronRight className="size-3.5 ml-1" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Repair Orders Section */}
      <section aria-labelledby="portal-orders-heading" className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 id="portal-orders-heading" className="text-xl font-black text-slate-900 flex items-center gap-2">
            <Wrench className="size-5 text-indigo-600" />
            <span>Lịch Sử Sửa Chữa & Báo Giá Gần Đây</span>
          </h2>
        </div>

        {orders.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-3xl p-8 text-center text-slate-500 text-sm shadow-sm">
            Chưa có lệnh sửa chữa nào.
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map((order) => (
              <div
                key={order.id}
                className="bg-white border border-slate-200 hover:border-indigo-500/50 rounded-3xl p-6 shadow-sm hover:shadow-lg flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all"
              >
              <div className="space-y-1.5">
                  <div className="flex items-center gap-3">
                    <span className="font-mono font-black text-slate-900 text-base">{order.code}</span>
                    <span className="px-3 py-1 rounded-full text-xs font-extrabold bg-indigo-100 text-indigo-800 border border-indigo-200">
                      {repairOrderStatusLabel(order.status)}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 font-medium">
                    Gara: <strong className="text-slate-900">{order.garage.name}</strong> • Xe: <span className="font-mono font-bold text-blue-600">{order.vehicle.licensePlate}</span>
                  </p>
                  <p className="text-[11px] text-slate-400 font-mono">
                    Ngày tiếp nhận: {DATE_TIME_FORMATTER.format(new Date(order.receivedAt))}
                  </p>
                </div>

                {order.latestQuotation ? (
                  <Link
                    href={`/tai-khoan/bao-gia/${order.latestQuotation.id}`}
                    className="text-xs font-bold text-indigo-600 hover:text-indigo-700 inline-flex items-center gap-1 shrink-0"
                  >
                    Xem &amp; duyệt báo giá <ChevronRight className="size-4" />
                  </Link>
                ) : null}
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Appointments Section */}
      <section aria-labelledby="portal-appointments-heading" className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 id="portal-appointments-heading" className="text-xl font-black text-slate-900 flex items-center gap-2">
            <CalendarClock className="size-5 text-emerald-600" />
            <span>Lịch Hẹn Của Tôi</span>
          </h2>
          <Button
            size="sm"
            render={<Link href="/tai-khoan/lich-hen/moi" />}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs rounded-xl shadow-md"
          >
            + Đặt Lịch Hẹn Mới
          </Button>
        </div>

        {appointments.length === 0 ? (
          <div className="bg-white border border-slate-200 rounded-3xl p-8 text-center text-slate-500 text-sm shadow-sm">
            Chưa có lịch hẹn nào.
          </div>
        ) : (
          <div className="space-y-3">
            {appointments.map((apt) => (
              <div
                key={apt.id}
                className="bg-white border border-slate-200 hover:border-emerald-500/50 rounded-3xl p-5 shadow-sm hover:shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-slate-900 text-sm">
                      {DATE_TIME_FORMATTER.format(new Date(apt.scheduledAt))}
                    </span>
                    <span className="px-3 py-1 rounded-full text-xs font-extrabold bg-emerald-100 text-emerald-800 border border-emerald-200">
                      {appointmentStatusLabel(apt.status)}
                    </span>
                  </div>
                  <p className="text-xs text-slate-600 font-medium">
                    Gara: <strong className="text-slate-900">{apt.garage.name}</strong> • Nhu cầu: {apt.serviceRequest ?? "Bảo dưỡng chung"}
                  </p>
                </div>

                <Link
                  href={`/tai-khoan/lich-hen/${apt.id}`}
                  className="text-xs font-bold text-emerald-600 hover:text-emerald-700 inline-flex items-center gap-1"
                >
                  Xem chi tiết <ChevronRight className="size-4" />
                </Link>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
