import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  Car,
  CheckCircle2,
  Sparkles,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { getSessionUser } from "@/lib/auth";
import { isStaff } from "@/lib/rbac";

export const metadata: Metadata = {
  title: "Bảng Giá Dịch Vụ Gara · AutoCare.vn",
  description: "Bảng giá chi tiết dịch vụ bảo dưỡng, sửa chữa ô tô niêm yết công khai tại hệ thống Gara AutoCare.",
};

const SERVICES = [
  {
    category: "BẢO DƯỠNG ĐỊNH KỲ THEO KM",
    items: [
      {
        name: "Gói Bảo Dưỡng Cơ Bản (5.000 km - 10.000 km)",
        price: "450.000đ - 750.000đ",
        duration: "45 phút",
        checklist: [
          "Thay dầu nhớt động cơ cao cấp",
          "Vệ sinh lọc gió động cơ & lọc gió điều hòa",
          "Kiểm tra 30 hạng mục an toàn (lốp, phanh, đèn, nước rửa kính)",
          "Bơm lốp chuẩn áp suất & đảo lốp",
        ],
      },
      {
        name: "Gói Bảo Dưỡng Cấp Lớn (20.000 km - 40.000 km)",
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
    category: "HỆ THỐNG PHANH & KHUNG GẦM",
    items: [
      {
        name: "Bảo Dưỡng Cụm Phanh 4 Bánh + Đo Mòn Bằng Laser",
        price: "350.000đ",
        duration: "30 phút",
        checklist: [
          "Tháo 4 bánh, vệ sinh bụi phanh & rỉ sét",
          "Tra mỡ màng đĩa phanh & cúp-lê phanh chịu nhiệt",
          "Đo đạc độ dày má phanh & kiểm tra láng đĩa phanh",
        ],
      },
      {
        name: "Thay Má Phanh Trước / Sau Chính Hãng",
        price: "650.000đ - 1.400.000đ",
        duration: "45 phút",
        checklist: [
          "Thay má phanh chính hãng chuẩn thông số nhà sản xuất",
          "Láng đĩa phanh triệt tiêu rung giật",
          "Chạy thử Road Test kiểm tra lực phanh an toàn",
        ],
      },
    ],
  },
  {
    category: "ĐIỆN & ĐIỀU HÒA Ô TÔ CHUYÊN SÂU",
    items: [
      {
        name: "Vệ Sinh Dàn Lạnh Điều Hòa Bằng Camera Nội Soi",
        price: "500.000đ",
        duration: "60 phút",
        checklist: [
          "Nội soi dàn lạnh bằng camera HD không tháo taplo",
          "Phun dung dịch diệt khuẩn chuyên dụng làm sạch mảng bám",
          "Khử trùng quạt gió & khử mùi Ozone Nano Bạc khoang xe",
        ],
      },
      {
        name: "Nạp Ga & Hút Chân Không Tự Động Bằng Máy R134a",
        price: "400.000đ - 650.000đ",
        duration: "45 phút",
        checklist: [
          "Hút chân không thử kín hệ thống lạnh áp lực cao",
          "Nạp ga chuẩn khối lượng gram theo thông số từng hãng",
          "Bổ sung dầu bôi trơn lốc lạnh bảo vệ máy nén",
        ],
      },
    ],
  },
] as const;

export default async function ServicesPage() {
  const user = await getSessionUser();
  const portalHref = user ? (isStaff(user) ? "/bang-dieu-khien" : "/tai-khoan") : null;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-blue-600 selection:text-white">
      {/* Main Navigation Header */}
      <header className="sticky top-0 z-50 border-b border-slate-800/80 bg-slate-950/85 backdrop-blur-xl shadow-2xl">
        <div className="mx-auto flex h-20 w-full max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 via-indigo-500 to-cyan-400 p-0.5 shadow-lg shadow-blue-500/25 group-hover:scale-105 transition-all duration-300">
              <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center">
                <Car className="size-6 text-cyan-400 group-hover:text-white transition-colors" aria-hidden="true" />
              </div>
            </div>
            <div className="flex flex-col">
              <span className="font-black text-2xl tracking-tight text-white group-hover:text-cyan-400 transition-colors">
                AutoCare<span className="text-blue-500">.vn</span>
              </span>
              <span className="text-[10px] text-blue-300 font-bold tracking-widest uppercase -mt-1">
                Bảng Giá Dịch Vụ Chuẩn 5★
              </span>
            </div>
          </Link>

          <nav aria-label="Điều hướng chính" className="hidden lg:flex items-center gap-8 text-sm font-semibold text-slate-300">
            <Link href="/" className="hover:text-cyan-400 transition-colors">Trang chủ</Link>
            <Link href="/dich-vu" className="text-cyan-400 font-bold hover:text-white transition-colors">Dịch vụ Gara</Link>
            <Link href="/ve-chung-toi" className="hover:text-cyan-400 transition-colors">Về AutoCare</Link>
            <Link href="/tai-khoan" className="hover:text-cyan-400 transition-colors">Hồ sơ xe điện tử</Link>
          </nav>

          <div className="flex items-center gap-3">
            {portalHref ? (
              <Button
                render={<Link href={portalHref} />}
                className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold px-5 h-11 rounded-xl shadow-lg shadow-blue-600/30"
              >
                <span>Vào Hệ Thống</span>
                <ArrowRight className="size-4 ml-1.5" />
              </Button>
            ) : (
              <Button
                render={<Link href="/dang-ky" />}
                className="bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white font-black px-5 h-11 rounded-xl shadow-lg shadow-blue-500/25 transition-all hover:scale-105"
              >
                <Sparkles className="size-4 mr-1.5 text-amber-300" />
                <span>Đặt Lịch Hẹn Ngay</span>
              </Button>
            )}
          </div>
        </div>
      </header>

      <main className="py-12 space-y-16">
        {/* Banner Hero */}
        <section aria-label="Dịch vụ hero" className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="bg-gradient-to-r from-blue-950 via-slate-900 to-indigo-950 border border-blue-500/30 text-white rounded-3xl p-8 sm:p-14 shadow-2xl relative overflow-hidden">
            <div className="relative z-10 space-y-4 max-w-3xl">
              <span className="px-3.5 py-1.5 rounded-full bg-blue-500/20 text-cyan-300 border border-blue-400/30 text-xs font-bold uppercase tracking-wider inline-block">
                Bảng Giá Niêm Yết Minh Bạch 100%
              </span>
              <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight">
                Danh Mục Dịch Vụ & Bảng Giá Gara Chuẩn 5 Sao
              </h1>
              <p className="text-slate-300 text-base leading-relaxed">
                Tất cả gói bảo dưỡng đều có quy trình kiểm tra chuẩn hãng, báo giá chi tiết từng hạng mục trước khi thi công và lưu vết vĩnh viễn trên <strong className="text-cyan-300">Hồ Sơ Sức Khỏe Xe Điện Tử</strong>.
              </p>
            </div>
          </div>
        </section>

        {/* Services List */}
        <section aria-label="Bảng giá dịch vụ" className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-16">
          {SERVICES.map((cat, cIdx) => (
            <div key={cIdx} className="space-y-6">
              <div className="flex items-center gap-3 border-b border-slate-800 pb-3">
                <span className="w-3 h-8 bg-gradient-to-b from-cyan-400 to-blue-600 rounded-full" />
                <h2 className="text-2xl font-black text-white tracking-tight">{cat.category}</h2>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {cat.items.map((item, iIdx) => (
                  <div
                    key={iIdx}
                    className="bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-xl hover:border-cyan-500/50 hover:shadow-2xl transition-all duration-300 flex flex-col justify-between"
                  >
                    <div className="space-y-4">
                      <div className="flex justify-between items-start">
                        <h3 className="font-extrabold text-xl text-white">{item.name}</h3>
                        <span className="px-3 py-1 bg-slate-950 border border-slate-700 text-cyan-300 font-mono text-xs font-bold rounded-full">
                          ⏱️ {item.duration}
                        </span>
                      </div>

                      <div className="space-y-2 pt-2">
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Hạng mục kiểm tra & thực hiện:</p>
                        {item.checklist.map((pt, pIdx) => (
                          <div key={pIdx} className="flex items-start gap-2.5 text-xs text-slate-300">
                            <CheckCircle2 className="size-4 text-emerald-400 shrink-0 mt-0.5" />
                            <span>{pt}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="pt-6 mt-6 border-t border-slate-800 flex items-center justify-between">
                      <div>
                        <span className="text-[10px] text-slate-400 font-semibold block uppercase">Giá niêm yết</span>
                        <span className="text-lg font-black text-emerald-400 font-mono">{item.price}</span>
                      </div>
                      <Button
                        render={<Link href="/dang-ky" />}
                        className="bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white font-bold rounded-xl px-5 shadow-md shadow-blue-500/20"
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
      <footer className="border-t border-slate-800 bg-slate-950 py-8 text-center text-xs text-slate-500">
        © {new Date().getFullYear()} AutoCare.vn. Bảng giá niêm yết áp dụng tại toàn bộ hệ thống Gara đối tác AutoCare.
      </footer>
    </div>
  );
}
