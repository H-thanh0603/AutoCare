import { CalendarCheck, Car, Sparkles } from "lucide-react";
import { listPortalVehicles } from "@/data/portal";
import { AppointmentForm } from "@/features/appointments/appointment-form";
import { requireUserPage } from "@/features/auth/guards";

export default async function NewAppointmentPage() {
  const user = await requireUserPage("/tai-khoan/lich-hen/moi");
  const vehicles = await listPortalVehicles(user.id);

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 text-white rounded-3xl p-6 sm:p-8 shadow-xl space-y-2">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black bg-white/20 text-white uppercase tracking-wide">
          <Sparkles className="size-3.5 text-amber-300 fill-amber-300" />
          <span>Đặt Lịch Trực Tuyến 24/7</span>
        </div>
        <h1 className="text-2xl sm:text-3xl font-black">Đặt Lịch Hẹn Bảo Dưỡng / Sửa Chữa</h1>
        <p className="text-blue-100 text-xs sm:text-sm font-medium">
          Chọn xe, Gara mong muốn và khung giờ phù hợp. Hệ thống đảm bảo xe của bạn không bị đặt trùng hai lịch cùng lúc; Gara sẽ xác nhận lại khung giờ sau khi tiếp nhận yêu cầu.
        </p>
      </div>

      {/* Booking Form Card */}
      <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-xl space-y-6">
        <div className="border-b border-slate-100 pb-4">
          <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
            <CalendarCheck className="size-5 text-blue-600" />
            <span>Thông Tin Lịch Hẹn Xe</span>
          </h2>
          <p className="text-xs text-slate-500 font-semibold mt-1">
            Vui lòng điền thông tin bên dưới để Gara xếp chỗ ưu tiên.
          </p>
        </div>

        {vehicles.length ? (
          <AppointmentForm vehicles={vehicles} />
        ) : (
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-8 text-center text-slate-500 text-sm space-y-3">
            <Car className="size-10 text-slate-400 mx-auto" />
            <p className="font-bold text-slate-800">Bạn chưa có xe trong hệ thống</p>
            <p className="text-xs text-slate-500">
              Khi bạn mang xe tới Gara đối tác AutoCare lần đầu, kỹ thuật viên sẽ nhập xe vào hồ sơ của bạn.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
