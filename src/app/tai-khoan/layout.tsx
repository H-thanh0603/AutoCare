import { Bell, Car, LogOut, User } from "lucide-react";
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
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-blue-500 selection:text-white">
      {/* Top Header Navigation */}
      <header className="sticky top-0 z-30 border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4 sm:px-6">
          <Link href="/tai-khoan" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 p-0.5 shadow-md shadow-blue-500/20 group-hover:scale-105 transition-transform duration-300">
              <div className="w-full h-full bg-slate-950 rounded-[9px] flex items-center justify-center">
                <Car className="size-4 text-blue-400" aria-hidden />
              </div>
            </div>
            <div className="flex flex-col">
              <span className="font-extrabold text-lg tracking-tight bg-gradient-to-r from-white to-slate-200 bg-clip-text text-transparent">
                AutoCare Portal
              </span>
              <span className="text-[10px] text-slate-400 font-medium tracking-wide uppercase -mt-1">
                Khu vực Chủ Xe
              </span>
            </div>
          </Link>

          <div className="flex items-center gap-4">
            <Link
              href="/tai-khoan/thong-bao"
              className="relative p-2 rounded-xl border border-slate-800 bg-slate-900/60 hover:bg-slate-800 text-slate-300 hover:text-white transition-colors"
              title="Thông báo"
            >
              <Bell className="size-4.5" />
            </Link>

            <div className="flex items-center gap-3 pl-3 border-l border-slate-800">
              <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 text-white font-bold flex items-center justify-center text-sm shadow-md">
                {user.name ? user.name.charAt(0).toUpperCase() : "U"}
              </div>
              <div className="hidden sm:block text-left leading-snug">
                <div className="text-sm font-semibold text-slate-100">{user.name}</div>
                <div className="text-[11px] text-slate-400 font-mono truncate max-w-[160px]">{user.email}</div>
              </div>
              <LogoutButton />
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="mx-auto w-full max-w-6xl flex-1 p-4 sm:p-6 lg:p-8 space-y-8">{children}</main>

      <footer className="border-t border-slate-800/80 bg-slate-950 py-6 text-center text-xs text-slate-500">
        © {new Date().getFullYear()} AutoCare Portal. Tất cả dữ liệu sức khỏe xe được bảo mật và xác thực trực tiếp từ Gara.
      </footer>
    </div>
  );
}
