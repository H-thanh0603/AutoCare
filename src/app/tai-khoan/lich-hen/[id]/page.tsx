import { getPortalAppointment } from "@/data/portal";
import { requireUserPage } from "@/features/auth/guards";
import { appointmentStatusLabel } from "@/features/repair-orders/labels";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cancelPortalAppointmentAction, reschedulePortalAppointmentAction } from "@/features/appointments/actions";

export default async function PortalAppointmentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUserPage("/tai-khoan/lich-hen");
  const appointment = await getPortalAppointment(user.id, (await params).id);
  const canEdit = appointment.status === "PENDING" || appointment.status === "CONFIRMED";
  async function cancel(formData: FormData): Promise<void> { "use server"; await cancelPortalAppointmentAction(appointment.id, formData); }
  async function reschedule(formData: FormData): Promise<void> { "use server"; await reschedulePortalAppointmentAction(appointment.id, formData); }
  return <div className="mx-auto max-w-xl space-y-6"><div><h1 className="text-2xl font-semibold">Lịch hẹn</h1><p className="text-muted-foreground mt-1 text-sm">{appointment.scheduledAt.toLocaleString("vi-VN")}</p></div><Card><CardHeader><CardTitle className="flex items-center justify-between">Thông tin <Badge variant="secondary">{appointmentStatusLabel(appointment.status)}</Badge></CardTitle></CardHeader><CardContent className="space-y-3 text-sm"><p>{appointment.serviceRequest ?? "Chưa ghi nhu cầu"}</p><p className="text-muted-foreground">{appointment.note ?? "Không có ghi chú"}</p>{canEdit ? <div className="grid gap-4 border-t pt-4"><form action={reschedule} className="flex gap-2"><input className="h-8 min-w-0 flex-1 rounded-lg border border-input px-2" type="datetime-local" name="scheduledAt" required /><Button type="submit" variant="outline">Đổi lịch</Button></form><form action={cancel}><input type="hidden" name="reason" value="Khách hủy lịch" /><Button type="submit" variant="destructive">Hủy lịch</Button></form></div> : null}</CardContent></Card></div>;
}
