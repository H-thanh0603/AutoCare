import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Car } from "lucide-react";

import { LoginForm } from "@/features/auth/login-form";
import { getSessionUser } from "@/lib/auth";
import { isStaff } from "@/lib/rbac";

export const metadata: Metadata = {
  title: "Đăng nhập · AutoCare",
  description: "Đăng nhập vào AutoCare để quản lý gara hoặc theo dõi xe của bạn.",
};

export default async function LoginPage() {
  const user = await getSessionUser();
  if (user) {
    redirect(isStaff(user) ? "/bang-dieu-khien" : "/tai-khoan");
  }

  return (
    <main className="flex min-h-svh flex-col items-center justify-center gap-8 px-4 py-12">
      <Link
        href="/"
        className="flex items-center gap-2 text-lg font-semibold tracking-tight"
      >
        <Car className="size-6 text-primary" aria-hidden="true" />
        AutoCare
      </Link>

      <LoginForm />

      <p className="max-w-sm text-center text-xs text-muted-foreground">
        Chưa có tài khoản khách hàng?{" "}
        <Link href="/dang-ky" className="underline underline-offset-4">
          Đăng ký
        </Link>
        . Tài khoản nhân viên do quản lý gara cấp.
      </p>
    </main>
  );
}
