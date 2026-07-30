"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle } from "lucide-react";

import { Button } from "@/components/ui/button";

export default function PortalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[portal-error]", error);
  }, [error]);

  return (
    <div className="mx-auto max-w-md rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-sm space-y-4">
      <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-amber-100 text-amber-600">
        <AlertTriangle className="size-6" aria-hidden="true" />
      </div>
      <h1 className="text-lg font-bold text-slate-900">Không tải được nội dung</h1>
      <p className="text-sm text-slate-500">
        Đã có lỗi khi tải dữ liệu tài khoản của bạn. Vui lòng thử lại.
      </p>
      <div className="flex items-center justify-center gap-3 pt-2">
        <Button onClick={() => reset()}>Thử lại</Button>
        <Button variant="outline" render={<Link href="/tai-khoan" />}>
          Về trang tài khoản
        </Button>
      </div>
    </div>
  );
}
