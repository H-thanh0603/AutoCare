"use client";

import { useState } from "react";
import Image from "next/image";
import { CheckCircle2, ShieldCheck, ArrowRight } from "lucide-react";

const WORKFLOW_STEPS = [
  {
    step: "01",
    title: "Tiếp nhận QR & Chụp ảnh 360",
    desc: "Khách chỉ cần quét mã QR tại bàn tiếp tân. Kỹ thuật viên chụp ảnh hiện trạng xe (trầy xước, số km, mức xăng) lưu lên hồ sơ điện tử.",
    image: "/images/mechanic-diagnostic.jpg",
    badge: "Minh bạch hiện trạng",
    highlight: "Không lo tranh cãi trầy xước",
  },
  {
    step: "02",
    title: "Chẩn đoán & Báo giá 1-Chạm",
    desc: "Báo giá điện tử chi tiết gửi thẳng về Zalo/Web của khách. Khách có quyền bấm DUYỆT hoặc TỪ CHỐI từng món trước khi thợ chạm vào xe.",
    image: "/images/hero-garage.jpg",
    badge: "Quyền kiểm soát 100%",
    highlight: "Tuyệt đối không tự ý phát sinh",
  },
  {
    step: "03",
    title: "Kỹ thuật viên thi công chuẩn Hãng",
    desc: "Sử dụng phụ tùng chính hãng có mã vạch truy xuất nguồn gốc. Quy trình siết lực bằng cờ lê lực cơ khí chuẩn thông số nhà sản xuất.",
    image: "/images/car-brake.jpg",
    badge: "Phụ tùng chính hãng",
    highlight: "Bảo hành 6 - 12 tháng",
  },
  {
    step: "04",
    title: "Nghiệm thu QC 30 bước & Bàn giao",
    desc: "Quản đốc xưởng chạy thử xe trên đường (Road Test), nghiệm thu chất lượng theo checklist 30 hạng mục rồi mới bàn giao chìa khóa cho chủ xe.",
    image: "/images/car-delivery.jpg",
    badge: "Bảo hành điện tử",
    highlight: "Rửa xe & khử khuẩn miễn phí",
  },
];

export function LiveWorkflowSimulator() {
  const [activeStepIndex, setActiveStepIndex] = useState(0);
  const activeStep = WORKFLOW_STEPS[activeStepIndex];

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-10 shadow-2xl relative overflow-hidden text-white">
      <div className="space-y-8">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 border-b border-slate-800 pb-6">
          <div>
            <span className="px-3.5 py-1 rounded-full bg-blue-500/20 text-cyan-300 border border-blue-400/30 text-xs font-bold uppercase tracking-wider inline-block mb-2">
              Quy Trình 4 Bước Chuẩn Hãng
            </span>
            <h3 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
              Trải Nghiệm Dịch Vụ Minh Bạch Khác Biệt
            </h3>
          </div>
          <p className="text-slate-400 text-sm max-w-md">
            Mọi thao tác đều được số hóa, giúp chủ xe nắm rõ từng con ốc, từng giọt dầu nhớt được thay thế trên xe.
          </p>
        </div>

        {/* Step Navigation Pill Tabs */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {WORKFLOW_STEPS.map((item, idx) => {
            const isActive = activeStepIndex === idx;
            return (
              <button
                key={item.step}
                onClick={() => setActiveStepIndex(idx)}
                className={`p-4 rounded-2xl text-left border transition-all duration-300 relative ${
                  isActive
                    ? "bg-gradient-to-br from-blue-900/80 to-slate-950 border-cyan-500 text-white shadow-xl shadow-cyan-500/10 scale-102"
                    : "bg-slate-950/80 border-slate-800 text-slate-400 hover:bg-slate-800 hover:text-slate-200"
                }`}
              >
                <div className="flex items-center justify-between mb-2">
                  <span
                    className={`font-mono font-black text-xs px-2.5 py-0.5 rounded-lg ${
                      isActive ? "bg-cyan-500 text-slate-950 font-black" : "bg-slate-800 text-slate-400"
                    }`}
                  >
                    BƯỚC {item.step}
                  </span>
                  {isActive && <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />}
                </div>
                <div className="font-bold text-sm leading-snug">{item.title}</div>
              </button>
            );
          })}
        </div>

        {/* Active Step Showcase Card */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center bg-slate-950/80 rounded-3xl p-6 sm:p-8 border border-slate-800/80">
          <div className="lg:col-span-6 space-y-5">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-bold border border-emerald-500/30">
              <ShieldCheck className="size-4 text-emerald-400" />
              <span>{activeStep.badge}</span>
            </div>

            <h4 className="text-2xl sm:text-3xl font-black text-white">
              {activeStep.step}. {activeStep.title}
            </h4>

            <p className="text-slate-300 text-base leading-relaxed">{activeStep.desc}</p>

            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-sm flex items-center gap-3">
              <CheckCircle2 className="size-6 text-cyan-400 shrink-0" />
              <div className="text-sm">
                <strong className="text-white block">Cam kết độc quyền AutoCare:</strong>
                <span className="text-slate-400">{activeStep.highlight}</span>
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                onClick={() => setActiveStepIndex((prev) => (prev > 0 ? prev - 1 : 3))}
                className="px-4 py-2.5 rounded-xl border border-slate-700 bg-slate-900 text-slate-300 font-bold text-xs hover:bg-slate-800 hover:text-white transition-colors"
              >
                ← Bước trước
              </button>
              <button
                onClick={() => setActiveStepIndex((prev) => (prev < 3 ? prev + 1 : 0))}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-cyan-500 text-white font-bold text-xs hover:from-blue-500 hover:to-cyan-400 transition-colors flex items-center gap-1.5 shadow-md shadow-cyan-500/20"
              >
                <span>Bước tiếp theo</span>
                <ArrowRight className="size-3.5" />
              </button>
            </div>
          </div>

          <div className="lg:col-span-6">
            <div className="relative h-72 sm:h-80 w-full rounded-2xl overflow-hidden shadow-2xl border border-slate-700">
              <Image
                src={activeStep.image}
                alt={activeStep.title}
                fill
                className="object-cover transition-transform duration-500 hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent" />
              <div className="absolute bottom-4 left-4 right-4 text-white">
                <span className="text-xs font-mono bg-blue-600/90 backdrop-blur-sm px-3 py-1 rounded-lg font-bold">
                  Ảnh Chụp Quy Trình Thực Tế
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
