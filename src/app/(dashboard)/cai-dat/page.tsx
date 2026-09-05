import type { Metadata } from "next";
import {
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  KeyRound,
  Shield,
  ShieldCheck,
  UserCheck,
  Users,
  Wrench,
} from "lucide-react";

import { getGarageById } from "@/data/garages";
import { requireStaffPermissionPage } from "@/features/auth/guards";
import { AppointmentSettingsForm } from "@/features/appointments/settings-form";
import { getUpcomingOverload } from "@/features/appointments/service";
import { updateAppointmentSettingsFormAction } from "@/features/appointments/actions";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "Cài đặt & Quản lý Nhân sự · AutoCare",
};

const DATE_FORMATTER = new Intl.DateTimeFormat("vi-VN", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
});

const SLOT_TIME_FORMATTER = new Intl.DateTimeFormat("vi-VN", {
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
  timeZone: "Asia/Ho_Chi_Minh",
});

export default async function SettingsPage() {
  const { garageId } = await requireStaffPermissionPage("/cai-dat", "garage-member:read");

  const [garage, members, overload] = await Promise.all([
    getGarageById(garageId),
    prisma.garageMember.findMany({
      where: { garageId, isActive: true },
      include: { user: { select: { id: true, name: true, email: true, phone: true } } },
      orderBy: { createdAt: "asc" },
    }),
    getUpcomingOverload(garageId, 14),
  ]);

  const openDaysCount = Object.keys(garage.appointmentSettings.workingHours || {}).length;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
          <Building2 className="size-6 text-blue-600" />
          <span>Cài đặt Gara & Quản lý Nhân sự</span>
        </h1>
        <p className="text-slate-500 text-sm mt-1">
          Quản lý thông tin Gara, danh sách nhân viên phân quyền và cấu hình lịch hẹn.
        </p>
      </div>

      {/* Garage Info Card */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm space-y-4">
        <h2 className="text-lg font-black text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
          <Building2 className="size-5 text-blue-600" />
          <span>Thông Tin Gara Vận Hành</span>
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
            <span className="text-slate-400 block font-semibold">Tên Gara:</span>
            <strong className="text-slate-900 text-sm">{garage.name}</strong>
          </div>

          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
            <span className="text-slate-400 block font-semibold">Số điện thoại Hotline:</span>
            <strong className="text-blue-600 font-mono text-sm">{garage.phone ?? "Chưa thiết lập"}</strong>
          </div>

          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
            <span className="text-slate-400 block font-semibold">Khung giờ đặt lịch (phút):</span>
            <strong className="text-slate-900 font-mono text-sm">{garage.appointmentSettings.appointmentSlotMinutes} phút / ca</strong>
          </div>

          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100">
            <span className="text-slate-400 block font-semibold">Số ngày mở cửa / tuần:</span>
            <strong className="text-emerald-600 text-sm font-bold font-mono">
              {openDaysCount} ngày / tuần
            </strong>
          </div>
        </div>
      </div>

      {/* Staff Members List */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm space-y-6">
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
            <Users className="size-5 text-indigo-600" />
            <span>Danh Sách Nhân Sự & Phân Quyền ({members.length})</span>
          </h2>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-50 text-slate-500 font-bold uppercase text-[11px] border-b border-slate-200">
              <tr>
                <th className="py-3 px-4">Họ và tên</th>
                <th className="py-3 px-4">Email</th>
                <th className="py-3 px-4">Số điện thoại</th>
                <th className="py-3 px-4">Vai trò Gara</th>
                <th className="py-3 px-4">Ngày gia nhập</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {members.map((m) => (
                <tr key={m.id} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3.5 px-4 font-bold text-slate-900 flex items-center gap-2">
                    <UserCheck className="size-4 text-blue-600" />
                    <span>{m.user.name}</span>
                  </td>
                  <td className="py-3.5 px-4 font-mono text-slate-600">{m.user.email}</td>
                  <td className="py-3.5 px-4 font-mono text-slate-600">{m.user.phone ?? "N/A"}</td>
                  <td className="py-3.5 px-4">
                    <span className="px-3 py-1 rounded-full text-[11px] font-extrabold bg-indigo-100 text-indigo-800 border border-indigo-200">
                      {m.role === "GARAGE_MANAGER"
                        ? "👔 Quản lý Gara"
                        : m.role === "RECEPTIONIST"
                        ? "📋 Lễ tân"
                        : m.role === "TECHNICIAN"
                        ? "🔧 Kỹ thuật viên"
                        : "💳 Thu ngân"}
                    </span>
                  </td>
                  <td className="py-3.5 px-4 font-mono text-slate-500">{DATE_FORMATTER.format(new Date(m.createdAt))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Appointment Settings */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm space-y-4">
        <h2 className="text-lg font-black text-slate-900 flex items-center gap-2 border-b border-slate-100 pb-3">
          <Calendar className="size-5 text-emerald-600" />
          <span>Cấu Hình Lịch Làm Việc & Đặt Lịch Hẹn</span>
        </h2>
        {overload.length > 0 ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-xs text-red-800">
            <p className="font-bold mb-2">
              ⚠️ {overload.length} ngày trong 2 tuần tới có khung giờ vượt sức chứa — cân nhắc
              tăng sức chứa hoặc dời lịch:
            </p>
            <ul className="space-y-1">
              {overload.map((day) => (
                <li key={day.date}>
                  <strong className="font-mono">{day.date}</strong>
                  {day.slots.map((s) => (
                    <span key={s.start.toISOString()} className="ml-2 font-mono">
                      {SLOT_TIME_FORMATTER.format(s.start)}–{SLOT_TIME_FORMATTER.format(s.end)} ({s.booked}/{day.capacity} xe)
                    </span>
                  ))}
                </li>
              ))}
            </ul>
          </div>
        ) : null}
        {garage.appointmentSettings ? (
          <AppointmentSettingsForm settings={garage.appointmentSettings} action={updateAppointmentSettingsFormAction} />
        ) : (
          <p className="text-slate-400 text-xs italic">Chưa cấu hình cài đặt lịch hẹn.</p>
        )}
      </div>
    </div>
  );
}
