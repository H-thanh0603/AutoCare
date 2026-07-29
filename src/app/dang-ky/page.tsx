import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Car, Sparkles } from "lucide-react";

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
    <main className="relative min-h-screen bg-slate-950 text-slate-100 flex flex-col items-center justify-center px-4 py-12 selection:bg-blue-500 selection:text-white">
      {/* Ambient background glows */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute top-1/4 left-1/3 w-96 h-96 bg-blue-600/20 rounded-full blur-[128px]" />
        <div className="absolute bottom-10 right-1/3 w-80 h-80 bg-indigo-600/15 rounded-full blur-[128px]" />
      </div>

      <div className="relative z-10 w-full max-w-md space-y-6">
        <div className="text-center space-y-3">
          <Link
            href="/"
            className="inline-flex items-center gap-2.5 group"
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 p-0.5 shadow-lg shadow-blue-500/25 group-hover:scale-105 transition-transform duration-300">
              <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
                <Car className="size-5 text-blue-400" aria-hidden="true" />
              </div>
            </div>
            <span className="font-extrabold text-2xl tracking-tight bg-gradient-to-r from-white via-slate-200 to-blue-400 bg-clip-text text-transparent">
              AutoCare
            </span>
          </Link>

          <h1 className="text-2xl font-bold text-white tracking-tight">
            Tạo tài khoản Chủ Xe
          </h1>
          <p className="text-sm text-slate-400">
            Đặt lịch trực tuyến, duyệt báo giá minh bạch và lưu giữ Hồ sơ sức khỏe xe điện tử.
          </p>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 sm:p-8 shadow-2xl backdrop-blur-xl">
          <RegisterForm />
        </div>

        <p className="text-center text-xs text-slate-400">
          Đã có tài khoản?{" "}
          <Link href="/dang-nhap" className="font-medium text-blue-400 hover:text-blue-300 underline underline-offset-4">
            Đăng nhập ngay
          </Link>
        </p>
      </div>
    </main>
  );
}
