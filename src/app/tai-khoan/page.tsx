/**
 * Customer portal home.
 *
 * Everything shown here is resolved from the session user id via `@/data/portal`.
 * No garage, customer or vehicle id ever comes from the URL or the client.
 */

import type { Metadata } from "next";
import Link from "next/link";
import { CalendarClock, Car, Wrench } from "lucide-react";

import {
  listPortalAppointments,
  listPortalRepairOrders,
  listPortalVehicles,
} from "@/data/portal";
import { requireUserPage } from "@/features/auth/guards";
import {
  appointmentStatusLabel,
  repairOrderStatusLabel,
} from "@/features/repair-orders/labels";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = {
  title: "Tài khoản của tôi · AutoCare",
};

const DATE_TIME_FORMATTER = new Intl.DateTimeFormat("vi-VN", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

const KM_FORMATTER = new Intl.NumberFormat("vi-VN");

export default async function PortalPage() {
  const user = await requireUserPage("/tai-khoan");

  const [vehicles, appointments, orders] = await Promise.all([
    listPortalVehicles(user.id),
    listPortalAppointments(user.id, { take: 5 }),
    listPortalRepairOrders(user.id, { take: 5 }),
  ]);

  const hasAnything =
    vehicles.length > 0 || appointments.length > 0 || orders.length > 0;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          Xin chào, {user.name}
        </h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Xe, lịch hẹn và lịch sử sửa chữa của bạn.
        </p>
      </div>

      {!hasAnything && (
        <Card>
          <CardContent className="text-muted-foreground py-10 text-center text-sm">
            Tài khoản của bạn chưa được liên kết với xe nào. Khi bạn mang xe đến một
            gara dùng AutoCare, hồ sơ xe sẽ tự động xuất hiện ở đây.
          </CardContent>
        </Card>
      )}

      <section aria-labelledby="portal-vehicles-heading" className="space-y-3">
        <h2 id="portal-vehicles-heading" className="text-lg font-semibold">
          Xe của tôi
        </h2>

        {vehicles.length === 0 ? (
          <Card>
            <CardContent className="text-muted-foreground py-8 text-center text-sm">
              Chưa có xe nào.
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {vehicles.map((vehicle) => (
              <Card key={vehicle.id}>
                <CardHeader className="flex-row items-center justify-between gap-2 space-y-0">
                  <CardTitle className="text-base">{vehicle.licensePlate}</CardTitle>
                  <Car className="text-muted-foreground size-4" aria-hidden />
                </CardHeader>
                <CardContent className="space-y-1 text-sm">
                  <p>
                    {vehicle.brand} {vehicle.model}
                    {vehicle.year ? ` · ${vehicle.year}` : ""}
                  </p>
                  <p className="text-muted-foreground">
                    {vehicle.currentKm === null
                      ? "Chưa ghi nhận số km"
                      : `${KM_FORMATTER.format(vehicle.currentKm)} km`}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </section>

      <section aria-labelledby="portal-appointments-heading" className="space-y-3">
        <div className="flex items-center justify-between gap-3">
          <h2 id="portal-appointments-heading" className="text-lg font-semibold">
            Lịch hẹn
          </h2>
          <Link href="/tai-khoan/lich-hen/moi" className="text-sm font-medium underline underline-offset-4">
            Đặt lịch
          </Link>
        </div>

        {appointments.length === 0 ? (
          <Card>
            <CardContent className="text-muted-foreground py-8 text-center text-sm">
              Bạn chưa có lịch hẹn nào.
            </CardContent>
          </Card>
        ) : (
          <Card className="overflow-hidden p-0">
            <ul className="divide-y">
              {appointments.map((appointment) => (
                <li
                  key={appointment.id}
                  className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3 text-sm"
                >
                  <CalendarClock
                    className="text-muted-foreground size-4 shrink-0"
                    aria-hidden
                  />
                  <span className="font-medium tabular-nums">
                    {DATE_TIME_FORMATTER.format(appointment.scheduledAt)}
                  </span>
                  <span>{appointment.vehicle.licensePlate}</span>
                  <span className="text-muted-foreground truncate">
                    {appointment.garage.name}
                  </span>
                  <Badge variant="secondary" className="ml-auto">
                    {appointmentStatusLabel(appointment.status)}
                  </Badge>
                </li>
              ))}
            </ul>
          </Card>
        )}
      </section>

      <section aria-labelledby="portal-orders-heading" className="space-y-3">
        <h2 id="portal-orders-heading" className="text-lg font-semibold">
          Lệnh sửa chữa
        </h2>

        {orders.length === 0 ? (
          <Card>
            <CardContent className="text-muted-foreground py-8 text-center text-sm">
              Chưa có lệnh sửa chữa nào.
            </CardContent>
          </Card>
        ) : (
          <Card className="overflow-hidden p-0">
            <ul className="divide-y">
              {orders.map((order) => (
                <li
                  key={order.id}
                  className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3 text-sm"
                >
                  <Wrench
                    className="text-muted-foreground size-4 shrink-0"
                    aria-hidden
                  />
                  <span className="text-muted-foreground font-mono text-xs">
                    {order.code}
                  </span>
                  <span className="font-medium">{order.vehicle.licensePlate}</span>
                  <span className="text-muted-foreground truncate">
                    {order.garage.name}
                  </span>
                  <Badge variant="secondary" className="ml-auto">
                    {repairOrderStatusLabel(order.status)}
                  </Badge>
                  <span className="text-muted-foreground w-24 text-right text-xs tabular-nums">
                    {DATE_TIME_FORMATTER.format(order.receivedAt)}
                  </span>
                </li>
              ))}
            </ul>
          </Card>
        )}
      </section>

      <p className="text-muted-foreground text-xs">
        Cần hỗ trợ? Liên hệ trực tiếp gara đang phục vụ xe của bạn.{" "}
        <Link href="/" className="underline underline-offset-4">
          Về trang chủ
        </Link>
      </p>
    </div>
  );
}
