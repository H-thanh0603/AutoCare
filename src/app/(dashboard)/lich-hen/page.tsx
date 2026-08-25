import type { Metadata } from "next";
import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { listGarageAppointments } from "@/data/appointments";
import { requireStaffPermissionPage } from "@/features/auth/guards";
import { GarageAppointmentActions } from "@/features/appointments/garage-appointment-actions";
import { appointmentStatusLabel } from "@/features/repair-orders/labels";
import { checkInAppointmentFormAction } from "@/features/repair-orders/actions";
import { can } from "@/lib/rbac";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle } from "lucide-react";

export const metadata: Metadata = { title: "Lịch hẹn · AutoCare" };

const DAY_FORMATTER = new Intl.DateTimeFormat("vi-VN", { weekday: "long", day: "2-digit", month: "2-digit", year: "numeric" });

/** Parses ?ngay=YYYY-MM-DD to a local day start; falls back to today. */
function parseDay(raw: string | undefined): Date {
  const day = new Date();
  day.setHours(0, 0, 0, 0);
  if (raw && /^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    const parsed = new Date(`${raw}T00:00:00`);
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }
  return day;
}

function toParam(date: Date): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export default async function AppointmentsPage({
  searchParams,
}: {
  searchParams: Promise<{ ngay?: string; error?: string }>;
}) {
  const params = await searchParams;
  const { user, garageId } = await requireStaffPermissionPage("/lich-hen", "appointment:read");
  const day = parseDay(params.ngay);

  const from = new Date(day);
  const to = new Date(day);
  to.setDate(to.getDate() + 1);

  const prev = new Date(day);
  prev.setDate(prev.getDate() - 1);
  const next = new Date(day);
  next.setDate(next.getDate() + 1);

  const appointments = await listGarageAppointments(garageId, { from, to });
  const canConfirm = can(user, "appointment:confirm");

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Lịch hẹn</h1>
          <p className="text-muted-foreground mt-1 text-sm capitalize">{DAY_FORMATTER.format(day)}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" render={<Link href={`/lich-hen?ngay=${toParam(prev)}`} />}>
            <ChevronLeft className="size-4" /> Ngày trước
          </Button>
          <Button variant="outline" size="sm" render={<Link href="/lich-hen" />}>
            Hôm nay
          </Button>
          <Button variant="outline" size="sm" render={<Link href={`/lich-hen?ngay=${toParam(next)}`} />}>
            Ngày sau <ChevronRight className="size-4" />
          </Button>
        </div>
      </div>

      {params.error ? (
        <Alert variant="destructive" role="alert">
          <AlertCircle className="size-4" aria-hidden="true" />
          <AlertDescription className="font-semibold">{params.error}</AlertDescription>
        </Alert>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Danh sách theo thời gian</CardTitle>
        </CardHeader>
        <CardContent>
          {appointments.length === 0 ? (
            <p className="text-muted-foreground text-sm">Không có lịch hẹn nào trong ngày.</p>
          ) : (
            <ul className="divide-y">
              {appointments.map((item) => (
                <li className="py-3 text-sm" key={item.id}>
                  <div className="flex flex-wrap items-center gap-3">
                    <div className="min-w-36">
                      <p className="font-medium">{item.scheduledAt.toLocaleString("vi-VN")}</p>
                      <p className="text-muted-foreground">{item.serviceRequest ?? "Chưa ghi nhu cầu"}</p>
                    </div>
                    <Badge variant="secondary">{appointmentStatusLabel(item.status)}</Badge>
                    {canConfirm ? (
                      <GarageAppointmentActions appointmentId={item.id} status={item.status} />
                    ) : null}
                  </div>
                  {canConfirm && item.status === "CONFIRMED" ? (
                    <details className="mt-3 rounded-lg border border-border p-3">
                      <summary className="cursor-pointer font-medium">Tiếp nhận xe</summary>
                      <div className="mt-3">
                        <form action={checkInAppointmentFormAction}>
                          <input type="hidden" name="appointmentId" value={item.id} />
                          <ReceptionFormFields />
                        </form>
                      </div>
                    </details>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function ReceptionFormFields() {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <label className="text-sm font-medium">
        Số km
        <input className="mt-1 h-8 w-full rounded-lg border border-input px-2" name="mileageKm" type="number" min="0" required />
      </label>
      <label className="text-sm font-medium">
        Nhiên liệu (%)
        <input className="mt-1 h-8 w-full rounded-lg border border-input px-2" name="fuelLevel" type="number" min="0" max="100" />
      </label>
      <label className="flex items-center gap-2 text-sm">
        <input name="exterior" type="checkbox" /> Đã kiểm tra ngoại thất
      </label>
      <label className="flex items-center gap-2 text-sm">
        <input name="documents" type="checkbox" /> Đã nhận giấy tờ
      </label>
      <div className="sm:col-span-2">
        <Button type="submit">Tạo lệnh sửa chữa</Button>
      </div>
    </div>
  );
}
