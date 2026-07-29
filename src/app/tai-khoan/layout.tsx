import { Bell, Car, ChevronRight, Home, LogOut, User, Wrench } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";

import { requireUserPage } from "@/features/auth/guards";
import { LogoutButton } from "@/features/auth/logout-button";
import { isStaff } from "@/lib/rbac";

export default async function PortalLayout({ children }: { children: ReactNode }) {
  const user = await requireUserPage("/tai-khoan");

  if (isStaff(user)) {
    redirect("/bang-dieu-khien");
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans selection:bg-blue-600 selection:text-white">
      {/* Top Header Navigation */}
      <header className="sticky top-0 z-40 border-b border-slate-200/80 bg-white/90 backdrop-blur-md shadow-sm">
        <div className="mx-auto flex h-20 w-full max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link href="/tai-khoan" className="flex items-center gap-3 group">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-600 p-0.5 shadow-md shadow-blue-500/20 group-hover:scale-105 transition-transform duration-300">
              <div className="w-full h-full bg-white rounded-[10px] flex items-center justify-center">
                <Car className="size-5 text-blue-600" aria-hidden />
              </div>
            </div>
            <div className="flex flex-col">
              <span className="font-extrabold text-xl tracking-tight text-slate-900">
                AutoCare<span className="text-blue-600">.vn</span>
              </span>
              <span className="text-[10px] text-blue-700 font-extrabold tracking-wider uppercase -mt-1">
                Portal Chủ Xe
              </span>
            </div>
          </Link>

          <nav className="hidden md:flex items-center gap-6 text-xs font-bold text-slate-600">
            <Link href="/" className="hover:text-blue-600 transition-colors flex items-center gap-1">
              <Home className="size-3.5" /> Trang chủ
            </Link>
            <Link href="/tai-khoan" className="text-blue-600 font-extrabold flex items-center gap-1">
              <Car className="size-3.5" /> Xe & Lịch hẹn
            </Link>
            <Link href="/tai-khoan/thong-bao" className="hover:text-blue-600 transition-colors flex items-center gap-1">
              <Bell className="size-3.5" /> Thông báo
            </Link>
          </nav>

          <div className="flex items-center gap-3">
            <Link
              href="/tai-khoan/thong-bao"
              className="relative p-2.5 rounded-xl border border-slate-200 bg-slate-50 hover:bg-blue-50 hover:border-blue-300 text-slate-700 hover:text-blue-600 transition-all shadow-sm"
              title="Thông báo"
            >
              <Bell className="size-4.5" />
            </Link>

            <div className="flex items-center gap-3 pl-3 border-l border-slate-200">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-600 to-indigo-600 text-white font-extrabold flex items-center justify-center text-sm shadow-md">
                {user.name ? user.name.charAt(0).toUpperCase() : "U"}
              </div>
              <div className="hidden sm:block text-left leading-snug">
                <div className="text-xs font-extrabold text-slate-900">{user.name}</div>
                <div className="text-[11px] text-slate-500 font-mono truncate max-w-[150px]">{user.email}</div>
              </div>
              <LogoutButton />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="mx-auto w-full max-w-6xl flex-1 p-4 sm:p-6 lg:p-8 space-y-8">{children}</main>

      <footer className="border-t border-slate-200 bg-white py-8 text-center text-xs font-medium text-slate-500 shadow-inner">
        © {new Date().getFullYear()} AutoCare.vn Portal. Dữ liệu hồ sơ xe được xác thực trực tiếp từ Gara và bảo mật theo Quy tắc 17.
      </footer>
    </div>
  );
}
