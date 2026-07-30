"use client";

import { useEffect } from "react";
import Link from "next/link";
import { AlertTriangle } from "lucide-react";

import { Button } from "@/components/ui/button";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[app-error]", error);
  }, [error]);

  return (
    <main className="min-h-dvh flex items-center justify-center bg-slate-50 p-4">
      <div className="max-w-md w-full rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm space-y-4">
        <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-amber-100 text-amber-600">
          <AlertTriangle className="size-6" aria-hidden="true" />
        </div>
        <h1 className="text-lg font-bold text-slate-900">Đã có lỗi xảy ra</h1>
        <p className="text-sm text-slate-500">
          Hệ thống gặp sự cố khi xử lý yêu cầu của bạn. Vui lòng thử lại hoặc quay về trang chính.
        </p>
        <div className="flex items-center justify-center gap-3 pt-2">
          <Button onClick={() => reset()}>Thử lại</Button>
          <Button variant="outline" render={<Link href="/" />}>
            Về trang chủ
          </Button>
        </div>
      </div>
    </main>
  );
}
