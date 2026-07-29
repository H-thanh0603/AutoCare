import Link from "next/link";
import {
  ArrowRight,
  Award,
  CalendarCheck,
  Car,
  CheckCircle2,
  ChevronRight,
  Clock,
  FileCheck2,
  FileText,
  Gauge,
  Layers,
  Lock,
  MessageSquare,
  ShieldCheck,
  Sparkles,
  Star,
  Users,
  Wrench,
  Zap,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { getSessionUser } from "@/lib/auth";
import { isStaff } from "@/lib/rbac";

export default async function HomePage() {
  const user = await getSessionUser();
  const portalHref = user ? (isStaff(user) ? "/bang-dieu-khien" : "/tai-khoan") : null;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-blue-500 selection:text-white">
      {/* Ambient background glows */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute -top-40 -left-40 w-96 h-96 bg-blue-600/20 rounded-full blur-[128px]" />
        <div className="absolute top-1/3 -right-40 w-96 h-96 bg-indigo-600/15 rounded-full blur-[128px]" />
        <div className="absolute bottom-10 left-1/4 w-96 h-96 bg-purple-600/15 rounded-full blur-[128px]" />
      </div>

      {/* Header / Navbar */}
      <header className="sticky top-0 z-50 border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 p-0.5 shadow-lg shadow-blue-500/25 group-hover:scale-105 transition-transform duration-300">
              <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
                <Car className="size-5 text-blue-400" aria-hidden="true" />
              </div>
            </div>
            <div className="flex flex-col">
              <span className="font-extrabold text-xl tracking-tight bg-gradient-to-r from-white via-slate-200 to-blue-400 bg-clip-text text-transparent">
                AutoCare
              </span>
              <span className="text-[10px] text-slate-400 font-medium tracking-widest uppercase -mt-1">
                Garage Platform
              </span>
            </div>
          </Link>

          <nav aria-label="Điều hướng chính" className="flex items-center gap-3">
            {portalHref ? (
              <Button
                render={<Link href={portalHref} />}
                className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-medium shadow-lg shadow-blue-600/25 transition-all duration-300 hover:scale-105"
              >
                <span>Vào hệ thống</span>
                <ArrowRight className="size-4 ml-1" />
              </Button>
            ) : (
              <>
                <Button
                  variant="ghost"
                  render={<Link href="/dang-nhap" />}
                  className="text-slate-300 hover:text-white hover:bg-slate-800/60"
                >
                  Đăng nhập
                </Button>
                <Button
                  render={<Link href="/dang-ky" />}
                  className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-semibold shadow-lg shadow-blue-600/25 transition-all duration-300 hover:scale-105"
                >
                  <Sparkles className="size-4 mr-1 text-amber-300" />
                  <span>Tạo tài khoản miễn phí</span>
                </Button>
              </>
            )}
          </nav>
        </div>
      </header>

      <main className="relative z-10">
        {/* Hero Section */}
        <section aria-labelledby="hero-heading" className="relative pt-16 pb-24 lg:pt-24 lg:pb-32 overflow-hidden">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
              {/* Left text column */}
              <div className="lg:col-span-7 space-y-8 text-center lg:text-left">
                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-semibold tracking-wide uppercase shadow-inner">
                  <Sparkles className="size-3.5 text-blue-400 animate-pulse" />
                  <span>Nền tảng Quản lý Gara & Hồ sơ Xe Điện tử thế hệ mới</span>
                </div>

                <h1
                  id="hero-heading"
                  className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight text-white leading-[1.15]"
                >
                  Sửa xe <span className="bg-gradient-to-r from-blue-400 via-indigo-400 to-purple-400 bg-clip-text text-transparent">minh bạch 100%</span> từ đặt lịch đến khi nhận xe.
                </h1>

                <p className="text-lg sm:text-xl text-slate-300 max-w-2xl mx-auto lg:mx-0 font-normal leading-relaxed">
                  AutoCare giúp chủ xe xem rõ từng hạng mục sửa chữa kèm giá tiền thực tế, phê duyệt báo giá trực tuyến và lưu trữ toàn bộ lịch sử sức khỏe xe trọn đời.
                </p>

                <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 pt-2">
                  {portalHref ? (
                    <Button
                      size="lg"
                      render={<Link href={portalHref} />}
                      className="w-full sm:w-auto h-13 px-8 text-base bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold shadow-xl shadow-blue-600/30 rounded-xl transition-all duration-300 hover:scale-105"
                    >
                      <span>Vào bảng điều khiển của bạn</span>
                      <ArrowRight className="size-5 ml-2" />
                    </Button>
                  ) : (
                    <>
                      <Button
                        size="lg"
                        render={<Link href="/dang-ky" />}
                        className="w-full sm:w-auto h-13 px-8 text-base bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold shadow-xl shadow-blue-600/30 rounded-xl transition-all duration-300 hover:scale-105"
                      >
                        <Car className="size-5 mr-2 text-blue-200" />
                        <span>Đăng ký dành cho Chủ xe</span>
                      </Button>
                      <Button
                        size="lg"
                        variant="outline"
                        render={<Link href="/dang-nhap" />}
                        className="w-full sm:w-auto h-13 px-7 text-base border-slate-700 bg-slate-900/60 hover:bg-slate-800 text-slate-200 hover:text-white rounded-xl transition-all"
                      >
                        <Wrench className="size-4 mr-2 text-indigo-400" />
                        <span>Cổng đăng nhập Nhân sự Gara</span>
                      </Button>
                    </>
                  )}
                </div>

                {/* Trust badges */}
                <div className="pt-6 border-t border-slate-800/80 flex flex-wrap items-center justify-center lg:justify-start gap-6 text-xs text-slate-400">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="size-4 text-emerald-400" />
                    <span>Duyệt từng hạng mục báo giá</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="size-4 text-blue-400" />
                    <span>Bảo mật PII cá nhân Quy tắc 17</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Award className="size-4 text-amber-400" />
                    <span>Hồ sơ xe bất biến trọn đời</span>
                  </div>
                </div>
              </div>

              {/* Right Hero Demo Mockup */}
              <div className="lg:col-span-5 relative">
                <div className="relative mx-auto max-w-md bg-gradient-to-b from-slate-900/90 to-slate-950/90 border border-slate-800 rounded-3xl p-6 shadow-2xl shadow-blue-950/50 backdrop-blur-xl hover:border-blue-500/40 transition-all duration-500">
                  {/* Decorative badge */}
                  <div className="flex items-center justify-between pb-4 mb-4 border-b border-slate-800">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 font-bold">
                        🏎️
                      </div>
                      <div>
                        <h3 className="font-bold text-sm text-slate-100">Toyota Camry 2.5Q</h3>
                        <p className="text-xs text-slate-400 font-mono">Biển số: 51K-888.88</p>
                      </div>
                    </div>
                    <span className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      98% Sức khỏe tốt
                    </span>
                  </div>

                  {/* Realtime Repair Order Card */}
                  <div className="space-y-4">
                    <div className="bg-slate-900/90 rounded-2xl p-4 border border-slate-800">
                      <div className="flex justify-between items-center text-xs mb-2">
                        <span className="text-slate-400">Lệnh sửa chữa #RO-2026-008</span>
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-500/20 text-blue-300">
                          ĐANG TIẾN HÀNH
                        </span>
                      </div>
                      <div className="space-y-2">
                        <div className="flex justify-between text-xs text-slate-300">
                          <span>1. Thay dầu nhớt động cơ 5W30</span>
                          <span className="font-mono text-emerald-400 font-semibold">650.000đ</span>
                        </div>
                        <div className="flex justify-between text-xs text-slate-300">
                          <span>2. Thay má phanh trước (Chính hãng)</span>
                          <span className="font-mono text-emerald-400 font-semibold">1.200.000đ</span>
                        </div>
                        <div className="pt-2 border-t border-slate-800 flex justify-between text-xs font-bold text-slate-100">
                          <span>Tổng báo giá đã duyệt:</span>
                          <span className="text-blue-400 font-mono">1.850.000đ</span>
                        </div>
                      </div>
                    </div>

                    {/* Timeline progress preview */}
                    <div className="space-y-2 pt-2">
                      <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Tiến độ thời gian thực</p>
                      <div className="grid grid-cols-4 gap-1.5 text-center text-[10px]">
                        <div className="bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 rounded-lg py-1.5 font-medium">✓ Đặt lịch</div>
                        <div className="bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 rounded-lg py-1.5 font-medium">✓ Báo giá</div>
                        <div className="bg-blue-600/30 border border-blue-500 text-blue-200 rounded-lg py-1.5 font-semibold animate-pulse">⚙️ Đang làm</div>
                        <div className="bg-slate-800 text-slate-500 rounded-lg py-1.5">Bàn giao</div>
                      </div>
                    </div>

                    {/* Warranty badge */}
                    <div className="bg-indigo-950/40 border border-indigo-500/20 rounded-xl p-3 flex items-center gap-3">
                      <ShieldCheck className="size-5 text-indigo-400 shrink-0" />
                      <div className="text-xs">
                        <p className="font-semibold text-slate-200">Bảo hành chính hãng AutoCare</p>
                        <p className="text-slate-400 text-[11px]">Bảo hành 6 tháng hoặc 10.000km cho má phanh</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Stats counter section */}
        <section aria-label="Thống kê hệ thống" className="border-y border-slate-800/80 bg-slate-900/40 backdrop-blur-md">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 text-center">
              <div className="space-y-1">
                <p className="text-3xl sm:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-400 font-mono">100.000+</p>
                <p className="text-xs text-slate-400 font-medium">Lượt xe lưu hồ sơ điện tử</p>
              </div>
              <div className="space-y-1">
                <p className="text-3xl sm:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-400 font-mono">99.8%</p>
                <p className="text-xs text-slate-400 font-medium">Độ hài lòng về minh bạch báo giá</p>
              </div>
              <div className="space-y-1">
                <p className="text-3xl sm:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400 font-mono">50+</p>
                <p className="text-xs text-slate-400 font-medium">Gara chất lượng cao đồng hành</p>
              </div>
              <div className="space-y-1">
                <p className="text-3xl sm:text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-400 font-mono">100%</p>
                <p className="text-xs text-slate-400 font-medium">Bảo mật thông tin PII chủ xe</p>
              </div>
            </div>
          </div>
        </section>

        {/* Customer Experience Highlights */}
        <section aria-labelledby="customer-features-heading" className="py-24 relative">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
              <h2 id="customer-features-heading" className="text-3xl sm:text-4xl font-extrabold text-white">
                Trải nghiệm chăm sóc xe hoàn toàn mới cho Chủ Xe
              </h2>
              <p className="text-slate-400 text-base">
                Không còn nỗi lo bị "vẽ bệnh", ép giá hay không biết xe mình đang được thay phụ tùng gì.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {/* Feature 1 */}
              <div className="group bg-slate-900/60 border border-slate-800 hover:border-blue-500/40 rounded-2xl p-8 hover:-translate-y-1.5 transition-all duration-300 shadow-lg hover:shadow-blue-500/10">
                <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400 mb-6 group-hover:scale-110 transition-transform">
                  <CalendarCheck className="size-6" />
                </div>
                <h3 className="text-xl font-bold text-white mb-3">Đặt lịch Online nhanh chóng</h3>
                <p className="text-slate-400 text-sm leading-relaxed mb-4">
                  Chọn gara uy tín, loại dịch vụ và khung giờ mong muốn chỉ với vài cú nhấp. Hệ thống kiểm tra trùng lịch tự động và gửi thông báo xác nhận ngay lập tức.
                </p>
                <span className="text-xs font-semibold text-blue-400 flex items-center gap-1">
                  Xác nhận tức thì <ChevronRight className="size-3.5" />
                </span>
              </div>

              {/* Feature 2 */}
              <div className="group bg-slate-900/60 border border-slate-800 hover:border-indigo-500/40 rounded-2xl p-8 hover:-translate-y-1.5 transition-all duration-300 shadow-lg hover:shadow-indigo-500/10">
                <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mb-6 group-hover:scale-110 transition-transform">
                  <FileText className="size-6" />
                </div>
                <h3 className="text-xl font-bold text-white mb-3">Duyệt Báo giá từng hạng mục</h3>
                <p className="text-slate-400 text-sm leading-relaxed mb-4">
                  Xem chi tiết từng công việc và phụ tùng kèm đơn giá niêm yết. Bạn toàn quyền chọn DUYỆT hoặc TỪ CHỐI từng mục riêng biệt trước khi kỹ thuật viên bắt đầu làm.
                </p>
                <span className="text-xs font-semibold text-indigo-400 flex items-center gap-1">
                  Quy tắc 1 & 5 bảo vệ khách hàng <ChevronRight className="size-3.5" />
                </span>
              </div>

              {/* Feature 3 */}
              <div className="group bg-slate-900/60 border border-slate-800 hover:border-emerald-500/40 rounded-2xl p-8 hover:-translate-y-1.5 transition-all duration-300 shadow-lg hover:shadow-emerald-500/10">
                <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 mb-6 group-hover:scale-110 transition-transform">
                  <Gauge className="size-6" />
                </div>
                <h3 className="text-xl font-bold text-white mb-3">Hồ sơ Sức khỏe Xe trọn đời</h3>
                <p className="text-slate-400 text-sm leading-relaxed mb-4">
                  Toàn bộ lịch sử sửa chữa, số km và phụ tùng đã thay được lưu trữ bất biến. Giúp giữ giá trị xe khi bán lại và dễ dàng chia sẻ liên kết an toàn không lộ PII.
                </p>
                <span className="text-xs font-semibold text-emerald-400 flex items-center gap-1">
                  Quy tắc 12 & 17 minh bạch <ChevronRight className="size-3.5" />
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* Garage Workflow Section */}
        <section aria-labelledby="workflow-heading" className="py-24 border-t border-slate-800/80 bg-slate-900/20">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
              <h2 id="workflow-heading" className="text-3xl sm:text-4xl font-extrabold text-white">
                Quy trình Xưởng chuẩn 6 bước dành cho Gara
              </h2>
              <p className="text-slate-400 text-base">
                Thay thế ghi chép thủ công và tin nhắn rời rạc bằng luồng công việc tự động hóa khép kín.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4 text-center">
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-2">
                <div className="w-8 h-8 rounded-full bg-blue-500/20 text-blue-400 font-bold text-sm mx-auto flex items-center justify-center">1</div>
                <h4 className="font-semibold text-sm text-slate-100">Tiếp nhận xe</h4>
                <p className="text-xs text-slate-400">Tạo lệnh sửa chữa & ghi nhận thông tin</p>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-2">
                <div className="w-8 h-8 rounded-full bg-indigo-500/20 text-indigo-400 font-bold text-sm mx-auto flex items-center justify-center">2</div>
                <h4 className="font-semibold text-sm text-slate-100">Kiểm tra xe</h4>
                <p className="text-xs text-slate-400">Ghi chép tình trạng & chụp ảnh chứng cứ</p>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-2">
                <div className="w-8 h-8 rounded-full bg-purple-500/20 text-purple-400 font-bold text-sm mx-auto flex items-center justify-center">3</div>
                <h4 className="font-semibold text-sm text-slate-100">Gửi báo giá</h4>
                <p className="text-xs text-slate-400">Khách duyệt trực tuyến qua Portal</p>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-2">
                <div className="w-8 h-8 rounded-full bg-amber-500/20 text-amber-400 font-bold text-sm mx-auto flex items-center justify-center">4</div>
                <h4 className="font-semibold text-sm text-slate-100">Xuất kho & Làm</h4>
                <p className="text-xs text-slate-400">Phân công kỹ thuật viên & trừ tồn kho</p>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-2">
                <div className="w-8 h-8 rounded-full bg-teal-500/20 text-teal-400 font-bold text-sm mx-auto flex items-center justify-center">5</div>
                <h4 className="font-semibold text-sm text-slate-100">Nghiệm thu QC</h4>
                <p className="text-xs text-slate-400">Đạt chất lượng mới cho xuất hóa đơn</p>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-2">
                <div className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-400 font-bold text-sm mx-auto flex items-center justify-center">6</div>
                <h4 className="font-semibold text-sm text-slate-100">Bàn giao & Sync</h4>
                <p className="text-xs text-slate-400">Tự động tạo Hồ sơ sức khỏe xe</p>
              </div>
            </div>
          </div>
        </section>

        {/* CTA Banner */}
        <section aria-label="Bắt đầu ngay" className="py-20 relative">
          <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
            <div className="relative rounded-3xl bg-gradient-to-r from-blue-900 via-indigo-900 to-slate-900 border border-blue-500/30 p-10 sm:p-14 text-center overflow-hidden shadow-2xl">
              <div className="absolute inset-0 bg-blue-500/10 blur-3xl pointer-events-none" />
              <h2 className="text-3xl sm:text-4xl font-black text-white mb-4 relative z-10">
                Sẵn sàng trải nghiệm dịch vụ chăm sóc xe thông minh?
              </h2>
              <p className="text-slate-300 text-base max-w-xl mx-auto mb-8 relative z-10">
                Tạo tài khoản ngay hôm nay để quản lý toàn bộ chiếc xe của bạn hoặc đăng ký gara đồng hành cùng AutoCare.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4 relative z-10">
                <Button
                  size="lg"
                  render={<Link href="/dang-ky" />}
                  className="w-full sm:w-auto h-12 px-8 bg-gradient-to-r from-blue-500 to-indigo-500 hover:from-blue-400 hover:to-indigo-400 text-white font-bold rounded-xl shadow-lg shadow-blue-500/25"
                >
                  Tạo tài khoản Chủ Xe
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  render={<Link href="/dang-nhap" />}
                  className="w-full sm:w-auto h-12 px-8 border-slate-700 bg-slate-950/80 hover:bg-slate-900 text-slate-200 rounded-xl"
                >
                  Đăng nhập Nhân viên Gara
                </Button>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-800 bg-slate-950 py-12 text-slate-400 text-sm">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <Car className="size-5 text-blue-400" />
              <span className="font-bold text-white text-base">AutoCare</span>
              <span className="text-xs text-slate-500">© {new Date().getFullYear()} AutoCare Inc.</span>
            </div>
            <div className="flex gap-6 text-xs">
              <Link href="/dang-nhap" className="hover:text-white transition-colors">Đăng nhập nhân viên</Link>
              <Link href="/dang-ky" className="hover:text-white transition-colors">Đăng ký khách hàng</Link>
              <span className="text-slate-600">Quy tắc Bảo mật PII Rule 17</span>
            </div>
          </div>
          <p className="text-xs text-slate-500 text-center sm:text-left">
            Hồ sơ sức khỏe xe ghi lại những gì gara đã kiểm tra và thực hiện. Đây là tư liệu tham khảo kỹ thuật minh bạch, không thay thế cho Giấy chứng nhận kiểm định an toàn kỹ thuật phương tiện giao thông đường bộ.
          </p>
        </div>
      </footer>
    </div>
  );
}
