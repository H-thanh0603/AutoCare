import Link from "next/link";
import {
  CalendarCheck,
  Car,
  ClipboardCheck,
  FileText,
  ShieldCheck,
  Wrench,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { getSessionUser } from "@/lib/auth";
import { isStaff } from "@/lib/rbac";

const CUSTOMER_FEATURES = [
  {
    icon: CalendarCheck,
    title: "Đặt lịch không cần gọi điện",
    body: "Chọn gara, dịch vụ và giờ hẹn. Gara xác nhận lại và bạn nhận thông báo ngay trên tài khoản.",
  },
  {
    icon: FileText,
    title: "Duyệt báo giá từng hạng mục",
    body: "Xem rõ từng công việc và phụ tùng kèm giá. Đồng ý phần nào thì gara chỉ làm đúng phần đó.",
  },
  {
    icon: Car,
    title: "Hồ sơ sức khỏe xe",
    body: "Toàn bộ lịch sử bảo dưỡng, sửa chữa, phụ tùng đã thay và mốc km đi theo chiếc xe, không đi theo chủ xe.",
  },
] as const;

const GARAGE_FEATURES = [
  {
    icon: Wrench,
    title: "Luồng xưởng rõ ràng",
    body: "Tiếp nhận, kiểm tra, báo giá, phân công kỹ thuật viên, xuất phụ tùng, kiểm tra chất lượng rồi mới giao xe.",
  },
  {
    icon: ClipboardCheck,
    title: "Không làm việc chưa được duyệt",
    body: "Công việc chỉ sinh ra từ hạng mục khách đã đồng ý. Phát sinh thêm phải có báo giá bổ sung.",
  },
  {
    icon: ShieldCheck,
    title: "Phân quyền theo vai trò",
    body: "Lễ tân, kỹ thuật viên, thu ngân và quản lý mỗi người thấy đúng phần việc của mình.",
  },
] as const;

export default async function HomePage() {
  const user = await getSessionUser();
  const portalHref = user ? (isStaff(user) ? "/bang-dieu-khien" : "/tai-khoan") : null;

  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4">
          <span className="flex items-center gap-2 font-heading text-lg font-semibold">
            <Car className="size-5 text-primary" aria-hidden="true" />
            AutoCare
          </span>

          <nav aria-label="Điều hướng chính" className="flex items-center gap-2">
            {portalHref ? (
              <Button render={<Link href={portalHref} />}>Vào hệ thống</Button>
            ) : (
              <>
                <Button variant="ghost" render={<Link href="/dang-nhap" />}>
                  Đăng nhập
                </Button>
                <Button render={<Link href="/dang-ky" />}>Tạo tài khoản</Button>
              </>
            )}
          </nav>
        </div>
      </header>

      <main className="flex-1">
        <section
          aria-labelledby="hero-heading"
          className="mx-auto w-full max-w-6xl px-4 py-20"
        >
          <div className="max-w-2xl space-y-6">
            <p className="text-sm font-medium text-primary">
              Quản lý gara &amp; hồ sơ sức khỏe xe
            </p>
            <h1
              id="hero-heading"
              className="font-heading text-4xl font-semibold tracking-tight sm:text-5xl"
            >
              Sửa xe minh bạch, từ lúc đặt lịch tới lúc nhận xe
            </h1>
            <p className="text-lg text-muted-foreground">
              AutoCare cho khách hàng thấy rõ xe mình đang được làm gì, giá bao
              nhiêu và vì sao, đồng thời cho gara một quy trình xưởng chặt chẽ
              thay vì sổ tay và tin nhắn rời rạc.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button size="lg" render={<Link href="/dang-ky" />}>
                Bắt đầu với tài khoản khách hàng
              </Button>
              <Button size="lg" variant="outline" render={<Link href="/dang-nhap" />}>
                Tôi là nhân sự gara
              </Button>
            </div>
          </div>
        </section>

        <section
          aria-labelledby="customer-heading"
          className="border-t bg-muted/30"
        >
          <div className="mx-auto w-full max-w-6xl px-4 py-16">
            <h2 id="customer-heading" className="font-heading text-2xl font-semibold">
              Dành cho chủ xe
            </h2>
            <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {CUSTOMER_FEATURES.map(({ icon: Icon, title, body }) => (
                <article key={title} className="space-y-3">
                  <Icon className="size-6 text-primary" aria-hidden="true" />
                  <h3 className="font-heading text-base font-medium">{title}</h3>
                  <p className="text-sm text-muted-foreground">{body}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        <section aria-labelledby="garage-heading" className="border-t">
          <div className="mx-auto w-full max-w-6xl px-4 py-16">
            <h2 id="garage-heading" className="font-heading text-2xl font-semibold">
              Dành cho gara
            </h2>
            <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {GARAGE_FEATURES.map(({ icon: Icon, title, body }) => (
                <article key={title} className="space-y-3">
                  <Icon className="size-6 text-primary" aria-hidden="true" />
                  <h3 className="font-heading text-base font-medium">{title}</h3>
                  <p className="text-sm text-muted-foreground">{body}</p>
                </article>
              ))}
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t">
        <div className="mx-auto w-full max-w-6xl space-y-2 px-4 py-8 text-sm text-muted-foreground">
          <p>
            Hồ sơ sức khỏe xe ghi lại những gì gara đã kiểm tra và thực hiện. Đây
            là tư liệu tham khảo, không phải giấy chứng nhận an toàn kỹ thuật.
          </p>
          <p>© {new Date().getFullYear()} AutoCare</p>
        </div>
      </footer>
    </div>
  );
}
