import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Car } from "lucide-react";

import { LoginForm } from "@/features/auth/login-form";
import { getSessionUser } from "@/lib/auth";
import { isStaff } from "@/lib/rbac";
import { safeInternalPath } from "@/lib/utils";

export const metadata: Metadata = {
  title: "Đăng nhập · AutoCare.vn",
  description: "Đăng nhập vào AutoCare để quản lý gara hoặc theo dõi xe của bạn.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ "tiep-tuc"?: string }>;
}) {
  const next = safeInternalPath((await searchParams)["tiep-tuc"]);
  const user = await getSessionUser();
  if (user) {
    redirect(next ?? (isStaff(user) ? "/bang-dieu-khien" : "/tai-khoan"));
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
            Chào mừng bạn quay lại!
          </h1>
          <p className="text-xs font-medium text-slate-600">
            Đăng nhập để theo dõi lịch hẹn, duyệt báo giá hoặc quản lý xưởng gara.
          </p>
        </div>

        <LoginForm next={next ?? undefined} />

        <div className="text-center space-y-2 text-xs text-slate-600 font-medium">
          <p>
            Chưa có tài khoản chủ xe?{" "}
            <Link href={next ? `/dang-ky?tiep-tuc=${encodeURIComponent(next)}` : "/dang-ky"} className="font-bold text-blue-600 hover:text-blue-700 underline underline-offset-4">
              Tạo tài khoản mới ngay
            </Link>
          </p>
          <p className="text-[11px] text-slate-400">
            Tài khoản nhân sự gara do Quản lý gara cấp trực tiếp.
          </p>
        </div>
      </div>
    </main>
  );
}
