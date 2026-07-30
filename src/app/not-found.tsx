import Link from "next/link";
import { Compass } from "lucide-react";

import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="min-h-dvh flex items-center justify-center bg-slate-50 p-4">
      <div className="max-w-md w-full rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm space-y-4">
        <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-blue-100 text-blue-600">
          <Compass className="size-6" aria-hidden="true" />
        </div>
        <h1 className="text-lg font-bold text-slate-900">Không tìm thấy trang</h1>
        <p className="text-sm text-slate-500">
          Trang bạn tìm không tồn tại hoặc đã được di chuyển.
        </p>
        <div className="pt-2">
          <Button render={<Link href="/" />}>Về trang chủ</Button>
        </div>
      </div>
    </main>
  );
}
