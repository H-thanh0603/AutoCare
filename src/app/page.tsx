import Link from "next/link";
import Image from "next/image";
import {
  ArrowRight,
  Award,
  CalendarCheck,
  Car,
  CheckCircle2,
  MapPin,
  PhoneCall,
  ShieldCheck,
  Sparkles,
  Star,
  Wrench,
  Zap,
  Gauge,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { getSessionUser } from "@/lib/auth";
import { isStaff } from "@/lib/rbac";
import { InteractiveCostCalculator } from "@/components/landing/interactive-cost-calculator";
import { DiagnosticTelemetryDemo } from "@/components/landing/diagnostic-telemetry-demo";
import { LiveWorkflowSimulator } from "@/components/landing/live-workflow-simulator";
import { InteractiveFaqGuarantee } from "@/components/landing/interactive-faq-guarantee";

const CAR_BRANDS_MARQUEE = [
  "MERCEDES-BENZ",
  "BMW",
  "PORSCHE",
  "AUDI",
  "LEXUS",
  "TOYOTA",
  "HONDA",
  "MAZDA",
  "HYUNDAI",
  "FORD",
  "VINFAST",
  "KIA",
  "VOLVO",
  "SUBARU",
];

const SERVICES_PREVIEW = [
  {
    icon: Wrench,
    badge: "Phổ biến nhất",
    title: "Bảo dưỡng Định kỳ Tương ứng km",
    price: "Từ 450.000đ",
    desc: "Thay dầu nhớt cao cấp, lọc dầu, lọc gió, kiểm tra 30 hạng mục an toàn theo tiêu chuẩn hãng.",
    duration: "45 phút",
  },
  {
    icon: ShieldCheck,
    badge: "An toàn tuyệt đối",
    title: "Kiểm tra & Thay thế Má phanh - Gầm",
    price: "Từ 650.000đ",
    desc: "Đo độ mòn má phanh bằng laser, bảo dưỡng cụm phanh ABS, cân chỉnh thước lái 3D & hệ thống treo.",
    duration: "60 phút",
  },
  {
    icon: Zap,
    badge: "Chẩn đoán máy",
    title: "Đọc lỗi Động cơ & Hệ thống Điện",
    price: "Từ 300.000đ",
    desc: "Sử dụng máy quét OBD-II chuyên sâu, phân tích mã lỗi, kiểm tra sức khỏe ắc quy & máy phát.",
    duration: "30 phút",
  },
  {
    icon: Gauge,
    badge: "Mát lạnh sâu",
    title: "Bảo dưỡng Điều hòa & Nạp ga Ô tô",
    price: "Từ 500.000đ",
    desc: "Nội soi vệ sinh dàn lạnh không tháo taplo, hút nạp ga tự động, khử mùi Nano Bạc diệt khuẩn.",
    duration: "40 phút",
  },
] as const;

const TESTIMONIALS = [
  {
    name: "Anh Nguyễn Minh Tuấn",
    car: "Mercedes-Benz C200 (Biển 30H-888.22)",
    comment: "Điều tôi thích nhất ở AutoCare là báo giá gửi qua điện thoại rất rõ ràng. Tôi có thể bấm duyệt từng mục thay dầu hay thay má phanh, không sợ bị thêm chi phí ngoài dự kiến.",
    rating: 5,
    role: "Chủ doanh nghiệp • Hà Nội",
  },
  {
    name: "Chị Trần Thanh Hương",
    car: "Toyota Corolla Cross 1.8V (Biển 51K-668.99)",
    comment: "Lần đầu đi bảo dưỡng xe mà cảm thấy an tâm như vậy. Toàn bộ lịch sử thay lọc dầu và số km được lưu trên hồ sơ điện tử, sau này bán lại xe chắc chắn rất giữ giá.",
    rating: 5,
    role: "Bác sĩ • TP. Hồ Chí Minh",
  },
  {
    name: "Anh Lê Hoàng Nam",
    car: "Ford Ranger Wildtrak (Biển 29C-991.55)",
    comment: "Đặt lịch online trước 1 ngày, sáng ra mang xe tới gara là kỹ thuật viên tiếp nhận ngay, không phải xếp hàng chờ đợi. Không gian xưởng sạch bóng như showroom.",
    rating: 5,
    role: "Kiến trúc sư • Hà Nội",
  },
] as const;

export default async function HomePage() {
  const user = await getSessionUser();
  const portalHref = user ? (isStaff(user) ? "/bang-dieu-khien" : "/tai-khoan") : null;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-blue-600 selection:text-white">
      {/* Top Announcement Bar */}
      <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-blue-800 text-white text-xs py-2 px-4 shadow-sm">
        <div className="mx-auto max-w-7xl flex flex-col sm:flex-row items-center justify-between gap-2 text-center sm:text-left">
          <div className="flex items-center justify-center gap-2 font-medium">
            <span className="bg-amber-400 text-slate-950 font-black px-2 py-0.5 rounded text-[10px] uppercase tracking-wider">
              Hotline 24/7
            </span>
            <span>Tổng đài Cứu hộ khẩn cấp & Đặt lịch hẹn Gara: <strong>0243.872.5160</strong></span>
          </div>
          <div className="flex items-center gap-4 text-[11px] text-blue-100">
            <span>⏰ Giờ mở cửa: 07:30 - 18:30 (Cả Thứ 7 & CN)</span>
            <span className="hidden md:inline">📍 185 Nguyễn Văn Cừ, Long Biên, Hà Nội</span>
          </div>
        </div>
      </div>

      {/* Main Navigation Header */}
      <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/90 backdrop-blur-xl shadow-sm">
        <div className="mx-auto flex h-20 w-full max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 p-0.5 shadow-md shadow-blue-500/20 group-hover:scale-105 transition-all duration-300">
              <div className="w-full h-full bg-white rounded-[14px] flex items-center justify-center">
                <Car className="size-6 text-blue-600" aria-hidden="true" />
              </div>
            </div>
            <div className="flex flex-col">
              <span className="font-black text-2xl tracking-tight text-slate-900 group-hover:text-blue-600 transition-colors">
                AutoCare<span className="text-blue-600">.vn</span>
              </span>
              <span className="text-[10px] text-slate-500 font-bold tracking-widest uppercase -mt-1">
                Hệ Thống Gara Ô Tô Chuẩn 5★
              </span>
            </div>
          </Link>

          <nav aria-label="Điều hướng chính" className="hidden lg:flex items-center gap-8 text-sm font-semibold text-slate-700">
            <Link href="/" className="text-blue-600 font-bold hover:text-blue-700 transition-colors">Trang chủ</Link>
            <Link href="/dich-vu" className="hover:text-blue-600 transition-colors">Dịch vụ Gara</Link>
            <Link href="#cost-calculator" className="hover:text-blue-600 transition-colors">Dự toán chi phí</Link>
            <Link href="/ve-chung-toi" className="hover:text-blue-600 transition-colors">Về AutoCare</Link>
            <Link href="/tai-khoan" className="hover:text-blue-600 transition-colors">Hồ sơ xe điện tử</Link>
          </nav>

          <div className="flex items-center gap-3">
            {portalHref ? (
              <Button
                render={<Link href={portalHref} />}
                className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-5 h-11 rounded-xl shadow-md shadow-blue-500/20 transition-all hover:scale-105"
              >
                <span>Vào Hệ Thống</span>
                <ArrowRight className="size-4 ml-1.5" />
              </Button>
            ) : (
              <>
                <Button
                  variant="ghost"
                  render={<Link href="/dang-nhap" />}
                  className="text-slate-700 hover:text-blue-600 hover:bg-blue-50 font-semibold"
                >
                  Đăng nhập
                </Button>
                <Button
                  render={<Link href="/dang-ky" />}
                  className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold px-5 h-11 rounded-xl shadow-md shadow-blue-600/25 transition-all hover:scale-105"
                >
                  <Sparkles className="size-4 mr-1.5 text-amber-300" />
                  <span>Đăng ký Đặt lịch</span>
                </Button>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="space-y-20 sm:space-y-28">
        {/* HERO SECTION: Bright, High-End Commercial Showcase */}
        <section aria-labelledby="hero-title" className="relative pt-12 pb-20 lg:pt-16 lg:pb-28 overflow-hidden bg-gradient-to-b from-blue-50 via-indigo-50/40 to-slate-50">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
              {/* Left Column: Headlines & Call to actions */}
              <div className="lg:col-span-7 space-y-8 text-center lg:text-left">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-100 border border-blue-200 text-blue-800 text-xs font-bold tracking-wide shadow-sm">
                  <Award className="size-4 text-blue-600" />
                  <span>Hệ Thống Gara Ô Tô Chuẩn 5 Sao • Minh Bạch Báo Giá 100%</span>
                </div>

                <h1
                  id="hero-title"
                  className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight text-slate-900 leading-[1.12]"
                >
                  Chăm sóc chiếc xe của bạn với <br className="hidden sm:inline" />
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-800">
                    Công Nghệ & Sự Minh Bạch
                  </span>{" "}
                  tuyệt đối.
                </h1>

                <p className="text-lg sm:text-xl text-slate-600 max-w-2xl mx-auto lg:mx-0 font-medium leading-relaxed">
                  Đặt lịch trực tuyến chỉ 30 giây, xem hình ảnh kiểm tra lỗi thực tế, phê duyệt từng con ốc trên điện thoại và lưu giữ <strong className="text-blue-700 font-bold">Hồ sơ sức khỏe xe điện tử</strong> trọn đời.
                </p>

                <div className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4 pt-2">
                  <Button
                    size="lg"
                    render={<Link href={portalHref ?? "/dang-ky"} />}
                    className="w-full sm:w-auto h-14 px-8 text-base bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-black shadow-xl shadow-blue-600/30 rounded-2xl transition-all hover:scale-105"
                  >
                    <CalendarCheck className="size-5 mr-2" />
                    <span>Đặt Lịch Bảo Dưỡng Ngay</span>
                  </Button>
                  <Button
                    size="lg"
                    variant="outline"
                    render={<Link href="#cost-calculator" />}
                    className="w-full sm:w-auto h-14 px-8 text-base border-slate-300 bg-white hover:bg-slate-100 text-slate-800 font-bold rounded-2xl shadow-sm hover:border-blue-500/50 transition-all"
                  >
                    <Wrench className="size-5 mr-2 text-blue-600" />
                    <span>Dự Toán Chi Phí Tức Thì</span>
                  </Button>
                </div>

                {/* Hero Badges */}
                <div className="pt-8 border-t border-slate-200 grid grid-cols-3 gap-4 text-center lg:text-left">
                  <div className="space-y-1">
                    <p className="text-2xl sm:text-3xl font-black text-blue-600 font-mono">50.000+</p>
                    <p className="text-xs text-slate-500 font-semibold">Chủ xe tin cậy</p>
                  </div>
                  <div className="space-y-1 border-x border-slate-200 px-4">
                    <p className="text-2xl sm:text-3xl font-black text-emerald-600 font-mono">100%</p>
                    <p className="text-xs text-slate-500 font-semibold">Báo giá trước khi sửa</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-2xl sm:text-3xl font-black text-amber-500 font-mono">4.9 ★</p>
                    <p className="text-xs text-slate-500 font-semibold">Đánh giá Google 5★</p>
                  </div>
                </div>
              </div>

              {/* Right Column: Dynamic Garage Showcase Card */}
              <div className="lg:col-span-5 relative">
                <div className="bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-8 shadow-2xl shadow-blue-900/10 space-y-6 relative z-10 animate-float">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-blue-100 border border-blue-200 flex items-center justify-center text-blue-600 text-xl font-bold">
                        🏎️
                      </div>
                      <div>
                        <h3 className="font-extrabold text-base text-slate-900">Gara AutoCare Long Biên</h3>
                        <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                          <MapPin className="size-3.5 text-rose-500" /> 185 Nguyễn Văn Cừ, Hà Nội
                        </p>
                      </div>
                    </div>
                    <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                      ĐANG MỞ CỬA
                    </span>
                  </div>

                  {/* Live Interactive Quotation Preview */}
                  <div className="space-y-3">
                    <div className="flex justify-between items-center text-xs font-bold text-slate-700">
                      <span>BÁO GIÁ ĐIỆN TỬ #INV-2026</span>
                      <span className="text-blue-600 font-mono">Phê duyệt 1-chạm</span>
                    </div>

                    <div className="space-y-2 bg-slate-50 rounded-2xl p-4 border border-slate-200">
                      <div className="flex items-center justify-between text-xs p-2.5 rounded-xl bg-white border border-emerald-200 shadow-sm">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="size-4 text-emerald-600 shrink-0" />
                          <span className="font-medium text-slate-800">1. Thay nhớt Castrol EDGE 5W-30 (4L)</span>
                        </div>
                        <span className="font-mono font-bold text-slate-900">750.000đ</span>
                      </div>

                      <div className="flex items-center justify-between text-xs p-2.5 rounded-xl bg-white border border-emerald-200 shadow-sm">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="size-4 text-emerald-600 shrink-0" />
                          <span className="font-medium text-slate-800">2. Thay má phanh trước Brembo</span>
                        </div>
                        <span className="font-mono font-bold text-slate-900">1.150.000đ</span>
                      </div>

                      <div className="pt-2 border-t border-slate-200 flex justify-between items-center text-sm font-black text-slate-900">
                        <span>Tổng tiền đã duyệt:</span>
                        <span className="text-emerald-600 font-mono text-base">1.900.000đ</span>
                      </div>
                    </div>
                  </div>

                  {/* 24/7 Hotline Banner */}
                  <div className="bg-gradient-to-r from-red-600 to-rose-600 text-white rounded-2xl p-4 flex items-center justify-between shadow-lg shadow-red-500/20">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                        <PhoneCall className="size-5 text-white animate-bounce" />
                      </div>
                      <div>
                        <p className="text-[10px] font-bold text-red-100 uppercase tracking-wide">Cứu hộ khẩn cấp 24/7</p>
                        <p className="text-lg font-black tracking-tight font-mono">0243.872.5160</p>
                      </div>
                    </div>
                    <a
                      href="tel:02438725160"
                      className="text-xs font-bold bg-white text-red-600 px-3.5 py-2 rounded-xl hover:bg-red-50 transition-colors shadow-sm"
                    >
                      Gọi Ngay
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* BRAND MARQUEE BANNER: Top Automotive Brands Supported */}
        <section className="border-y border-slate-200/80 bg-white py-6 overflow-hidden">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 mb-3">
            <p className="text-center text-xs font-bold uppercase tracking-widest text-slate-500">
              Chuyên Sửa Chữa & Bảo Dưỡng Đa Dòng Xe Chuẩn Hãng
            </p>
          </div>
          <div className="relative w-full overflow-hidden flex">
            <div className="animate-marquee gap-8 items-center text-slate-700 font-mono font-bold text-sm tracking-wider">
              {CAR_BRANDS_MARQUEE.concat(CAR_BRANDS_MARQUEE).map((brand, i) => (
                <div key={i} className="flex items-center gap-8 shrink-0">
                  <span className="hover:text-blue-600 transition-colors px-4 py-1.5 rounded-xl bg-slate-50 border border-slate-200 shadow-sm">
                    {brand}
                  </span>
                  <span className="text-slate-300">•</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* INTERACTIVE TELEMETRY & DIAGNOSTIC SECTION */}
        <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <DiagnosticTelemetryDemo />
        </section>

        {/* CORE SERVICES GRID */}
        <section aria-labelledby="services-heading" className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
            <span className="px-3.5 py-1 rounded-full bg-blue-100 text-blue-800 text-xs font-bold uppercase tracking-wide">
              Hạng Mục Tiêu Biểu
            </span>
            <h2 id="services-heading" className="text-3xl sm:text-4xl lg:text-5xl font-black text-slate-900 tracking-tight">
              Dịch Vụ Gara Chuyên Nghiệp
            </h2>
            <p className="text-slate-600 text-base">
              Bảng giá niêm yết công khai, sử dụng máy móc chuyên dụng thế hệ mới và phụ tùng chính ngạch.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {SERVICES_PREVIEW.map((item, idx) => (
              <div
                key={idx}
                className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm hover:shadow-xl hover:border-blue-300 hover:-translate-y-1.5 transition-all duration-300 flex flex-col justify-between space-y-6 group"
              >
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-all duration-300">
                      <item.icon className="size-6" />
                    </div>
                    <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-slate-100 text-slate-700">
                      {item.badge}
                    </span>
                  </div>

                  <div>
                    <h3 className="text-lg font-bold text-slate-900 group-hover:text-blue-600 transition-colors leading-snug">
                      {item.title}
                    </h3>
                    <p className="text-xs text-slate-500 mt-2 leading-relaxed">{item.desc}</p>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-100 space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-slate-400">Thời gian: {item.duration}</span>
                    <span className="font-mono font-black text-emerald-600 text-sm">{item.price}</span>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    render={<Link href="/dang-ky" />}
                    className="w-full h-10 border-slate-200 bg-slate-50 text-slate-800 hover:bg-blue-600 hover:text-white hover:border-blue-600 font-bold rounded-xl text-xs transition-all"
                  >
                    <span>Đặt Lịch Hẹn Này</span>
                    <ArrowRight className="size-3.5 ml-1.5" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* INTERACTIVE MAINTENANCE COST CALCULATOR */}
        <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <InteractiveCostCalculator />
        </section>

        {/* 4-STEP LIVE WORKFLOW SIMULATOR */}
        <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <LiveWorkflowSimulator />
        </section>

        {/* TESTIMONIALS & REAL SOCIAL PROOF */}
        <section aria-labelledby="reviews-heading" className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
            <span className="px-3.5 py-1 rounded-full bg-amber-100 text-amber-800 text-xs font-bold uppercase tracking-wide">
              Đánh Giá Từ Chủ Xe
            </span>
            <h2 id="reviews-heading" className="text-3xl sm:text-4xl lg:text-5xl font-black text-slate-900 tracking-tight">
              Hơn 50.000+ Chủ Xe Đã Hài Lòng
            </h2>
            <p className="text-slate-600 text-base">
              Xem cảm nhận thực tế từ những người đã trải nghiệm hệ sinh thái AutoCare.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {TESTIMONIALS.map((item, idx) => (
              <div
                key={idx}
                className="bg-white border border-slate-200 rounded-3xl p-8 shadow-sm hover:shadow-xl transition-all duration-300 space-y-5 flex flex-col justify-between relative"
              >
                <div className="space-y-4">
                  <div className="flex gap-1 text-amber-400">
                    {Array.from({ length: item.rating }).map((_, i) => (
                      <Star key={i} className="size-4 fill-amber-400" />
                    ))}
                  </div>
                  <p className="text-slate-700 text-sm italic leading-relaxed">
                    &quot;{item.comment}&quot;
                  </p>
                </div>

                <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
                  <div>
                    <strong className="text-slate-900 font-bold text-sm block">{item.name}</strong>
                    <span className="text-xs text-blue-600 mt-0.5 block font-medium">{item.car}</span>
                    <span className="text-[11px] text-slate-500 mt-0.5 block">{item.role}</span>
                  </div>
                  <div className="w-9 h-9 rounded-full bg-blue-50 text-blue-600 flex items-center justify-center font-black text-xs">
                    ✓
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* INTERACTIVE FAQ & GUARANTEE */}
        <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <InteractiveFaqGuarantee />
        </section>

        {/* BOTTOM HIGH CONVERSION CTA SECTION */}
        <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pb-12">
          <div className="bg-gradient-to-r from-blue-700 via-indigo-700 to-blue-800 text-white rounded-3xl p-8 sm:p-14 shadow-2xl relative overflow-hidden text-center space-y-8">
            <div className="max-w-3xl mx-auto space-y-4">
              <span className="px-3.5 py-1.5 rounded-full bg-white/20 text-white text-xs font-bold uppercase tracking-wider inline-block">
                Ưu Đãi Đặc Quyền Tháng Này
              </span>
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black text-white tracking-tight leading-tight">
                Sẵn Sàng Trải Nghiệm Dịch Vụ Gara Ô Tô Đẳng Cấp 5 Sao?
              </h2>
              <p className="text-blue-100 text-base max-w-xl mx-auto">
                Đăng ký đặt lịch trực tuyến ngay hôm nay để nhận ưu đãi <strong>Miễn phí kiểm tra 30 hạng mục</strong> và <strong>Rửa xe khử khuẩn Nano Bạc</strong> trị giá 350.000đ.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
              <Button
                size="lg"
                render={<Link href={portalHref ?? "/dang-ky"} />}
                className="w-full sm:w-auto h-14 px-10 text-base bg-white text-blue-700 hover:bg-blue-50 font-black shadow-xl rounded-2xl transition-all hover:scale-105"
              >
                <Sparkles className="size-5 mr-2 text-amber-500" />
                <span>Đặt Lịch Hẹn & Nhận Ưu Đãi</span>
              </Button>
              <Button
                size="lg"
                variant="outline"
                render={<Link href="/ve-chung-toi" />}
                className="w-full sm:w-auto h-14 px-8 text-base border-white/40 bg-transparent hover:bg-white/10 text-white font-bold rounded-2xl"
              >
                <span>Tìm Hiểu Thêm Về AutoCare</span>
              </Button>
            </div>
          </div>
        </section>
      </main>

      {/* FOOTER */}
      <footer className="border-t border-slate-200 bg-slate-900 pt-16 pb-12 text-slate-400 text-sm">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-12">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            <div className="space-y-4">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center text-white">
                  <Car className="size-5" />
                </div>
                <span className="font-black text-xl text-white">AutoCare.vn</span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Nền tảng công nghệ số hóa dịch vụ gara ô tô hàng đầu Việt Nam. Minh bạch báo giá, theo dõi trực tuyến và bảo hành điện tử trọn đời.
              </p>
            </div>

            <div className="space-y-3">
              <h4 className="font-bold text-white text-sm uppercase tracking-wider">Hệ Thống Chi Nhánh</h4>
              <ul className="space-y-2 text-xs">
                <li>📍 <strong>Chi nhánh Hà Nội:</strong> 185 Nguyễn Văn Cừ, Long Biên</li>
                <li>📍 <strong>Chi nhánh Cầu Giấy:</strong> 68 Phạm Văn Đồng, Hà Nội</li>
                <li>📍 <strong>Chi nhánh TP.HCM:</strong> 246 Nguyễn Hữu Thọ, Quận 7</li>
                <li>📍 <strong>Chi nhánh Đà Nẵng:</strong> 12 Nguyễn Tri Phương</li>
              </ul>
            </div>

            <div className="space-y-3">
              <h4 className="font-bold text-white text-sm uppercase tracking-wider">Dịch Vụ Chính</h4>
              <ul className="space-y-2 text-xs">
                <li>• Bảo dưỡng định kỳ 5.000km - 80.000km</li>
                <li>• Chẩn đoán & Sửa chữa hệ thống điện máy</li>
                <li>• Cân chỉnh thước lái & Hệ thống phanh gầm</li>
                <li>• Vệ sinh nội soi dàn lạnh & Khử khuẩn ozone</li>
                <li>• Cứu hộ ô tô 24/7 toàn quốc</li>
              </ul>
            </div>

            <div className="space-y-3">
              <h4 className="font-bold text-white text-sm uppercase tracking-wider">Liên Hệ & Hỗ Trợ</h4>
              <div className="space-y-2 text-xs">
                <p>📞 Hotline: <strong className="text-blue-400 font-mono text-sm">0243.872.5160</strong></p>
                <p>✉️ Email: support@autocare.vn</p>
                <p>⏰ 07:30 - 18:30 hàng ngày</p>
              </div>
            </div>
          </div>

          <div className="pt-8 border-t border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
            <p>© 2026 AutoCare.vn. Bản quyền thuộc về Hệ thống Gara Công Nghệ AutoCare.</p>
            <div className="flex gap-6">
              <Link href="/ve-chung-toi" className="hover:text-slate-300">Chính sách bảo mật</Link>
              <Link href="/ve-chung-toi" className="hover:text-slate-300">Điều khoản dịch vụ</Link>
              <Link href="/ve-chung-toi" className="hover:text-slate-300">Quy định bảo hành</Link>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
