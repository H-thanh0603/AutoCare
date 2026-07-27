import type { Metadata } from "next";
import Link from "next/link";
import { ShieldAlert } from "lucide-react";

import { getSessionUser } from "@/lib/auth";
import { isStaff } from "@/lib/rbac";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = {
  title: "Không có quyền truy cập · AutoCare",
};

/**
 * Shown when a signed-in user reaches an area their role does not cover.
 *
 * Deliberately vague: it does not say whether the resource exists, only that
 * this account cannot open it.
 */
export default async function ForbiddenPage() {
  const user = await getSessionUser();
  const home = user ? (isStaff(user) ? "/bang-dieu-khien" : "/tai-khoan") : "/dang-nhap";

  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-16">
      <div className="w-full max-w-md space-y-6 text-center">
        <div className="mx-auto flex size-14 items-center justify-center rounded-full bg-destructive/10">
          <ShieldAlert className="size-7 text-destructive" aria-hidden="true" />
        </div>

        <div className="space-y-2">
          <h1 className="font-heading text-2xl font-semibold">
            Bạn không có quyền vào khu vực này
          </h1>
          <p className="text-sm text-muted-foreground">
            Tài khoản của bạn không được cấp quyền cho trang vừa mở. Nếu bạn cho
            rằng đây là nhầm lẫn, hãy liên hệ quản lý gara để được cấp lại quyền.
          </p>
        </div>

        <Button render={<Link href={home} />}>Về trang chính</Button>
      </div>
    </main>
  );
}
