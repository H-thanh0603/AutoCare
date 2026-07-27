import type { Metadata } from "next";
import { Calendar } from "lucide-react";

import { requireStaffPermissionPage } from "@/features/auth/guards";
import { ModulePlaceholder, PageHeader } from "@/features/dashboard/page-shell";

export const metadata: Metadata = {
  title: "Lịch hẹn · AutoCare",
};

export default async function AppointmentsPage() {
  await requireStaffPermissionPage("/lich-hen", "appointment:read");

  return (
    <div className="space-y-6">
      <PageHeader
        title="Lịch hẹn"
        description="Đặt lịch, xác nhận và chuyển lịch hẹn thành lệnh sửa chữa."
      />
      <ModulePlaceholder icon={Calendar} milestone="Mốc 3 — Đặt lịch & tiếp nhận">
        Màn hình lịch hẹn sẽ hiển thị danh sách theo ngày, cho phép lễ tân xác nhận
        hoặc hủy, và tạo lệnh sửa chữa khi khách đến.
      </ModulePlaceholder>
    </div>
  );
}
