import type { Metadata } from "next";
import Link from "next/link";
import {
  Award,
  CalendarCheck,
  Car,
  CheckCircle2,
  Clock,
  MapPin,
  PhoneCall,
  ShieldCheck,
  Sparkles,
  Users,
  Wrench,
} from "lucide-react";

import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Về Chúng Tôi · AutoCare.vn",
  description: "Giới thiệu hệ thống Gara Ô Tô Công Nghệ AutoCare - Tiêu chuẩn dịch vụ chăm sóc xe minh bạch hàng đầu Việt Nam.",
};

const GARAGES = [
  {
    name: "Gara Ô Tô Thành Đạt",
    address: "185 Nguyễn Văn Cừ, Long Biên, Hà Nội",
    phone: "0243.872.5160",
    hours: "08:00 - 17:30 (Thứ 2 - Thứ 7)",
    services: "Bảo dưỡng định kỳ, Phanh gầm, Máy gầm, Điện lạnh, Sơn gò",
  },
  {
    name: "Gara Minh Phát Auto",
    address: "62 Trường Chinh, Thanh Xuân, Hà Nội",
    phone: "0243.628.1944",
    hours: "08:00 - 17:30 (Thứ 2 - Thứ 7)",
    services: "Chẩn đoán máy, Sửa chữa động cơ, Thay dầu, Khử trùng dàn lạnh",
  },
] as const;

export default function AboutPage() {
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
            <Link href="/dich-vu" className="text-sm font-semibold text-slate-600 hover:text-blue-600">
              Dịch vụ Gara
            </Link>
            <Button render={<Link href="/dang-ky" />} className="bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-xl">
              Tạo Tài Khoản
            </Button>
          </div>
        </div>
      </header>

      <main className="py-12 space-y-16">
        {/* About Hero Banner */}
        <section aria-label="Giới thiệu hero" className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 text-white rounded-3xl p-8 sm:p-14 shadow-2xl space-y-6">
            <span className="px-3.5 py-1.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30 text-xs font-bold uppercase tracking-wide">
              Sứ Mệnh AutoCare
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
            <h2 className="text-3xl font-black text-slate-900">Mạng Lưới Gara Đối Tác Uy Tín</h2>
            <p className="text-slate-600 text-sm">
              Trang thiết bị máy móc chẩn đoán chuyên sâu, đội ngũ kỹ thuật viên tay nghề cao.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {GARAGES.map((g, idx) => (
              <div key={idx} className="bg-white border border-slate-200 rounded-3xl p-8 shadow-sm hover:shadow-xl transition-all space-y-4">
                <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
                  <div className="w-12 h-12 rounded-2xl bg-blue-100 text-blue-600 flex items-center justify-center font-bold text-xl">
                    🏢
                  </div>
                  <div>
                    <h3 className="font-extrabold text-lg text-slate-900">{g.name}</h3>
                    <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                      <MapPin className="size-3.5 text-red-500" /> {g.address}
                    </p>
                  </div>
                </div>

                <div className="space-y-2 text-xs text-slate-700">
                  <p>📞 Điện thoại đặt lịch: <strong className="text-blue-600 font-mono">{g.phone}</strong></p>
                  <p>⏰ Giờ làm việc: {g.hours}</p>
                  <p>🛠️ Dịch vụ trọng tâm: {g.services}</p>
                </div>

                <div className="pt-4 border-t border-slate-100">
                  <Button
                    render={<Link href="/tai-khoan/lich-hen/moi" />}
                    className="w-full bg-slate-900 hover:bg-blue-600 text-white font-bold rounded-xl h-11"
                  >
                    Đặt Lịch Hẹn Tại Gara Này
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-slate-900 py-8 text-center text-xs text-slate-400">
        © {new Date().getFullYear()} AutoCare.vn. Tất cả thông tin gara và dịch vụ được cập nhật chính xác.
      </footer>
    </div>
  );
}
