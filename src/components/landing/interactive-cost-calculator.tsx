"use client";

import { useState } from "react";
import Link from "next/link";
import { Calculator, CheckCircle2, ArrowRight, Sparkles, Wrench, ShieldCheck, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ServiceOption {
  id: string;
  name: string;
  price: number;
  duration: string;
  recommended: boolean;
}

const CAR_BRANDS = [
  { id: "toyota", name: "Toyota / Lexus", multiplier: 1.0, icon: "🚗" },
  { id: "honda", name: "Honda / Mazda", multiplier: 1.05, icon: "🏎️" },
  { id: "hyundai", name: "Hyundai / Kia", multiplier: 1.0, icon: "🚙" },
  { id: "vinfast", name: "VinFast", multiplier: 0.95, icon: "⚡" },
  { id: "ford", name: "Ford / Ranger", multiplier: 1.15, icon: "🛻" },
  { id: "mercedes", name: "Mercedes / BMW / Audi", multiplier: 1.6, icon: "✨" },
];

const MILESTONES = [
  { km: "5.000 km", label: "Cấp 1 - Cơ bản", discount: 0 },
  { km: "20.000 km", label: "Cấp 2 - Tiêu chuẩn", discount: 5 },
  { km: "40.000 km", label: "Cấp 3 - Toàn diện", discount: 10 },
  { km: "80.000 km", label: "Cấp 4 - Đại tu", discount: 15 },
];

const AVAILABLE_SERVICES: ServiceOption[] = [
  { id: "oil", name: "Thay nhớt tổng hợp cao cấp (Fully Synthetic) 4L", price: 650000, duration: "30 phút", recommended: true },
  { id: "filter", name: "Thay lọc dầu động cơ + Lọc gió động cơ chính hãng", price: 320000, duration: "15 phút", recommended: true },
  { id: "brake", name: "Bảo dưỡng 4 cụm cúp-lê phanh & đo độ mòn má phanh", price: 380000, duration: "45 phút", recommended: true },
  { id: "ac", name: "Nội soi vệ sinh dàn lạnh + Khử mùi ozone Nano Bạc", price: 450000, duration: "40 phút", recommended: false },
  { id: "fuel", name: "Vệ sinh kim phun điện tử & buồng đốt Hydro", price: 550000, duration: "50 phút", recommended: false },
  { id: "align", name: "Cân chỉnh góc đặt bánh xe 3D bằng Laser Hunter", price: 400000, duration: "35 phút", recommended: false },
];

export function InteractiveCostCalculator() {
  const [selectedBrand, setSelectedBrand] = useState(CAR_BRANDS[0]);
  const [selectedMilestone, setSelectedMilestone] = useState(MILESTONES[1]);
  const [selectedServices, setSelectedServices] = useState<string[]>(["oil", "filter", "brake"]);

  const toggleService = (id: string) => {
    if (selectedServices.includes(id)) {
      if (selectedServices.length > 1) {
        setSelectedServices(selectedServices.filter((s) => s !== id));
      }
    } else {
      setSelectedServices([...selectedServices, id]);
    }
  };

  const rawTotal = selectedServices.reduce((sum, sId) => {
    const service = AVAILABLE_SERVICES.find((s) => s.id === sId);
    return sum + (service ? service.price : 0);
  }, 0);

  const calculatedTotal = Math.round((rawTotal * selectedBrand.multiplier * (100 - selectedMilestone.discount)) / 100 / 10000) * 10000;
  const originalTotal = Math.round((rawTotal * selectedBrand.multiplier) / 10000) * 10000;

  return (
    <div id="cost-calculator" className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-10 shadow-2xl relative overflow-hidden text-white">
      {/* Ambient background glows */}
      <div className="absolute top-0 right-0 -mr-20 -mt-20 w-80 h-80 bg-blue-600/20 rounded-full blur-3xl pointer-events-none animate-pulse-glow" />
      <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-80 h-80 bg-emerald-600/20 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 space-y-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800/80 pb-6">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/20 border border-blue-400/30 text-blue-300 text-xs font-bold uppercase tracking-wider">
              <Calculator className="size-3.5" />
              Công Cụ Ước Tính Tức Thì
            </div>
            <h3 className="text-2xl sm:text-3xl font-black tracking-tight text-white">
              Bảng Dự Toán Chi Phí Bảo Dưỡng Minh Bạch
            </h3>
            <p className="text-slate-400 text-sm">
              Chọn dòng xe và hạng mục để nhận báo giá chính xác, cam kết không phát sinh chi phí ẩn.
            </p>
          </div>
          <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 px-4 py-2 rounded-2xl flex items-center gap-2 self-start md:self-auto text-xs font-bold">
            <Sparkles className="size-4" />
            Ưu đãi 10% khi đặt trước online
          </div>
        </div>

        {/* Step 1: Select Brand */}
        <div className="space-y-3">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-400 block">
            1. Chọn Dòng Xe Của Bạn
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
            {CAR_BRANDS.map((brand) => {
              const isSelected = selectedBrand.id === brand.id;
              return (
                <button
                  key={brand.id}
                  onClick={() => setSelectedBrand(brand)}
                  className={`p-3 rounded-2xl border text-left transition-all duration-200 flex flex-col justify-between gap-1.5 ${
                    isSelected
                      ? "bg-blue-600 border-blue-400 text-white shadow-lg shadow-blue-600/30 scale-102"
                      : "bg-slate-800/60 border-slate-700/60 text-slate-300 hover:bg-slate-800 hover:border-slate-600"
                  }`}
                >
                  <span className="text-lg">{brand.icon}</span>
                  <span className="text-xs font-bold leading-tight line-clamp-1">{brand.name}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Step 2: Select Milestone */}
        <div className="space-y-3">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-400 block">
            2. Cột Mốc Số Km Hiện Tại
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {MILESTONES.map((m) => {
              const isSelected = selectedMilestone.km === m.km;
              return (
                <button
                  key={m.km}
                  onClick={() => setSelectedMilestone(m)}
                  className={`p-3.5 rounded-2xl border text-left transition-all duration-200 ${
                    isSelected
                      ? "bg-emerald-600/30 border-emerald-400 text-emerald-300 shadow-lg shadow-emerald-500/20"
                      : "bg-slate-800/60 border-slate-700/60 text-slate-300 hover:bg-slate-800"
                  }`}
                >
                  <div className="font-mono font-black text-sm text-white">{m.km}</div>
                  <div className="text-[11px] text-slate-400 mt-0.5">{m.label}</div>
                  {m.discount > 0 && (
                    <div className="mt-1 text-[10px] font-bold text-amber-400">Giảm thêm {m.discount}%</div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Step 3: Select Services List */}
        <div className="space-y-3">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-400 block">
            3. Chọn Danh Sách Hạng Mục Cần Thực Hiện
          </label>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {AVAILABLE_SERVICES.map((service) => {
              const isChecked = selectedServices.includes(service.id);
              const adjustedPrice = Math.round((service.price * selectedBrand.multiplier) / 10000) * 10000;
              return (
                <div
                  key={service.id}
                  onClick={() => toggleService(service.id)}
                  className={`p-3.5 rounded-2xl border cursor-pointer transition-all duration-200 flex items-start justify-between gap-3 ${
                    isChecked
                      ? "bg-slate-800 border-blue-500/80 shadow-md shadow-blue-500/10"
                      : "bg-slate-900/60 border-slate-800/80 opacity-70 hover:opacity-100 hover:border-slate-700"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`w-5 h-5 rounded-lg border mt-0.5 flex items-center justify-center transition-colors ${
                        isChecked ? "bg-blue-600 border-blue-400 text-white" : "border-slate-600 bg-slate-800"
                      }`}
                    >
                      {isChecked && <CheckCircle2 className="size-4" />}
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-slate-200 leading-snug">{service.name}</div>
                      <div className="text-[11px] text-slate-400 mt-1 flex items-center gap-2">
                        <span>⏱️ Thời gian: {service.duration}</span>
                        {service.recommended && (
                          <span className="bg-amber-400/20 text-amber-300 px-2 py-0.2 rounded-full font-bold text-[10px]">
                            Khuyên dùng
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="font-mono font-bold text-sm text-blue-400 shrink-0 text-right">
                    {adjustedPrice.toLocaleString("vi-VN")}đ
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Calculation Summary Bar */}
        <div className="bg-gradient-to-r from-blue-950 via-slate-800 to-indigo-950 border border-blue-500/30 rounded-3xl p-6 sm:p-8 flex flex-col lg:flex-row items-center justify-between gap-6 shadow-xl">
          <div className="space-y-2 text-center lg:text-left">
            <div className="flex items-center justify-center lg:justify-start gap-2 text-xs font-semibold text-slate-300">
              <span>Xe đã chọn: <strong className="text-white">{selectedBrand.name}</strong></span>
              <span>•</span>
              <span>Mốc: <strong className="text-emerald-400">{selectedMilestone.km}</strong></span>
              <span>•</span>
              <span>{selectedServices.length} hạng mục</span>
            </div>
            <div className="flex items-baseline justify-center lg:justify-start gap-3">
              <span className="text-xs uppercase font-bold text-slate-400">Tổng Dự Toán:</span>
              <span className="text-3xl sm:text-4xl font-black font-mono text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-cyan-300 to-blue-400">
                {calculatedTotal.toLocaleString("vi-VN")} VNĐ
              </span>
              {selectedMilestone.discount > 0 && (
                <span className="text-xs line-through text-slate-500 font-mono">
                  {originalTotal.toLocaleString("vi-VN")}đ
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-400">
              * Giá đã bao gồm công thợ & VAT. Cam kết bảo hành dịch vụ 6 tháng hoặc 10.000km.
            </p>
          </div>

          <Button
            size="lg"
            render={<Link href={`/dang-ky?brand=${selectedBrand.id}&km=${selectedMilestone.km}`} />}
            className="w-full lg:w-auto h-14 px-8 text-base bg-gradient-to-r from-blue-500 to-emerald-500 hover:from-blue-600 hover:to-emerald-600 text-white font-black rounded-2xl shadow-xl shadow-emerald-500/25 transition-all hover:scale-105 shrink-0"
          >
            <span>Đặt Lịch Với Báo Giá Này</span>
            <ArrowRight className="size-5 ml-2" />
          </Button>
        </div>
      </div>
    </div>
  );
}
