import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Car } from "lucide-react";

import { RegisterForm } from "@/features/auth/register-form";
import { getSessionUser } from "@/lib/auth";
import { isStaff } from "@/lib/rbac";

export const metadata: Metadata = {
  title: "Đăng ký · AutoCare",
  description: "Tạo tài khoản khách hàng để theo dõi lịch sử bảo dưỡng xe của bạn.",
};

export default async function RegisterPage() {
  const user = await getSessionUser();
  if (user) {
    redirect(isStaff(user) ? "/bang-dieu-khien" : "/tai-khoan");
  }

  return (
    <main className="flex flex-1 items-center justify-center px-4 py-12">
      <div className="w-full max-w-md space-y-8">
        <div className="space-y-2 text-center">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-lg font-semibold tracking-tight"
          >
            <Car className="size-6 text-primary" aria-hidden="true" />
            AutoCare
          </Link>
          <h1 className="text-2xl font-semibold tracking-tight">Tạo tài khoản</h1>
          <p className="text-sm text-muted-foreground">
            Theo dõi lịch hẹn, báo giá và hồ sơ sức khỏe xe của bạn ở một nơi.
          </p>
        </div>

        <RegisterForm />

        <p className="text-center text-sm text-muted-foreground">
          Đã có tài khoản?{" "}
          <Link href="/dang-nhap" className="font-medium text-primary hover:underline">
            Đăng nhập
          </Link>
        </p>
      </div>
    </main>
  );
}
