import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Car } from "lucide-react";

import { RegisterForm } from "@/features/auth/register-form";
import { getSessionUser } from "@/lib/auth";
import { isStaff } from "@/lib/rbac";

export const metadata: Metadata = {
  title: "Đăng ký · AutoCare.vn",
  description: "Tạo tài khoản khách hàng để theo dõi lịch sử bảo dưỡng xe của bạn.",
};

export default async function RegisterPage() {
  const user = await getSessionUser();
  if (user) {
    redirect(isStaff(user) ? "/bang-dieu-khien" : "/tai-khoan");
  }

  return (
    <main className="relative min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50/50 to-slate-100 text-slate-900 flex flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-md space-y-6 relative z-10">
        <div className="text-center space-y-3">
          <Link
            href="/"
            className="inline-flex items-center gap-3 group"
          >
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 p-0.5 shadow-md shadow-blue-500/20 group-hover:scale-105 transition-transform duration-300">
              <div className="w-full h-full bg-white rounded-[14px] flex items-center justify-center">
                <Car className="size-6 text-blue-600" aria-hidden="true" />
              </div>
            </div>
            <span className="font-extrabold text-2xl tracking-tight text-slate-900">
              AutoCare<span className="text-blue-600">.vn</span>
            </span>
          </Link>

          <h1 className="text-2xl font-black text-slate-900 tracking-tight">
            Tạo tài khoản Chủ Xe
          </h1>
          <p className="text-xs font-medium text-slate-600">
            Đặt lịch trực tuyến, duyệt báo giá minh bạch và lưu giữ Hồ sơ sức khỏe xe điện tử.
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-3xl p-6 sm:p-8 shadow-2xl">
          <RegisterForm />
        </div>

        <p className="text-center text-xs font-medium text-slate-600">
          Đã có tài khoản?{" "}
          <Link href="/dang-nhap" className="font-bold text-blue-600 hover:text-blue-700 underline underline-offset-4">
            Đăng nhập ngay
          </Link>
        </p>
      </div>
    </main>
  );
}
