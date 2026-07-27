import type { Metadata } from "next";
import { Receipt } from "lucide-react";

import { requireStaffPermissionPage } from "@/features/auth/guards";
import { ModulePlaceholder, PageHeader } from "@/features/dashboard/page-shell";

export const metadata: Metadata = {
  title: "Báo giá · AutoCare",
};

export default async function QuotationsPage() {
  await requireStaffPermissionPage("/bao-gia", "quotation:read");

  return (
    <div className="space-y-6">
      <PageHeader
        title="Báo giá"
        description="Lập báo giá từ kết quả kiểm tra, gửi khách và theo dõi duyệt từng mục."
      />
      <ModulePlaceholder icon={Receipt} milestone="Mốc 5 — Báo giá & duyệt">
        Báo giá đã gửi khách sẽ không sửa trực tiếp: mỗi thay đổi tạo một phiên bản
        mới. Khách duyệt hoặc từ chối từng mục, chỉ mục được duyệt mới sinh công việc.
      </ModulePlaceholder>
    </div>
  );
}
