"use client";

import { useState } from "react";
import Link from "next/link";
import { Calculator, CheckCircle2, ArrowRight, Sparkles } from "lucide-react";
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
    <div id="cost-calculator" className="bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-10 shadow-xl relative overflow-hidden text-slate-900">
      {/* Ambient background accent */}
      <div className="absolute top-0 right-0 -mr-20 -mt-20 w-80 h-80 bg-blue-100/60 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 -ml-20 -mb-20 w-80 h-80 bg-emerald-100/60 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 space-y-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-100 pb-6">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-blue-700 text-xs font-bold uppercase tracking-wider">
              <Calculator className="size-3.5" />
              Công Cụ Ước Tính Tức Thì
            </div>
            <h3 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900">
              Bảng Dự Toán Chi Phí Bảo Dưỡng Minh Bạch
            </h3>
            <p className="text-slate-500 text-sm">
              Chọn dòng xe và hạng mục để nhận báo giá chính xác, cam kết không phát sinh chi phí ẩn.
            </p>
          </div>
          <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 px-4 py-2 rounded-2xl flex items-center gap-2 self-start md:self-auto text-xs font-bold shadow-sm">
            <Sparkles className="size-4 text-emerald-600" />
            Ưu đãi 10% khi đặt trước online
          </div>
        </div>

        {/* Step 1: Select Brand */}
        <div className="space-y-3">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-500 block">
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
                      ? "bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-500/25 scale-102"
                      : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100 hover:border-slate-300"
                  }`}
                >
                  <span className="text-lg">{brand.icon}</span>
                  <span className={`text-xs font-bold leading-tight line-clamp-1 ${isSelected ? "text-white" : "text-slate-800"}`}>
                    {brand.name}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Step 2: Select Milestone */}
        <div className="space-y-3">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-500 block">
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
                      ? "bg-emerald-50 border-emerald-500 text-emerald-900 shadow-md shadow-emerald-500/10 ring-2 ring-emerald-500/20"
                      : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                  }`}
                >
                  <div className="font-mono font-black text-sm text-slate-900">{m.km}</div>
                  <div className="text-[11px] text-slate-500 mt-0.5">{m.label}</div>
                  {m.discount > 0 && (
                    <div className="mt-1 text-[10px] font-bold text-emerald-600">Giảm thêm {m.discount}%</div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Step 3: Select Services List */}
        <div className="space-y-3">
          <label className="text-xs font-bold uppercase tracking-wider text-slate-500 block">
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
                      ? "bg-blue-50/50 border-blue-400 shadow-sm"
                      : "bg-white border-slate-200/80 hover:border-slate-300"
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`w-5 h-5 rounded-lg border mt-0.5 flex items-center justify-center transition-colors ${
                        isChecked ? "bg-blue-600 border-blue-600 text-white" : "border-slate-300 bg-white"
                      }`}
                    >
                      {isChecked && <CheckCircle2 className="size-4" />}
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-slate-900 leading-snug">{service.name}</div>
                      <div className="text-[11px] text-slate-500 mt-1 flex items-center gap-2">
                        <span>⏱️ Thời gian: {service.duration}</span>
                        {service.recommended && (
                          <span className="bg-amber-100 text-amber-800 px-2 py-0.2 rounded-full font-bold text-[10px]">
                            Khuyên dùng
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="font-mono font-bold text-sm text-blue-600 shrink-0 text-right">
                    {adjustedPrice.toLocaleString("vi-VN")}đ
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Calculation Summary Bar */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-blue-950 text-white rounded-3xl p-6 sm:p-8 flex flex-col lg:flex-row items-center justify-between gap-6 shadow-2xl">
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
              <span className="text-3xl sm:text-4xl font-black font-mono text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-cyan-300 to-white">
                {calculatedTotal.toLocaleString("vi-VN")} VNĐ
              </span>
              {selectedMilestone.discount > 0 && (
                <span className="text-xs line-through text-slate-400 font-mono">
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
