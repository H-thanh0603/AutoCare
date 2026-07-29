import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  CalendarCheck,
  Car,
  CheckCircle2,
  Clock,
  Gauge,
  Info,
  PhoneCall,
  ShieldCheck,
  Sparkles,
  Star,
  Wrench,
  Zap,
} from "lucide-react";

import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Bảng Giá Dịch Vụ Gara · AutoCare.vn",
  description: "Bảng giá chi tiết dịch vụ bảo dưỡng, sửa chữa ô tô niêm yết công khai tại hệ thống Gara AutoCare.",
};

const SERVICES = [
  {
    category: "BẢO DƯỠNG ĐỊNH KỲ",
    items: [
      {
        name: "Gói Bảo dưỡng 5.000 km / 10.000 km",
        price: "450.000đ - 750.000đ",
        duration: "45 phút",
        checklist: [
          "Thay dầu nhớt động cơ chính hãng",
          "Vệ sinh lọc gió động cơ & lọc gió điều hòa",
          "Kiểm tra 30 hạng mục an toàn (lốp, phanh, đèn, nước rử kính)",
          "Bơm lốp chuẩn áp suất & đảo lốp",
        ],
      },
      {
        name: "Gói Bảo dưỡng Cấp lớn 20.000 km / 40.000 km",
        price: "1.800.000đ - 3.500.000đ",
        duration: "120 phút",
        checklist: [
          "Thay dầu nhớt + Lọc dầu động cơ",
          "Thay lọc gió động cơ & lọc gió điều hòa mới",
          "Thay bugi đánh lửa & dầu phanh/dầu trợ lực",
          "Vệ sinh kim phun & họng hút bằng dung dịch chuyên dụng",
          "Kiểm tra toàn bộ hệ thống phanh, gầm và cúp-lê",
        ],
      },
    ],
  },
  {
    category: "PHANH & KHUNG GẦM",
    items: [
      {
        name: "Bảo dưỡng Cụm phanh 4 Bánh + Đo mòn má phanh",
        price: "350.000đ",
        duration: "30 phút",
        checklist: [
          "Tháo 4 bánh, vệ sinh bụi phanh & rỉ sét",
          "Tra mỡ màng đĩa phanh & cúp-lê phanh",
          "Kiểm tra độ dày má phanh & đĩa phanh",
        ],
      },
      {
        name: "Thay Má phanh Trước / Sau (Bộ 2 bánh)",
        price: "650.000đ - 1.400.000đ",
        duration: "45 phút",
        checklist: [
          "Thay má phanh chính hãng (Toyota, Hyundai, Honda, Ford, Benz)",
          "Vớt đĩa phanh láng mịn",
          "Chạy thử kiểm tra lực phanh an toàn",
        ],
      },
    ],
  },
  {
    category: "ĐIỆN & ĐIỀU HÒA Ô TÔ",
    items: [
      {
        name: "Vệ sinh Dàn lạnh Điều hòa Nội soi",
        price: "500.000đ",
        duration: "60 phút",
        checklist: [
          "Nội soi dàn lạnh bằng camera HD",
          "Phun dung dịch vệ sinh dàn lạnh không tháo taplo",
          "Khử trùng quạt gió & khử mùi Ozone khoang xe",
        ],
      },
      {
        name: "Nạp Ga & Hút Chân Không Điều Hòa Tự Động",
        price: "400.000đ - 650.000đ",
        duration: "45 phút",
        checklist: [
          "Hút chân không thử kín hệ thống lạnh",
          "Nạp ga R134a / R1234yf chuẩn khối lượng hãng",
          "Thay dầu lốc lạnh bổ sung",
        ],
      },
    ],
  },
] as const;

export default function ServicesPage() {
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans">
      {/* Header Bar */}
      <header className="sticky top-0 z-50 border-b border-slate-200 bg-white/90 backdrop-blur-md">
        <div className="mx-auto flex h-20 w-full max-w-7xl items-center justify-between px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white font-bold">
              <Car className="size-5" />
            </div>
            <span className="font-extrabold text-xl tracking-tight text-slate-900">
              AutoCare<span className="text-blue-600">.vn</span>
            </span>
          </Link>

          <div className="flex items-center gap-4">
            <Link href="/" className="text-sm font-semibold text-slate-600 hover:text-blue-600">
              Trang chủ
            </Link>
            <Button render={<Link href="/dang-ky" />} className="bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl">
              Đặt Lịch Ngay
            </Button>
          </div>
        </div>
      </header>

      <main className="py-12">
        {/* Banner Hero */}
        <section aria-label="Dịch vụ hero" className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 mb-12">
          <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-blue-800 text-white rounded-3xl p-8 sm:p-12 shadow-xl">
            <span className="px-3.5 py-1.5 rounded-full bg-white/20 text-white text-xs font-bold uppercase tracking-wide">
              Bảng Giá Niêm Yết Minh Bạch
            </span>
            <h1 className="text-3xl sm:text-5xl font-black mt-4 mb-3">
              Danh Mục Dịch Vụ Gara Chuyên Nghiệp
            </h1>
            <p className="text-blue-100 text-base max-w-2xl">
              Tất cả gói bảo dưỡng đều có quy trình kiểm tra chuẩn hãng, báo giá niêm yết trước khi làm và lưu vết trên Hồ sơ sức khỏe xe điện tử.
            </p>
          </div>
        </section>

        {/* Services List */}
        <section aria-label="Bảng giá dịch vụ" className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-16">
          {SERVICES.map((cat, cIdx) => (
            <div key={cIdx} className="space-y-6">
              <div className="flex items-center gap-3 border-b border-slate-200 pb-3">
                <span className="w-3 h-8 bg-blue-600 rounded-full" />
                <h2 className="text-2xl font-black text-slate-900 tracking-tight">{cat.category}</h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {cat.items.map((item, iIdx) => (
                  <div
                    key={iIdx}
                    className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col justify-between"
                  >
                    <div className="space-y-4">
                      <div className="flex justify-between items-start">
                        <h3 className="font-extrabold text-xl text-slate-900">{item.name}</h3>
                        <span className="px-3 py-1 bg-slate-100 text-slate-700 font-mono text-xs font-bold rounded-full">
                          ⏱️ {item.duration}
                        </span>
                      </div>

                      <div className="space-y-2 pt-2">
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Hạng mục kiểm tra & thực hiện:</p>
                        {item.checklist.map((pt, pIdx) => (
                          <div key={pIdx} className="flex items-start gap-2 text-xs text-slate-700">
                            <CheckCircle2 className="size-4 text-emerald-600 shrink-0 mt-0.5" />
                            <span>{pt}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="pt-6 mt-6 border-t border-slate-100 flex items-center justify-between">
                      <div>
                        <span className="text-[10px] text-slate-400 font-semibold block uppercase">Giá niêm yết</span>
                        <span className="text-lg font-black text-blue-600 font-mono">{item.price}</span>
                      </div>
                      <Button
                        render={<Link href="/tai-khoan/lich-hen/moi" />}
                        className="bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl px-5"
                      >
                        Đặt Lịch Hẹn
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-slate-900 py-8 text-center text-xs text-slate-400">
        © {new Date().getFullYear()} AutoCare.vn. Bảng giá niêm yết áp dụng tại toàn bộ hệ thống Gara đối tác AutoCare.
      </footer>
    </div>
  );
}
