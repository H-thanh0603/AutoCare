import type { Metadata } from "next";

import { listGarageAppointments } from "@/data/appointments";
import { requireStaffPermissionPage } from "@/features/auth/guards";
import { appointmentStatusLabel } from "@/features/repair-orders/labels";
import {
  cancelGarageAppointmentFormAction,
  confirmAppointmentFormAction,
  noShowAppointmentFormAction,
} from "@/features/appointments/actions";
import { checkInAppointmentFormAction } from "@/features/repair-orders/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = { title: "Lịch hẹn · AutoCare" };

export default async function AppointmentsPage() {
  const { user, garageId } = await requireStaffPermissionPage("/lich-hen", "appointment:read");
  const from = new Date();
  from.setHours(0, 0, 0, 0);
  const to = new Date(from);
  to.setDate(to.getDate() + 1);
  const appointments = await listGarageAppointments(garageId, { from, to });
  const canConfirm = user.garageRole === "RECEPTIONIST" || user.garageRole === "GARAGE_MANAGER";

  return <div className="space-y-6"><div><h1 className="text-2xl font-semibold">Lịch hẹn hôm nay</h1><p className="text-muted-foreground mt-1 text-sm">Xác nhận, hủy, ghi nhận no-show hoặc tiếp nhận khách.</p></div><Card><CardHeader><CardTitle>Danh sách theo thời gian</CardTitle></CardHeader><CardContent>{appointments.length === 0 ? <p className="text-muted-foreground text-sm">Chưa có lịch hẹn hôm nay.</p> : <ul className="divide-y">{appointments.map((item) => <li className="py-3 text-sm" key={item.id}><div className="flex flex-wrap items-center gap-3"><div className="min-w-36"><p className="font-medium">{item.scheduledAt.toLocaleString("vi-VN")}</p><p className="text-muted-foreground">{item.serviceRequest ?? "Chưa ghi nhu cầu"}</p></div><Badge variant="secondary">{appointmentStatusLabel(item.status)}</Badge>{canConfirm && item.status === "PENDING" ? <form action={confirmAppointmentFormAction}><input type="hidden" name="appointmentId" value={item.id} /><Button size="sm" type="submit">Xác nhận</Button></form> : null}{canConfirm && item.status === "CONFIRMED" ? <><form action={noShowAppointmentFormAction}><input type="hidden" name="appointmentId" value={item.id} /><Button size="sm" variant="outline" type="submit">No-show</Button></form><form action={cancelGarageAppointmentFormAction}><input type="hidden" name="appointmentId" value={item.id} /><input type="hidden" name="reason" value="Gara hủy lịch" /><Button size="sm" variant="outline" type="submit">Hủy</Button></form></> : null}</div>{canConfirm && item.status === "CONFIRMED" ? <details className="mt-3 rounded-lg border border-border p-3"><summary className="cursor-pointer font-medium">Tiếp nhận xe</summary><div className="mt-3"><form action={checkInAppointmentFormAction}><input type="hidden" name="appointmentId" value={item.id} /><ReceptionFormFields /></form></div></details> : null}</li>)}</ul>}</CardContent></Card></div>;
}

function ReceptionFormFields() {
  return <div className="grid gap-4 sm:grid-cols-2"><label className="text-sm font-medium">Số km<input className="mt-1 h-8 w-full rounded-lg border border-input px-2" name="mileageKm" type="number" min="0" required /></label><label className="text-sm font-medium">Nhiên liệu (%)<input className="mt-1 h-8 w-full rounded-lg border border-input px-2" name="fuelLevel" type="number" min="0" max="100" /></label><label className="flex items-center gap-2 text-sm"><input name="exterior" type="checkbox" /> Đã kiểm tra ngoại thất</label><label className="flex items-center gap-2 text-sm"><input name="documents" type="checkbox" /> Đã nhận giấy tờ</label><div className="sm:col-span-2"><Button type="submit">Tạo lệnh sửa chữa</Button></div></div>;
}
