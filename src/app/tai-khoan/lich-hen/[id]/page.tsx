import { getPortalAppointment } from "@/data/portal";
import { requireUserPage } from "@/features/auth/guards";
import { appointmentStatusLabel } from "@/features/repair-orders/labels";
import { PortalAppointmentActions } from "@/features/appointments/portal-appointment-actions";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function PortalAppointmentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireUserPage("/tai-khoan/lich-hen");
  const appointment = await getPortalAppointment(user.id, (await params).id);
  const canEdit = appointment.status === "PENDING" || appointment.status === "CONFIRMED";

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Lịch hẹn</h1>
        <p className="text-muted-foreground mt-1 text-sm">{appointment.scheduledAt.toLocaleString("vi-VN")}</p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            Thông tin <Badge variant="secondary">{appointmentStatusLabel(appointment.status)}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 text-sm">
          <p>{appointment.serviceRequest ?? "Chưa ghi nhu cầu"}</p>
          <p className="text-muted-foreground">{appointment.note ?? "Không có ghi chú"}</p>
          {canEdit ? <PortalAppointmentActions appointmentId={appointment.id} /> : null}
        </CardContent>
      </Card>
    </div>
  );
}
