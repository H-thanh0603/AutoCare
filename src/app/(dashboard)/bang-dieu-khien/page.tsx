import type { Metadata } from "next";
import Link from "next/link";
import {
  AlertTriangle,
  Banknote,
  CalendarClock,
  CheckCircle2,
  Package,
  Wrench,
} from "lucide-react";

import { getDashboardSummary } from "@/data/dashboard";
import { listRepairOrders } from "@/data/repair-orders";
import { OPEN_REPAIR_ORDER_STATUSES } from "@/data/dashboard";
import { requireStaffPage } from "@/features/auth/guards";
import { repairOrderStatusLabel } from "@/features/repair-orders/labels";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Tổng quan · AutoCare",
};

const DATE_FORMATTER = new Intl.DateTimeFormat("vi-VN", {
  day: "2-digit",
  month: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
});

export default async function DashboardPage() {
  const { garageId } = await requireStaffPage("/bang-dieu-khien");

  const [summary, orders] = await Promise.all([
    getDashboardSummary(garageId),
    listRepairOrders(garageId, { statuses: OPEN_REPAIR_ORDER_STATUSES, take: 8 }),
  ]);

  const cards = [
    {
      label: "Đang sửa chữa",
      value: summary.openOrders,
      icon: Wrench,
      href: "/lenh-sua-chua",
    },
    {
      label: "Chờ khách duyệt",
      value: summary.waitingApproval,
      icon: AlertTriangle,
      href: "/bao-gia",
    },
    {
      label: "Chờ giao xe",
      value: summary.readyForDelivery,
      icon: CheckCircle2,
      href: "/lenh-sua-chua",
    },
    {
      label: "Lịch hẹn hôm nay",
      value: summary.appointmentsToday,
      icon: CalendarClock,
      href: "/lich-hen",
    },
    {
      label: "Phụ tùng sắp hết",
      value: summary.lowStockParts,
      icon: Package,
      href: "/kho",
    },
    {
      label: "Hóa đơn chưa thu",
      value: summary.unpaidInvoices,
      icon: Banknote,
      href: "/hoa-don",
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Tổng quan</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Tình hình xưởng hôm nay.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((card) => (
          <Link
            key={card.label}
            href={card.href}
            className="rounded-xl outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            <Card className="h-full transition-colors hover:border-primary/40">
              <CardHeader className="flex-row items-center justify-between gap-2 space-y-0">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {card.label}
                </CardTitle>
                <card.icon className="size-4 text-muted-foreground" aria-hidden />
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-semibold tabular-nums">{card.value}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <section aria-labelledby="open-orders-heading" className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 id="open-orders-heading" className="text-lg font-semibold">
            Lệnh sửa chữa đang mở
          </h2>
          <Link
            href="/lenh-sua-chua"
            className="text-sm text-primary underline-offset-4 hover:underline"
          >
            Xem tất cả
          </Link>
        </div>

        {orders.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center text-sm text-muted-foreground">
              Chưa có lệnh sửa chữa nào đang mở.
            </CardContent>
          </Card>
        ) : (
          <Card className="overflow-hidden p-0">
            <ul className="divide-y">
              {orders.map((order) => (
                <li key={order.id}>
                  <Link
                    href={`/lenh-sua-chua/${order.id}`}
                    className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3 text-sm transition-colors hover:bg-muted/60 focus-visible:bg-muted/60 focus-visible:outline-none"
                  >
                    <span className="font-mono text-xs text-muted-foreground">
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
                    <span className="w-28 text-right text-xs text-muted-foreground tabular-nums">
                      {DATE_FORMATTER.format(order.receivedAt)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </Card>
        )}
      </section>
    </div>
  );
}
