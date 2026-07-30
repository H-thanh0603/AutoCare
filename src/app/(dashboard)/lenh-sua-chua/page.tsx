import type { Metadata } from "next";
import Link from "next/link";
import { QrCode, Wrench } from "lucide-react";

import { listRepairOrders } from "@/data/repair-orders";
import { requireStaffPermissionPage } from "@/features/auth/guards";
import { repairOrderStatusLabel } from "@/features/repair-orders/labels";
import type { RepairOrderStatus } from "@/generated/prisma/enums";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

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

const FILTERABLE_STATUSES: RepairOrderStatus[] = [
  "RECEIVED",
  "INSPECTING",
  "WAITING_CUSTOMER_APPROVAL",
  "WAITING_PARTS",
  "IN_PROGRESS",
  "QUALITY_CHECK",
  "READY_FOR_DELIVERY",
  "COMPLETED",
  "CANCELLED",
];

function isStatus(value: string | undefined): value is RepairOrderStatus {
  return !!value && (FILTERABLE_STATUSES as string[]).includes(value);
}

function buildHref(params: { tt?: string; q?: string }): string {
  const search = new URLSearchParams();
  if (params.tt) search.set("tt", params.tt);
  if (params.q) search.set("q", params.q);
  const qs = search.toString();
  return qs ? `/lenh-sua-chua?${qs}` : "/lenh-sua-chua";
}

export default async function RepairOrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ tt?: string; q?: string }>;
}) {
  const { garageId } = await requireStaffPermissionPage(
    "/lenh-sua-chua",
    "repair-order:read",
  );
  const sp = await searchParams;
  const activeStatus = isStatus(sp.tt) ? sp.tt : undefined;
  const q = sp.q?.trim() || undefined;
  const orders = await listRepairOrders(garageId, {
    statuses: activeStatus ? [activeStatus] : undefined,
    search: q,
    take: 50,
  });

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Wrench className="size-6 text-blue-600" />
            <span>Quản lý Lệnh Sửa Chữa & Tiếp Nhận Xe</span>
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Toàn bộ danh sách lệnh sửa chữa tiếp nhận xưởng, mới nhất xếp trước.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            render={<Link href="/lenh-sua-chua/qr-checkin" />}
            className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-black text-xs h-11 px-5 rounded-2xl shadow-md shadow-blue-500/20"
          >
            <QrCode className="size-4 mr-1.5 text-amber-300" />
            <span>Quét QR Tiếp Nhận 1-Touch</span>
          </Button>
        </div>
      </div>

      {/* Search + status filter */}
      <div className="space-y-3">
        <form className="flex max-w-md gap-2" role="search">
          {activeStatus ? <input type="hidden" name="tt" value={activeStatus} /> : null}
          <Input name="q" defaultValue={q ?? ""} placeholder="Tìm theo mã lệnh, biển số hoặc tên khách" aria-label="Tìm lệnh sửa chữa" />
          <Button type="submit" variant="outline">Tìm</Button>
        </form>

        <div className="flex flex-wrap gap-2">
          <Link
            href={buildHref({ q })}
            className={`px-3 py-1 rounded-full text-xs font-bold border ${!activeStatus ? "bg-blue-600 text-white border-blue-600" : "bg-white text-slate-600 border-slate-200 hover:border-blue-300"}`}
          >
            Tất cả
          </Link>
          {FILTERABLE_STATUSES.map((status) => (
            <Link
              key={status}
              href={buildHref({ tt: status, q })}
              className={`px-3 py-1 rounded-full text-xs font-bold border ${activeStatus === status ? "bg-blue-600 text-white border-blue-600" : "bg-white text-slate-600 border-slate-200 hover:border-blue-300"}`}
            >
              {repairOrderStatusLabel(status)}
            </Link>
          ))}
        </div>
      </div>

      {orders.length === 0 ? (
        <Card className="rounded-3xl border-slate-200 shadow-sm">
          <CardContent className="text-slate-500 py-16 text-center text-sm space-y-2">
            <Wrench className="size-10 text-slate-400 mx-auto" />
            <p className="font-bold text-slate-800">
              {q || activeStatus ? "Không tìm thấy lệnh sửa chữa phù hợp" : "Chưa có lệnh sửa chữa nào"}
            </p>
            <p className="text-xs text-slate-500">
              {q || activeStatus
                ? "Thử bỏ bớt bộ lọc hoặc từ khóa tìm kiếm."
                : 'Bấm nút "Quét QR Tiếp Nhận 1-Touch" ở trên để tiếp nhận xe nhanh.'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card className="overflow-hidden p-0 rounded-3xl border-slate-200 shadow-sm">
          <ul className="divide-y divide-slate-100">
            {orders.map((order) => (
              <li key={order.id}>
                <Link
                  href={`/lenh-sua-chua/${order.id}`}
                  className="hover:bg-blue-50/50 flex flex-wrap items-center gap-x-4 gap-y-1 px-5 py-4 text-sm transition-colors"
                >
                  <span className="font-mono text-xs font-black text-slate-900">
                    {order.code}
                  </span>
                  <span className="font-black text-blue-600 font-mono">{order.vehicle.licensePlate}</span>
                  <span className="text-slate-600 text-xs font-medium">
                    {order.vehicle.brand} {order.vehicle.model}
                  </span>
                  <span className="text-slate-500 text-xs">{order.customer.name}</span>
                  <span className="ml-auto px-3 py-1 rounded-full text-xs font-extrabold bg-blue-100 text-blue-800 border border-blue-200">
                    {repairOrderStatusLabel(order.status)}
                  </span>
                  <span className="w-32 text-right text-xs text-slate-400 font-mono">
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
