import { listPortalVehicles } from "@/data/portal";
import { AppointmentForm } from "@/features/appointments/appointment-form";
import { requireUserPage } from "@/features/auth/guards";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default async function NewAppointmentPage() {
  const user = await requireUserPage("/tai-khoan/lich-hen/moi");
  const vehicles = await listPortalVehicles(user.id);
  return <div className="mx-auto max-w-xl space-y-6"><div><h1 className="text-2xl font-semibold">Đặt lịch hẹn</h1><p className="text-muted-foreground mt-1 text-sm">Chọn xe và thời gian nằm trong giờ làm việc của gara.</p></div><Card><CardHeader><CardTitle>Thông tin lịch hẹn</CardTitle><CardDescription>Gara xác nhận trước khi tiếp nhận xe.</CardDescription></CardHeader><CardContent>{vehicles.length ? <AppointmentForm vehicles={vehicles} /> : <p className="text-muted-foreground text-sm">Bạn chưa có xe đang sở hữu để đặt lịch.</p>}</CardContent></Card></div>;
}
