"use client";

import { useState } from "react";
import Image from "next/image";
import { Activity, BatteryCharging, CheckCircle, AlertTriangle, ShieldCheck, Gauge, Wrench, ChevronRight, Zap } from "lucide-react";

interface DiagnosticHotspot {
  id: string;
  name: string;
  category: string;
  status: "GOOD" | "ATTENTION" | "NORMAL";
  healthScore: number;
  metric: string;
  description: string;
  actionRequired: string;
  image: string;
  tag: string;
}

const HOTSPOTS: DiagnosticHotspot[] = [
  {
    id: "engine",
    name: "Động cơ & Kim phun (Engine EFI)",
    category: "Hệ thống Truyền Lực",
    status: "GOOD",
    healthScore: 98,
    metric: "Vòng tua 750 RPM • Áp suất dầu 3.2 bar",
    description: "Không phát hiện mã lỗi OBD-II. Áp suất buồng đốt 4 xi-lanh đồng đều, góc đánh lửa tiêu chuẩn.",
    actionRequired: "Bảo dưỡng định kỳ sau 5.000km nữa.",
    image: "/images/mechanic-diagnostic.jpg",
    tag: "OBD-II Telemetry Clean",
  },
  {
    id: "brakes",
    name: "Má phanh & Đĩa gốm (Braking System)",
    category: "An Toàn Chủ Động",
    status: "ATTENTION",
    healthScore: 72,
    metric: "Độ dày má trước: 3.2mm (Tiêu chuẩn > 3.0mm)",
    description: "Má phanh trước bên phụ đã mòn 65%. Bề mặt đĩa phanh nhẵn, dầu phanh DOT4 có hàm lượng ẩm 1.8%.",
    actionRequired: "Khuyến nghị thay má phanh trước trong đợt bảo dưỡng này.",
    image: "/images/car-brake.jpg",
    tag: "Đo đạc Laser 3D",
  },
  {
    id: "battery",
    name: "Ắc quy & Máy phát điện (Electrical)",
    category: "Năng Lượng & Điện Máy",
    status: "GOOD",
    healthScore: 94,
    metric: "Điện áp: 12.7V (Tải phát 14.2V) • SOH: 92%",
    description: "Ắc quy AGM vận hành hoàn hảo, dòng khởi động CCA 680A đạt tiêu chuẩn khởi động nhanh mùa đông.",
    actionRequired: "Không cần thay thế.",
    image: "/images/hero-garage.jpg",
    tag: "Máy đo kỹ thuật số",
  },
  {
    id: "delivery",
    name: "Nghiệm thu 30 Bước & Bàn giao (QC Delivery)",
    category: "Chất Lượng Xuất Xưởng",
    status: "GOOD",
    healthScore: 100,
    metric: "Đã hoàn thành kiểm tra thử xe trên đường (Road Test)",
    description: "Xe được rửa khoang máy, hút bụi nội thất và khử khuẩn Nano Bạc trước khi bàn giao cho chủ xe.",
    actionRequired: "Sẵn sàng bàn giao kèm bảo hành điện tử.",
    image: "/images/car-delivery.jpg",
    tag: "Tiêu chuẩn 5 Sao",
  },
];

export function DiagnosticTelemetryDemo() {
  const [activeSpot, setActiveSpot] = useState<DiagnosticHotspot>(HOTSPOTS[0]);

  return (
    <div className="bg-slate-950 border border-slate-800 rounded-3xl p-6 sm:p-10 shadow-2xl relative overflow-hidden text-white">
      {/* Ambient background glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-blue-600/15 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 space-y-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-6">
          <div>
            <span className="px-3.5 py-1 rounded-full bg-blue-500/20 text-blue-300 border border-blue-400/30 text-xs font-bold uppercase tracking-wider inline-flex items-center gap-1.5 mb-2">
              <Activity className="size-3.5 text-blue-400" />
              AutoCare Health-Telemetry™
            </span>
            <h3 className="text-2xl sm:text-3xl font-black text-white">
              Hồ Sơ Sức Khỏe Xe Điện Tử & Telemetry Thời Gian Thực
            </h3>
            <p className="text-slate-400 text-sm mt-1">
              Khám phá dữ liệu chẩn đoán kỹ thuật số được lưu trữ vĩnh viễn trên tài khoản của bạn.
            </p>
          </div>

          <div className="bg-slate-900 border border-slate-700/80 px-4 py-2.5 rounded-2xl flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 font-mono font-black text-sm">
              VIN
            </div>
            <div>
              <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Mã Hồ Sơ Điện Tử</div>
              <div className="text-xs font-mono font-bold text-white">VN-AC-2026-9871</div>
            </div>
          </div>
        </div>

        {/* Interactive Layout: Left Selector + Right Live Telemetry Visual */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          {/* Left: Hotspot buttons */}
          <div className="lg:col-span-5 space-y-3">
            <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
              Nhấp vào từng hệ thống để xem kết quả kiểm định:
            </p>
            {HOTSPOTS.map((spot) => {
              const isActive = activeSpot.id === spot.id;
              return (
                <div
                  key={spot.id}
                  onClick={() => setActiveSpot(spot)}
                  className={`p-4 rounded-2xl border cursor-pointer transition-all duration-300 flex items-center justify-between gap-3 ${
                    isActive
                      ? "bg-gradient-to-r from-blue-900/60 to-slate-900 border-blue-500 shadow-xl shadow-blue-600/20 translate-x-1"
                      : "bg-slate-900/60 border-slate-800/80 hover:bg-slate-800 hover:border-slate-700"
                  }`}
                >
                  <div className="flex items-center gap-3.5">
                    <div
                      className={`w-10 h-10 rounded-xl flex items-center justify-center font-bold text-sm shrink-0 ${
                        spot.status === "ATTENTION"
                          ? "bg-amber-500/20 text-amber-300 border border-amber-500/40"
                          : "bg-emerald-500/20 text-emerald-300 border border-emerald-500/40"
                      }`}
                    >
                      {spot.healthScore}%
                    </div>
                    <div>
                      <div className="text-sm font-bold text-white leading-tight">{spot.name}</div>
                      <div className="text-xs text-slate-400 mt-0.5">{spot.category}</div>
                    </div>
                  </div>
                  <ChevronRight
                    className={`size-5 transition-transform ${
                      isActive ? "text-blue-400 translate-x-1" : "text-slate-600"
                    }`}
                  />
                </div>
              );
            })}
          </div>

          {/* Right: Telemetry Visual Card with Real Image */}
          <div className="lg:col-span-7">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl relative">
              {/* Photo Banner with Tag */}
              <div className="relative h-64 sm:h-72 w-full overflow-hidden">
                <Image
                  src={activeSpot.image}
                  alt={activeSpot.name}
                  fill
                  className="object-cover transition-transform duration-700 hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent" />

                {/* Status Badges Overlay */}
                <div className="absolute top-4 left-4 flex gap-2">
                  <span className="px-3 py-1 rounded-full bg-slate-950/80 backdrop-blur-md border border-white/20 text-xs font-bold text-white">
                    {activeSpot.tag}
                  </span>
                </div>

                <div className="absolute top-4 right-4">
                  {activeSpot.status === "ATTENTION" ? (
                    <span className="px-3 py-1 rounded-full bg-amber-500/90 text-slate-950 text-xs font-black flex items-center gap-1.5 shadow-lg">
                      <AlertTriangle className="size-3.5" />
                      CẦN BẢO DƯỠNG
                    </span>
                  ) : (
                    <span className="px-3 py-1 rounded-full bg-emerald-500/90 text-slate-950 text-xs font-black flex items-center gap-1.5 shadow-lg">
                      <ShieldCheck className="size-3.5" />
                      HOẠT ĐỘNG HOÀN HẢO
                    </span>
                  )}
                </div>

                <div className="absolute bottom-4 left-4 right-4">
                  <h4 className="text-xl sm:text-2xl font-black text-white tracking-tight">{activeSpot.name}</h4>
                  <p className="text-xs font-mono text-emerald-400 mt-1">{activeSpot.metric}</p>
                </div>
              </div>

              {/* Details and Actions */}
              <div className="p-6 space-y-4">
                <div className="bg-slate-950/80 rounded-2xl p-4 border border-slate-800 space-y-2">
                  <div className="text-xs font-bold text-slate-400 uppercase tracking-wider">Phân tích kỹ thuật:</div>
                  <p className="text-sm text-slate-200 leading-relaxed">{activeSpot.description}</p>
                </div>

                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pt-2">
                  <div className="flex items-center gap-2 text-xs text-amber-300">
                    <Zap className="size-4 shrink-0 text-amber-400" />
                    <span>Đề xuất: <strong>{activeSpot.actionRequired}</strong></span>
                  </div>
                  <span className="text-[11px] font-mono text-slate-400">Đã đồng bộ lên Cloud AutoCare</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
