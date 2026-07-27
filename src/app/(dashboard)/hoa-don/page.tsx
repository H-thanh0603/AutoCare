import type { Metadata } from "next";
import { Banknote } from "lucide-react";

import { requireStaffPermissionPage } from "@/features/auth/guards";
import { ModulePlaceholder, PageHeader } from "@/features/dashboard/page-shell";

export const metadata: Metadata = {
  title: "Hóa đơn · AutoCare",
};

export default async function InvoicesPage() {
  await requireStaffPermissionPage("/hoa-don", "invoice:read");

  return (
    <div className="space-y-6">
      <PageHeader
        title="Hóa đơn"
        description="Xuất hóa đơn từ công việc đã hoàn tất và ghi nhận thanh toán."
      />
      <ModulePlaceholder icon={Banknote} milestone="Mốc 7 — Hóa đơn & thanh toán">
        Hóa đơn, thanh toán và tồn kho được ghi trong cùng giao dịch để số liệu luôn
        khớp. Hệ thống không lưu thông tin thẻ ngân hàng.
      </ModulePlaceholder>
    </div>
  );
}
