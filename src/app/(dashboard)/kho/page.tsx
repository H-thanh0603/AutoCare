import type { Metadata } from "next";
import { Package } from "lucide-react";

import { requireStaffPermissionPage } from "@/features/auth/guards";
import { ModulePlaceholder, PageHeader } from "@/features/dashboard/page-shell";

export const metadata: Metadata = {
  title: "Kho phụ tùng · AutoCare",
};

export default async function InventoryPage() {
  await requireStaffPermissionPage("/kho", "inventory:read");

  return (
    <div className="space-y-6">
      <PageHeader
        title="Kho phụ tùng"
        description="Tồn kho, xuất phụ tùng cho lệnh sửa chữa và điều chỉnh kiểm kê."
      />
      <ModulePlaceholder icon={Package} milestone="Mốc 6 — Thi công & phụ tùng">
        Tồn kho chỉ trừ khi thực sự xuất phụ tùng, trong cùng một giao dịch cơ sở dữ
        liệu. Bản MVP không cho tồn kho âm.
      </ModulePlaceholder>
    </div>
  );
}
