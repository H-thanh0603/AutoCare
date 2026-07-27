import type { Metadata } from "next";
import { ListChecks } from "lucide-react";

import { requireStaffPermissionPage } from "@/features/auth/guards";
import { ModulePlaceholder, PageHeader } from "@/features/dashboard/page-shell";

export const metadata: Metadata = {
  title: "Công việc · AutoCare",
};

export default async function WorkTasksPage() {
  await requireStaffPermissionPage("/cong-viec", "work-task:read");

  return (
    <div className="space-y-6">
      <PageHeader
        title="Công việc"
        description="Phân công kỹ thuật viên và theo dõi tiến độ từng hạng mục."
      />
      <ModulePlaceholder icon={ListChecks} milestone="Mốc 6 — Thi công & phụ tùng">
        Công việc chỉ được tạo từ hạng mục báo giá đã được khách duyệt. Phát sinh
        ngoài phạm vi phải qua báo giá bổ sung trước khi làm.
      </ModulePlaceholder>
    </div>
  );
}
