import Link from "next/link";
import {
  ArrowRight,
  Award,
  CalendarCheck,
  Car,
  CheckCircle2,
  ChevronRight,
  Clock,
  ExternalLink,
  FileCheck2,
  FileText,
  Filter,
  Gauge,
  Headphones,
  HelpCircle,
  Layers,
  Lock,
  MapPin,
  MessageSquare,
  PhoneCall,
  Search,
  ShieldCheck,
  Sparkles,
  Star,
  ThumbsUp,
  UserCheck,
  Users,
  Wrench,
  Zap,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { getSessionUser } from "@/lib/auth";
import { isStaff } from "@/lib/rbac";

const SERVICES_PREVIEW = [
  {
    icon: Wrench,
    badge: "Phổ biến nhất",
    badgeBg: "bg-blue-100 text-blue-700 border-blue-200",
    title: "Bảo dưỡng Định kỳ Tương ứng km",
    price: "Từ 450.000đ",
    desc: "Thay dầu nhớt cao cấp, lọc dầu, lọc gió, kiểm tra 30 hạng mục an toàn theo tiêu chuẩn hãng.",
  },
  {
    icon: ShieldCheck,
    badge: "An toàn tuyệt đối",
    badgeBg: "bg-emerald-100 text-emerald-700 border-emerald-200",
    title: "Kiểm tra & Thay thế Má phanh - Gầm",
    price: "Từ 650.000đ",
    desc: "Đo độ mòn má phanh, bảo dưỡng cụm phanh ABS, cân chỉnh thước lái & hệ thống treo gầm xe.",
  },
  {
    icon: Zap,
    badge: "Chẩn đoán máy",
    badgeBg: "bg-amber-100 text-amber-700 border-amber-200",
    title: "Đọc lỗi Động cơ & Hệ thống Điện",
    price: "Từ 300.000đ",
    desc: "Sử dụng máy chẩn đoán đa năng chuyên sâu, đọc xóa lỗi OBD-II, kiểm tra ắc quy & máy phát.",
  },
  {
    icon: Gauge,
    badge: "Mát lạnh sâu",
    badgeBg: "bg-purple-100 text-purple-700 border-purple-200",
    title: "Bảo dưỡng Điều hòa & Nạp ga Ô tô",
    price: "Từ 500.000đ",
    desc: "Vệ sinh dàn lạnh bằng phương pháp nội soi, hút nạp ga tự động, thay lọc gió điều hòa kháng khuẩn.",
  },
] as const;

const TESTIMONIALS = [
  {
    name: "Anh Nguyễn Minh Tuấn",
    car: "Mercedes-Benz C200 (Biển 30H-888.22)",
    comment: "Điều tôi thích nhất ở AutoCare là báo giá gửi qua điện thoại rất rõ ràng. Tôi có thể bấm duyệt từng mục thay dầu hay thay má phanh, không sợ bị thêm chi phí ngoài dự kiến.",
    rating: 5,
  },
  {
    name: "Chị Trần Thanh Hương",
    car: "Toyota Cross 1.8V (Biển 51K-668.99)",
    comment: "Lần đầu đi bảo dưỡng xe mà cảm thấy an tâm như vậy. Toàn bộ lịch sử thay lọc dầu và số km được lưu trên hồ sơ điện tử, sau này bán lại xe chắc chắn rất giữ giá.",
    rating: 5,
  },
  {
    name: "Anh Lê Hoàng Nam",
    car: "Ford Ranger Wildtrak (Biển 29C-991.55)",
    comment: "Đặt lịch online trước 1 ngày, sáng ra mang xe tới gara là kỹ thuật viên tiếp nhận ngay, không phải xếp hàng chờ đợi. Rất chuyên nghiệp!",
    rating: 5,
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
            <span className="bg-amber-400 text-slate-950 font-bold px-2 py-0.5 rounded text-[10px] uppercase tracking-wide">
              Hotline 24/7
            </span>
            <span>Tổng đài Cứu hộ & Đặt lịch hẹn Gara: <strong>0243.872.5160</strong></span>
          </div>
          <div className="flex items-center gap-4 text-[11px] text-blue-100">
            <span>⏰ Mở cửa: 07:30 - 18:00 (Tất cả các ngày)</span>
            <span className="hidden md:inline">📍 185 Nguyễn Văn Cừ, Long Biên, Hà Nội</span>
          </div>
        </div>
      </div>

      {/* Main Navigation Header */}
      <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/90 backdrop-blur-md shadow-sm">
        <div className="mx-auto flex h-20 w-full max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-3 group">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 p-0.5 shadow-md shadow-blue-500/20 group-hover:scale-105 transition-transform duration-300">
              <div className="w-full h-full bg-white rounded-[14px] flex items-center justify-center">
                <Car className="size-6 text-blue-600" aria-hidden="true" />
              </div>
            </div>
            <div className="flex flex-col">
              <span className="font-extrabold text-2xl tracking-tight text-slate-900 group-hover:text-blue-600 transition-colors">
                AutoCare<span className="text-blue-600">.vn</span>
              </span>
              <span className="text-[10px] text-slate-500 font-bold tracking-widest uppercase -mt-1">
                Hệ Thống Gara Ô Tô Công Nghệ
              </span>
            </div>
          </Link>

          <nav aria-label="Điều hướng chính" className="hidden lg:flex items-center gap-8 text-sm font-semibold text-slate-700">
            <Link href="/" className="text-blue-600 font-bold hover:text-blue-700 transition-colors">Trang chủ</Link>
            <Link href="/dich-vu" className="hover:text-blue-600 transition-colors">Dịch vụ Gara</Link>
            <Link href="/ve-chung-toi" className="hover:text-blue-600 transition-colors">Về AutoCare</Link>
            <Link href="/tai-khoan" className="hover:text-blue-600 transition-colors">Cổng chủ xe</Link>
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

      <main>
        {/* HERO BANNER 1: High Impact Commercial Hero */}
        <section aria-labelledby="hero-title" className="relative pt-12 pb-20 lg:pt-16 lg:pb-28 overflow-hidden bg-gradient-to-b from-blue-50 via-indigo-50/30 to-slate-50">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
              {/* Left Column: Headlines & Call to actions */}
              <div className="lg:col-span-7 space-y-8 text-center lg:text-left">
                <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-blue-100 border border-blue-200 text-blue-800 text-xs font-bold tracking-wide shadow-sm">
                  <Award className="size-4 text-blue-600" />
                  <span>Gara Ô Tô Chuẩn 5 Sao • Minh Bạch Báo Giá 100%</span>
                </div>

                <h1
                  id="hero-title"
                  className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight text-slate-900 leading-[1.15]"
                >
                  Chăm sóc chiếc xe của bạn với <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-800">Công nghệ & Sự Minh bạch</span> tuyệt đối.
                </h1>

                <p className="text-lg sm:text-xl text-slate-600 max-w-2xl mx-auto lg:mx-0 font-medium leading-relaxed">
                  Đặt lịch bảo dưỡng trực tuyến, xem hình ảnh kiểm tra lỗi thực tế, phê duyệt báo giá từng hạng mục trên điện thoại và lưu giữ Hồ sơ sức khỏe xe điện tử trọn đời.
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
                    render={<Link href="/dich-vu" />}
                    className="w-full sm:w-auto h-14 px-8 text-base border-slate-300 bg-white hover:bg-slate-100 text-slate-800 font-bold rounded-2xl shadow-sm"
                  >
                    <Wrench className="size-5 mr-2 text-blue-600" />
                    <span>Xem Bảng Giá Dịch Vụ</span>
                  </Button>
                </div>

                {/* Hero Badges */}
                <div className="pt-8 border-t border-slate-200 grid grid-cols-3 gap-4 text-center lg:text-left">
                  <div className="space-y-1">
                    <p className="text-2xl font-black text-blue-600 font-mono">50.000+</p>
                    <p className="text-xs text-slate-500 font-semibold">Chủ xe tin tưởng</p>
                  </div>
                  <div className="space-y-1 border-x border-slate-200 px-4">
                    <p className="text-2xl font-black text-emerald-600 font-mono">100%</p>
                    <p className="text-xs text-slate-500 font-semibold">Minh bạch báo giá</p>
                  </div>
                  <div className="space-y-1">
                    <p className="text-2xl font-black text-amber-600 font-mono">4.9 ★</p>
                    <p className="text-xs text-slate-500 font-semibold">Đánh giá chất lượng</p>
                  </div>
                </div>
              </div>

              {/* Right Column: Dynamic Garage Showcase Card */}
              <div className="lg:col-span-5 relative">
                <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-2xl shadow-blue-900/10 space-y-6 relative z-10">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-blue-100 border border-blue-200 flex items-center justify-center text-blue-600 text-xl font-bold">
                        🏎️
                      </div>
                      <div>
                        <h3 className="font-extrabold text-base text-slate-900">Gara AutoCare Thành Đạt</h3>
                        <p className="text-xs text-slate-500 flex items-center gap-1 mt-0.5">
                          <MapPin className="size-3.5 text-red-500" /> 185 Nguyễn Văn Cừ, Hà Nội
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
                      <span className="text-blue-600">Khách duyệt trên điện thoại</span>
                    </div>

                    <div className="space-y-2 bg-slate-50 rounded-2xl p-4 border border-slate-200">
                      <div className="flex items-center justify-between text-xs p-2 rounded-xl bg-white border border-emerald-200 shadow-sm">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="size-4 text-emerald-600 shrink-0" />
                          <span className="font-medium text-slate-800">1. Thay nhớt Castrol EDGE 5W-30</span>
                        </div>
                        <span className="font-mono font-bold text-slate-900">750.000đ</span>
                      </div>

                      <div className="flex items-center justify-between text-xs p-2 rounded-xl bg-white border border-emerald-200 shadow-sm">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="size-4 text-emerald-600 shrink-0" />
                          <span className="font-medium text-slate-800">2. Thay má phanh trước chính hãng</span>
                        </div>
                        <span className="font-mono font-bold text-slate-900">1.150.000đ</span>
                      </div>

                      <div className="pt-2 border-t border-slate-200 flex justify-between items-center text-sm font-black text-slate-900">
                        <span>Tổng tiền đã duyệt:</span>
                        <span className="text-blue-600 font-mono text-base">1.900.000đ</span>
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
                        <p className="text-[11px] font-medium text-red-100 uppercase tracking-wide">Cứu hộ khẩn cấp 24/7</p>
                        <p className="text-lg font-black tracking-tight font-mono">0243.872.5160</p>
                      </div>
                    </div>
                    <span className="text-xs font-bold bg-white text-red-600 px-3 py-1.5 rounded-xl">Gọi Ngay</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* HERO BANNER 2: Services & Pricing Catalog Showcase */}
        <section aria-labelledby="services-heading" className="py-20 bg-white">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
              <span className="px-3.5 py-1.5 rounded-full bg-blue-100 text-blue-800 text-xs font-bold tracking-wide uppercase">
                Dịch vụ Gara Chuyên Nghiệp
              </span>
              <h2 id="services-heading" className="text-3xl sm:text-4xl font-black text-slate-900">
                Bảng Giá & Gói Dịch Vụ Bảo Dưỡng Xe
              </h2>
              <p className="text-slate-600 text-base">
                Mọi phụ tùng và công dịch vụ đều được niêm yết công khai. Cam kết không phát sinh chi phí ẩn.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              {SERVICES_PREVIEW.map((item, idx) => {
                const Icon = item.icon;
                return (
                  <div
                    key={idx}
                    className="group bg-slate-50 border border-slate-200 hover:border-blue-500/50 rounded-3xl p-6 shadow-sm hover:shadow-xl transition-all duration-300 flex flex-col justify-between hover:-translate-y-1.5"
                  >
                    <div className="space-y-4">
                      <div className="flex justify-between items-start">
                        <div className="w-12 h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20 group-hover:scale-110 transition-transform">
                          <Icon className="size-6" />
                        </div>
                        <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold border ${item.badgeBg}`}>
                          {item.badge}
                        </span>
                      </div>

                      <h3 className="font-bold text-lg text-slate-900 group-hover:text-blue-600 transition-colors">
                        {item.title}
                      </h3>

                      <p className="text-slate-600 text-xs leading-relaxed">
                        {item.desc}
                      </p>
                    </div>

                    <div className="pt-6 mt-6 border-t border-slate-200/80 flex items-center justify-between">
                      <div>
                        <span className="text-[10px] text-slate-400 font-semibold block uppercase">Giá niêm yết</span>
                        <span className="text-base font-black text-blue-600 font-mono">{item.price}</span>
                      </div>
                      <Button
                        size="sm"
                        render={<Link href="/tai-khoan/lich-hen/moi" />}
                        className="bg-slate-900 hover:bg-blue-600 text-white font-bold text-xs rounded-xl"
                      >
                        Đặt Lịch
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="mt-12 text-center">
              <Button
                size="lg"
                variant="outline"
                render={<Link href="/dich-vu" />}
                className="h-12 px-8 border-slate-300 text-slate-800 font-bold rounded-2xl hover:bg-blue-50 hover:text-blue-600"
              >
                <span>Xem Toàn Bộ Tất Cả Dịch Vụ</span>
                <ArrowRight className="size-4 ml-2" />
              </Button>
            </div>
          </div>
        </section>

        {/* HERO BANNER 3: Transparency & Online Quotation Feature */}
        <section aria-labelledby="transparency-heading" className="py-24 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white relative overflow-hidden">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
              <div className="lg:col-span-6 space-y-6">
                <span className="px-3.5 py-1.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30 text-xs font-bold tracking-wide uppercase">
                  Bảo vệ Quyền lợi Chủ Xe • Quy tắc 1 & 5
                </span>

                <h2 id="transparency-heading" className="text-3xl sm:text-4xl lg:text-5xl font-black text-white leading-tight">
                  Không còn lo bị ép sửa hay "vẽ thêm bệnh" ngoài ý muốn.
                </h2>

                <p className="text-slate-300 text-base leading-relaxed">
                  Tại AutoCare, kỹ thuật viên chỉ tiến hành công việc sau khi bạn đã xem kỹ báo giá và bấm **ĐỒNG Ý** trên điện thoại. Nếu chưa được duyệt, gara tuyệt đối không được tự ý sửa chữa.
                </p>

                <div className="space-y-3 pt-2">
                  <div className="flex items-start gap-3 bg-slate-800/60 p-4 rounded-2xl border border-slate-700/60">
                    <CheckCircle2 className="size-5 text-emerald-400 shrink-0 mt-0.5" />
                    <div className="text-sm">
                      <strong className="text-white block">Duyệt theo từng hạng mục riêng lẻ</strong>
                      <span className="text-slate-400 text-xs">Bạn có thể chọn thay nhớt nhưng từ chối thay lọc gió cabin nếu thấy chưa cần thiết.</span>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 bg-slate-800/60 p-4 rounded-2xl border border-slate-700/60">
                    <CheckCircle2 className="size-5 text-emerald-400 shrink-0 mt-0.5" />
                    <div className="text-sm">
                      <strong className="text-white block">Phát sinh hư hỏng phải có Báo giá bổ sung</strong>
                      <span className="text-slate-400 text-xs">Nếu phát hiện phát sinh trong lúc tháo máy, gara phải gửi báo giá bổ sung kèm hình ảnh xác minh.</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Interactive Phone Screen Mockup */}
              <div className="lg:col-span-6 flex justify-center">
                <div className="w-full max-w-sm bg-slate-950 border-4 border-slate-800 rounded-[40px] p-6 shadow-2xl space-y-4 relative">
                  <div className="w-20 h-4 bg-slate-800 rounded-full mx-auto mb-2" />
                  <div className="flex justify-between items-center text-xs text-slate-400 pb-2 border-b border-slate-800">
                    <span>📱 Báo giá trực tuyến AutoCare</span>
                    <span className="text-emerald-400 font-bold">Xác nhận 1-Touch</span>
                  </div>

                  <div className="bg-slate-900 rounded-2xl p-4 space-y-3 border border-slate-800">
                    <p className="text-xs font-bold text-slate-200">Hạng mục đề xuất sửa chữa:</p>
                    
                    <div className="flex justify-between items-center text-xs p-2.5 rounded-xl bg-slate-800 border border-slate-700">
                      <div className="flex items-center gap-2">
                        <input type="checkbox" defaultChecked className="rounded text-blue-600 focus:ring-0" />
                        <span className="text-slate-200">Thay dầu nhớt máy 4L</span>
                      </div>
                      <span className="font-mono text-emerald-400 font-bold">600.000đ</span>
                    </div>

                    <div className="flex justify-between items-center text-xs p-2.5 rounded-xl bg-slate-800 border border-slate-700">
                      <div className="flex items-center gap-2">
                        <input type="checkbox" defaultChecked className="rounded text-blue-600 focus:ring-0" />
                        <span className="text-slate-200">Bảo dưỡng cúp-lê phanh</span>
                      </div>
                      <span className="font-mono text-emerald-400 font-bold">350.000đ</span>
                    </div>
                  </div>

                  <button className="w-full py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm rounded-xl shadow-lg shadow-emerald-600/30">
                    ✓ ĐỒNG Ý THỰC HIỆN BÁO GIÁ
                  </button>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* HERO BANNER 4: Customer Testimonials & Reviews */}
        <section aria-labelledby="reviews-heading" className="py-24 bg-slate-50">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
              <span className="px-3.5 py-1.5 rounded-full bg-amber-100 text-amber-800 text-xs font-bold tracking-wide uppercase">
                Đánh giá Thực tế từ Chủ Xe
              </span>
              <h2 id="reviews-heading" className="text-3xl sm:text-4xl font-black text-slate-900">
                Hơn 50.000+ Chủ Xe Đã Hài Lòng
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {TESTIMONIALS.map((item, idx) => (
                <div
                  key={idx}
                  className="bg-white border border-slate-200 rounded-3xl p-8 shadow-sm hover:shadow-xl transition-all duration-300 space-y-4 flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    <div className="flex gap-1 text-amber-400">
                      {Array.from({ length: item.rating }).map((_, i) => (
                        <Star key={i} className="size-5 fill-amber-400" />
                      ))}
                    </div>
                    <p className="text-slate-700 text-sm italic leading-relaxed">
                      "{item.comment}"
                    </p>
                  </div>

                  <div className="pt-4 border-t border-slate-100">
                    <strong className="text-slate-900 font-bold text-sm block">{item.name}</strong>
                    <span className="text-xs text-blue-600 font-medium">{item.car}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* HERO BANNER 5: Final CTA & Quick Booking Teaser */}
        <section aria-label="Đăng ký trải nghiệm" className="py-20 bg-white">
          <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
            <div className="rounded-3xl bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 text-white p-10 sm:p-16 text-center shadow-2xl relative overflow-hidden">
              <h2 className="text-3xl sm:text-4xl font-black mb-4">
                Trải nghiệm Dịch vụ Chăm sóc Xe chuẩn Minh bạch ngay hôm nay!
              </h2>
              <p className="text-blue-100 text-base max-w-xl mx-auto mb-8 font-medium">
                Tạo tài khoản miễn phí để quản lý xe, đặt lịch ưu tiên và lưu trữ toàn bộ lịch sử sức khỏe xe của bạn.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Button
                  size="lg"
                  render={<Link href="/dang-ky" />}
                  className="w-full sm:w-auto h-13 px-8 bg-white hover:bg-slate-100 text-blue-700 font-black rounded-2xl shadow-lg"
                >
                  Đăng Ký Tài Khoản Miễn Phí
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  render={<Link href="/dich-vu" />}
                  className="w-full sm:w-auto h-13 px-8 border-white/40 bg-white/10 hover:bg-white/20 text-white font-bold rounded-2xl"
                >
                  Tham Khảo Dịch Vụ
                </Button>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-slate-200 bg-slate-900 text-slate-400 py-12 text-sm">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Car className="size-6 text-blue-400" />
                <span className="font-extrabold text-white text-xl">AutoCare.vn</span>
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                Hệ thống Gara Ô tô Công nghệ hàng đầu Việt Nam. Chăm sóc xe minh bạch, nhanh chóng và chuẩn xác.
              </p>
            </div>

            <div>
              <h4 className="font-bold text-white text-sm mb-3">Dịch vụ Gara</h4>
              <ul className="space-y-2 text-xs">
                <li><Link href="/dich-vu" className="hover:text-white transition-colors">Bảo dưỡng định kỳ</Link></li>
                <li><Link href="/dich-vu" className="hover:text-white transition-colors">Sửa chữa Động cơ - Hộp số</Link></li>
                <li><Link href="/dich-vu" className="hover:text-white transition-colors">Kiểm tra Phanh & Thước lái</Link></li>
                <li><Link href="/dich-vu" className="hover:text-white transition-colors">Sạc ga Điều hòa ô tô</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="font-bold text-white text-sm mb-3">Về AutoCare</h4>
              <ul className="space-y-2 text-xs">
                <li><Link href="/ve-chung-toi" className="hover:text-white transition-colors">Giới thiệu hệ thống</Link></li>
                <li><Link href="/tai-khoan" className="hover:text-white transition-colors">Tra cứu Hồ sơ sức khỏe xe</Link></li>
                <li><Link href="/dang-nhap" className="hover:text-white transition-colors">Cổng dành cho Nhân sự Gara</Link></li>
              </ul>
            </div>

            <div>
              <h4 className="font-bold text-white text-sm mb-3">Tổng đài Hỗ trợ</h4>
              <p className="text-xs text-slate-300">Hotline Cứu hộ 24/7:</p>
              <p className="text-lg font-black text-amber-400 font-mono">0243.872.5160</p>
              <p className="text-[11px] text-slate-500 mt-2">Email: cskh@autocare.vn</p>
            </div>
          </div>

          <div className="pt-8 border-t border-slate-800 text-xs text-center text-slate-500">
            © {new Date().getFullYear()} AutoCare.vn. Tất cả quyền được bảo lưu. Quy tắc bảo mật dữ liệu PII Rule 17.
          </div>
        </div>
      </footer>
    </div>
  );
}
