import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Không có kết nối mạng",
};

export default function OfflinePage() {
  return (
    <main className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center gap-4 p-6 text-center">
      <h1 className="text-xl font-bold">Không có kết nối mạng</h1>
      <p className="text-muted-foreground text-sm">
        AutoCare cần mạng để tải dữ liệu mới nhất. Vui lòng kiểm tra kết nối và thử
        lại.
      </p>
      <Link
        href="/bang-dieu-khien"
        className="rounded-lg border px-4 py-2 text-sm font-medium"
      >
        Thử lại
      </Link>
    </main>
  );
}
