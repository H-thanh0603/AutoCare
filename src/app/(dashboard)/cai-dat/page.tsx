import type { Metadata } from "next";
import { Settings } from "lucide-react";

import { getGarageById } from "@/data/garages";
import { requireStaffPermissionPage } from "@/features/auth/guards";
import { ModulePlaceholder, PageHeader } from "@/features/dashboard/page-shell";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Cài đặt · AutoCare",
};

export default async function SettingsPage() {
  const { garageId } = await requireStaffPermissionPage("/cai-dat", "garage-member:read");
  const garage = await getGarageById(garageId);

  const rows: readonly { label: string; value: string }[] = [
    { label: "Tên gara", value: garage.name },
    { label: "Điện thoại", value: garage.phone ?? "Chưa có" },
    { label: "Địa chỉ", value: garage.address ?? "Chưa có" },
    { label: "Email", value: garage.email ?? "Chưa có" },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Cài đặt"
        description="Thông tin gara và quản lý nhân sự."
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Thông tin gara</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="divide-y text-sm">
            {rows.map((row) => (
              <div key={row.label} className="flex gap-4 py-2">
                <dt className="text-muted-foreground w-32 shrink-0">{row.label}</dt>
                <dd className="min-w-0 break-words">{row.value}</dd>
              </div>
            ))}
          </dl>
        </CardContent>
      </Card>

      <ModulePlaceholder icon={Settings} milestone="Mốc 9 — Hoàn thiện">
        Quản lý nhân sự, phân vai trò và sửa thông tin gara sẽ bổ sung ở mốc sau.
      </ModulePlaceholder>
    </div>
  );
}
