import type { Metadata } from "next";
import Link from "next/link";
import {
  Car,
  MapPin,
  PhoneCall,
  Sparkles,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { getSessionUser } from "@/lib/auth";
import { isStaff } from "@/lib/rbac";

export const metadata: Metadata = {
  title: "Về Chúng Tôi · AutoCare.vn",
  description: "Giới thiệu hệ thống Gara Ô Tô Công Nghệ AutoCare - Tiêu chuẩn dịch vụ chăm sóc xe minh bạch hàng đầu Việt Nam.",
};

const GARAGES = [
  {
    name: "Gara Ô Tô AutoCare Long Biên",
    address: "185 Nguyễn Văn Cừ, Long Biên, Hà Nội",
    phone: "0243.872.5160",
    hours: "07:30 - 18:30 (Tất cả các ngày)",
    services: "Bảo dưỡng định kỳ, Phanh gầm, Điện lạnh, Đọc lỗi OBD-II, Cân thước lái 3D",
  },
  {
    name: "Gara AutoCare Cầu Giấy",
    address: "68 Phạm Văn Đồng, Mai Dịch, Cầu Giấy, Hà Nội",
    phone: "0243.628.1944",
    hours: "07:30 - 18:30 (Tất cả các ngày)",
    services: "Chẩn đoán máy, Sửa chữa động cơ, Thay dầu, Khử trùng dàn lạnh, Cứu hộ 24/7",
  },
  {
    name: "Gara AutoCare Quận 7 (TP.HCM)",
    address: "246 Nguyễn Hữu Thọ, Tân Hưng, Quận 7, TP.HCM",
    phone: "0283.771.8899",
    hours: "07:30 - 18:30 (Tất cả các ngày)",
    services: "Bảo dưỡng đại tu, Cân mâm bấm chì, Láng đĩa phanh, Bảo hành điện tử",
  },
  {
    name: "Gara AutoCare Đà Nẵng",
    address: "12 Nguyễn Tri Phương, Thanh Khê, Đà Nẵng",
    phone: "0236.388.2233",
    hours: "07:30 - 18:30 (Tất cả các ngày)",
    services: "Chăm sóc xe cao cấp, Rửa khoang máy Nano, Kiểm định an toàn 30 bước",
  },
] as const;

export default async function AboutPage() {
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
                Hệ Thống Gara Ô Tô 5★
              </span>
            </div>
          </Link>

          <nav aria-label="Điều hướng chính" className="hidden lg:flex items-center gap-8 text-sm font-semibold text-slate-300">
            <Link href="/" className="hover:text-cyan-400 transition-colors">Trang chủ</Link>
            <Link href="/dich-vu" className="hover:text-cyan-400 transition-colors">Dịch vụ Gara</Link>
            <Link href="/ve-chung-toi" className="text-cyan-400 font-bold hover:text-white transition-colors">Về AutoCare</Link>
            <Link href="/tai-khoan" className="hover:text-cyan-400 transition-colors">Hồ sơ xe điện tử</Link>
          </nav>

          <div className="flex items-center gap-3">
            {portalHref ? (
              <Button
                render={<Link href={portalHref} />}
                className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold px-5 h-11 rounded-xl shadow-lg shadow-blue-600/30"
              >
                <span>Vào Hệ Thống</span>
              </Button>
            ) : (
              <Button
                render={<Link href="/dang-ky" />}
                className="bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white font-black px-5 h-11 rounded-xl shadow-lg shadow-blue-500/25 transition-all hover:scale-105"
              >
                <Sparkles className="size-4 mr-1.5 text-amber-300" />
                <span>Đăng ký Đặt lịch</span>
              </Button>
            )}
          </div>
        </div>
      </header>

      <main className="py-12 space-y-16">
        {/* About Hero Banner */}
        <section aria-label="Giới thiệu hero" className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="bg-gradient-to-r from-blue-950 via-slate-900 to-indigo-950 border border-blue-500/30 text-white rounded-3xl p-8 sm:p-14 shadow-2xl space-y-6">
            <span className="px-3.5 py-1.5 rounded-full bg-blue-500/20 text-cyan-300 border border-blue-400/30 text-xs font-bold uppercase tracking-wider inline-block">
              Sứ Mệnh Tiên Phong
            </span>
            <h1 className="text-3xl sm:text-5xl font-black leading-tight max-w-3xl">
              Nâng Tầm Trải Nghiệm Chăm Sóc Xe Bằng Công Nghệ & Sự Minh Bạch
            </h1>
            <p className="text-slate-300 text-base max-w-2xl leading-relaxed">
              AutoCare ra đời với sứ mệnh giúp chủ xe không còn lo ngại những mập mờ về giá và chất lượng phụ tùng khi mang xe tới gara. Mỗi dịch vụ đều được báo giá chi tiết, gửi hình ảnh nghiệm thu thực tế và lưu trữ Hồ sơ xe điện tử bất biến.
            </p>
          </div>
        </section>

        {/* Garage Partner Network */}
        <section aria-label="Mạng lưới Gara" className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-8">
          <div className="text-center max-w-3xl mx-auto space-y-3">
            <h2 className="text-3xl font-black text-white">Mạng Lưới Chi Nhánh Gara Tiêu Chuẩn 5 Sao</h2>
            <p className="text-slate-400 text-sm">
              Trang thiết bị máy móc chẩn đoán chuyên sâu, đội ngũ kỹ thuật viên tay nghề cao.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {GARAGES.map((g, idx) => (
              <div key={idx} className="bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-xl hover:border-cyan-500/50 hover:shadow-2xl transition-all space-y-5">
                <div className="flex items-center gap-3 border-b border-slate-800 pb-4">
                  <div className="w-12 h-12 rounded-2xl bg-blue-600/20 text-cyan-400 flex items-center justify-center font-bold text-xl border border-blue-500/30">
                    🏢
                  </div>
                  <div>
                    <h3 className="font-extrabold text-xl text-white">{g.name}</h3>
                    <p className="text-xs text-slate-400 flex items-center gap-1 mt-1">
                      <MapPin className="size-3.5 text-rose-500 shrink-0" />
                      <span>{g.address}</span>
                    </p>
                  </div>
                </div>

                <div className="space-y-2 text-xs text-slate-300">
                  <p>⏰ <strong>Thời gian làm việc:</strong> {g.hours}</p>
                  <p>🔧 <strong>Dịch vụ chính:</strong> {g.services}</p>
                </div>

                <div className="pt-4 border-t border-slate-800/80 flex items-center justify-between">
                  <div className="flex items-center gap-2 text-cyan-400 font-mono font-bold text-sm">
                    <PhoneCall className="size-4" />
                    <span>{g.phone}</span>
                  </div>
                  <Button
                    render={<Link href="/dang-ky" />}
                    size="sm"
                    className="bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-xl px-4 text-xs"
                  >
                    Đặt Lịch Tại Chi Nhánh Này
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800 bg-slate-950 py-8 text-center text-xs text-slate-500">
        © {new Date().getFullYear()} AutoCare.vn. Bản quyền thuộc về Hệ thống Gara Công Nghệ AutoCare.
      </footer>
    </div>
  );
}
