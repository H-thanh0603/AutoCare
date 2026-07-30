import { headers } from "next/headers";

import { getPublicVehicleHealth } from "@/features/vehicle-health/service";
import { RATE_LIMITS, checkRateLimit, resolveClientIp } from "@/lib/rate-limit";

/** Best-effort client IP for rate limiting the unauthenticated share endpoint. */
async function publicClientIp(): Promise<string> {
  const headerList = await headers();
  return resolveClientIp(headerList);
}

export default async function PublicVehicleHealthPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  let health;
  let errorMsg: string | null = null;

  const ip = await publicClientIp();
  const limit = await checkRateLimit({ key: `public-share:${ip}`, ...RATE_LIMITS.PUBLIC_SHARE });

  if (!limit.ok) {
    errorMsg = `Bạn đã truy cập quá nhiều lần. Vui lòng thử lại sau ${limit.retryAfterSeconds} giây.`;
  } else {
    try {
      health = await getPublicVehicleHealth(token);
    } catch (err) {
      errorMsg = err instanceof Error ? err.message : "Không thể tải hồ sơ xe.";
    }
  }

  if (errorMsg || !health) {
    return (
      <main className="min-h-screen bg-slate-900 text-slate-100 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-slate-800 border border-slate-700 rounded-xl p-6 text-center shadow-xl">
          <div className="w-12 h-12 bg-red-500/10 text-red-400 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl font-bold">
            !
          </div>
          <h1 className="text-xl font-bold text-slate-100 mb-2">Không thể truy cập hồ sơ xe</h1>
          <p className="text-slate-400 text-sm mb-6">{errorMsg}</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-950 text-slate-100 py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header Badge */}
        <div className="bg-gradient-to-r from-blue-900/40 via-indigo-900/40 to-slate-900 border border-blue-500/20 rounded-2xl p-6 shadow-2xl backdrop-blur-md">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 mb-2">
                ✓ Hồ sơ xác thực từ Garage
              </span>
              <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-50 tracking-tight">
                {health.vehicle.brand} {health.vehicle.model}
              </h1>
              <p className="text-slate-400 text-sm mt-1">
                Biển số: <span className="font-mono text-slate-200">{health.vehicle.licensePlateMasked}</span>
                {health.vehicle.year && ` • Năm SX: ${health.vehicle.year}`}
                {health.vehicle.color && ` • Màu: ${health.vehicle.color}`}
              </p>
            </div>
            <div className="bg-slate-800/80 px-4 py-3 rounded-xl border border-slate-700/60 text-right">
              <span className="text-xs text-slate-400 block">Số km hiện tại</span>
              <span className="text-xl font-mono font-bold text-blue-400">
                {health.vehicle.currentKm ? `${health.vehicle.currentKm.toLocaleString("vi-VN")} km` : "Chưa ghi nhận"}
              </span>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-slate-800/80 text-xs text-slate-400 flex items-center gap-2">
            🔒 <span>Dữ liệu cá nhân của chủ xe được bảo mật tuyệt đối theo Quy tắc 17.</span>
          </div>
        </div>

        {/* Maintenance History */}
        <section className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-lg">
          <h2 className="text-lg font-bold text-slate-100 mb-4 flex items-center gap-2">
            🛠️ Lịch sử bảo dưỡng & Sửa chữa
          </h2>
          {health.maintenanceRecords.length === 0 ? (
            <p className="text-slate-500 text-sm italic">Chưa có lịch sử bảo dưỡng nào được ghi nhận.</p>
          ) : (
            <div className="space-y-4">
              {health.maintenanceRecords.map((m) => (
                <div key={m.id} className="bg-slate-800/50 border border-slate-700/50 rounded-xl p-4">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-semibold text-slate-200">{m.title}</h3>
                    <span className="text-xs font-mono text-slate-400">
                      {new Date(m.performedAt).toLocaleDateString("vi-VN")}
                    </span>
                  </div>
                  {m.description && <p className="text-slate-300 text-sm mb-3">{m.description}</p>}
                  <div className="flex flex-wrap gap-4 text-xs text-slate-400 pt-2 border-t border-slate-700/40">
                    {m.mileageKm && <span>Số km đợt này: <strong className="text-slate-200">{m.mileageKm.toLocaleString("vi-VN")} km</strong></span>}
                    {m.nextDueMileageKm && <span>Bảo dưỡng tiếp theo: <strong className="text-emerald-400">{m.nextDueMileageKm.toLocaleString("vi-VN")} km</strong></span>}
                    {m.nextDueDate && <span>Hạn bảo dưỡng kế: <strong className="text-emerald-400">{new Date(m.nextDueDate).toLocaleDateString("vi-VN")}</strong></span>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Active Warranties */}
        <section className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 shadow-lg">
          <h2 className="text-lg font-bold text-slate-100 mb-4 flex items-center gap-2">
            🛡️ Quyền lợi Bảo hành đang áp dụng
          </h2>
          {health.warranties.length === 0 ? (
            <p className="text-slate-500 text-sm italic">Hiện không có hạng mục bảo hành nào đang hiệu lực.</p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {health.warranties.map((w, idx) => (
                <div key={idx} className="bg-slate-800/40 border border-emerald-500/20 rounded-xl p-4">
                  <h3 className="font-semibold text-emerald-300 text-sm mb-1">{w.name}</h3>
                  {w.terms && <p className="text-xs text-slate-300 mb-2">{w.terms}</p>}
                  <div className="text-[11px] text-slate-400 space-y-0.5">
                    <p>Bắt đầu: {new Date(w.startsAt).toLocaleDateString("vi-VN")}</p>
                    {w.expiresAt && <p>Hết hạn: {new Date(w.expiresAt).toLocaleDateString("vi-VN")}</p>}
                    {w.mileageLimitKm && <p>Giới hạn km: {w.mileageLimitKm.toLocaleString("vi-VN")} km</p>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
