import type { Metadata } from "next";
import Link from "next/link";

import { listRepairOrders } from "@/data/repair-orders";
import { requireStaffPermissionPage } from "@/features/auth/guards";
import { PageHeader } from "@/features/dashboard/page-shell";
import { repairOrderStatusLabel } from "@/features/repair-orders/labels";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Lệnh sửa chữa · AutoCare",
};

const DATE_FORMATTER = new Intl.DateTimeFormat("vi-VN", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

export default async function RepairOrdersPage() {
  const { garageId } = await requireStaffPermissionPage(
    "/lenh-sua-chua",
    "repair-order:read",
  );
  const orders = await listRepairOrders(garageId, { take: 50 });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Lệnh sửa chữa"
        description="Toàn bộ lệnh sửa chữa của xưởng, mới nhất trước."
      />

      {orders.length === 0 ? (
        <Card>
          <CardContent className="text-muted-foreground py-12 text-center text-sm">
            Chưa có lệnh sửa chữa nào.
          </CardContent>
        </Card>
      ) : (
        <Card className="overflow-hidden p-0">
          <ul className="divide-y">
            {orders.map((order) => (
              <li key={order.id}>
                <Link
                  href={`/lenh-sua-chua/${order.id}`}
                  className="hover:bg-muted/60 focus-visible:bg-muted/60 flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3 text-sm transition-colors focus-visible:outline-none"
                >
                  <span className="text-muted-foreground font-mono text-xs">
                    {order.code}
                  </span>
                  <span className="font-medium">{order.vehicle.licensePlate}</span>
                  <span className="text-muted-foreground">
                    {order.vehicle.brand} {order.vehicle.model}
                  </span>
                  <span className="text-muted-foreground">{order.customer.name}</span>
                  <Badge variant="secondary" className="ml-auto">
                    {repairOrderStatusLabel(order.status)}
                  </Badge>
                  <span className="text-muted-foreground w-36 text-right text-xs tabular-nums">
                    {DATE_FORMATTER.format(order.receivedAt)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      )}
    </div>
  );
}
